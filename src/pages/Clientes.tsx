import { FC, useEffect, useMemo, useState } from 'react'
import { IMaskInput } from 'react-imask'
import { Pencil, Trash2, Plus, Search, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import Paginacao from '@/components/ui/paginacao'
import DividasClienteDialog, {
  calcularDividasPorCliente,
  type VendaDivida
} from '@/components/DividasClienteDialog'

const ITENS_POR_PAGINA = 20

type Cliente = {
  id: number
  nome: string
  telefone: string
  endereco: string | null
  cpf: string | null
  data_nascimento: string | null
  data_cadastro: string
}

const fmtMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type FormCliente = {
  nome: string
  telefone: string
  endereco: string
  cpf: string
  data_nascimento: string // DD/MM/YYYY no form, YYYY-MM-DD no banco
}

const FORM_VAZIO: FormCliente = { nome: '', telefone: '', endereco: '', cpf: '', data_nascimento: '' }

// YYYY-MM-DD → DD/MM/YYYY
const paraBr = (iso: string | null): string => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// DD/MM/YYYY → YYYY-MM-DD (retorna null se incompleto)
const paraIso = (br: string): string | null => {
  if (br.length < 10) return null
  const [d, m, y] = br.split('/')
  return `${y}-${m}-${d}`
}

const validarCPF = (cpf: string): boolean => {
  const n = cpf.replace(/\D/g, '')
  if (n.length !== 11) return false
  if (/^(\d)\1+$/.test(n)) return false // todos os dígitos iguais (ex: 111.111.111-11)
  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(n[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto >= 10) resto = 0
  if (resto !== parseInt(n[9])) return false
  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(n[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto >= 10) resto = 0
  return resto === parseInt(n[10])
}

const validarDataBr = (ddmmyyyy: string): boolean => {
  if (ddmmyyyy.length < 10) return false
  const [dd, mm, yyyy] = ddmmyyyy.split('/')
  const d = parseInt(dd), m = parseInt(mm) - 1, y = parseInt(yyyy)
  if (y < 1900 || y > new Date().getFullYear()) return false
  const dt = new Date(y, m, d)
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d
}

const Clientes: FC = () => {
  const [lista, setLista] = useState<Cliente[]>([])
  const [vendas, setVendas] = useState<VendaDivida[]>([])
  const [busca, setBusca] = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState<FormCliente>(FORM_VAZIO)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [clienteDividas, setClienteDividas] = useState<Cliente | null>(null)
  const [paginaAtual, setPaginaAtual] = useState(1)

  const carregarClientes = async () => {
    const resp = await window.api.clientes.listar()
    if (resp.success) setLista(resp.data as Cliente[])
  }

  const carregarVendas = async () => {
    const resp = await window.api.vendas.listar()
    if (resp.success) setVendas(resp.data as VendaDivida[])
  }

  useEffect(() => {
    carregarClientes()
    carregarVendas()
  }, [])

  // Agrupa as dívidas em aberto por cliente (qualquer venda não-paga com saldo restante > 0)
  const dividasPorCliente = useMemo(() => calcularDividasPorCliente(vendas), [vendas])

  const listaFiltrada = lista.filter((c) => {
    const t = busca.toLowerCase()
    return (
      c.nome.toLowerCase().includes(t) ||
      c.telefone.includes(t) ||
      (c.endereco ?? '').toLowerCase().includes(t) ||
      (c.cpf ?? '').includes(t)
    )
  })

  // Reseta para a primeira página quando o filtro muda
  useEffect(() => {
    setPaginaAtual(1)
  }, [busca])

  const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA
  const listaPaginada = listaFiltrada.slice(inicioPagina, inicioPagina + ITENS_POR_PAGINA)

  const abrirNovo = () => {
    setEditando(null)
    setForm(FORM_VAZIO)
    setErro('')
    setDialogAberto(true)
  }

  const abrirEdicao = (c: Cliente) => {
    setEditando(c)
    setForm({
      nome: c.nome,
      telefone: c.telefone,
      endereco: c.endereco ?? '',
      cpf: c.cpf ?? '',
      data_nascimento: paraBr(c.data_nascimento),
    })
    setErro('')
    setDialogAberto(true)
  }

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('O nome do cliente é obrigatório.'); return }

    if (!form.telefone.trim()) {
      setErro('O telefone é obrigatório.')
      return
    }
    if (form.telefone.replace(/\D/g, '').length !== 11) {
      setErro('Telefone incompleto. Preencha o número completo no formato (00) 9.0000-0000.')
      return
    }

    if (form.cpf) {
      if (form.cpf.replace(/\D/g, '').length !== 11) {
        setErro('CPF incompleto. Preencha todos os 11 dígitos.')
        return
      }
      if (!validarCPF(form.cpf)) {
        setErro('CPF inválido. Verifique os números digitados.')
        return
      }
    }

    if (form.data_nascimento) {
      if (form.data_nascimento.length < 10) {
        setErro('Data de nascimento incompleta. Use o formato DD/MM/AAAA.')
        return
      }
      if (!validarDataBr(form.data_nascimento)) {
        setErro('Data de nascimento inválida. Verifique se o dia, mês e ano existem.')
        return
      }
    }

    setCarregando(true)
    setErro('')

    const dados = {
      nome: form.nome.trim(),
      telefone: form.telefone,
      endereco: form.endereco.trim() || null,
      cpf: form.cpf || null,
      data_nascimento: paraIso(form.data_nascimento),
    }

    const resp = editando
      ? await window.api.clientes.atualizar(editando.id, dados)
      : await window.api.clientes.criar(dados)

    if (resp.success) {
      await carregarClientes()
      setDialogAberto(false)
    } else {
      setErro(resp.error)
    }
    setCarregando(false)
  }

  const excluir = async (id: number, nome: string) => {
    if (!confirm(`Excluir cliente "${nome}"? As vendas associadas serão mantidas.`)) return
    const resp = await window.api.clientes.deletar(id)
    if (resp.success) await carregarClientes()
    else alert(`Erro: ${resp.error}`)
  }

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Clientes</h2>
        <Button onClick={abrirNovo}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone, endereço..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">CPF</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Endereço</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
              <th className="w-32 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  {busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
                </td>
              </tr>
            )}
            {listaPaginada.map((c, i) => (
              <tr key={c.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <td className="px-4 py-3 font-medium">{c.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.cpf || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.telefone}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.endereco || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatarData(c.data_cadastro)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    {dividasPorCliente.has(c.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-amber-600 hover:text-amber-700"
                        onClick={() => setClienteDividas(c)}
                        title={`Ver dívidas — ${fmtMoeda(dividasPorCliente.get(c.id)!.total)} em aberto`}
                      >
                        <Wallet className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => excluir(c.id, c.nome)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao
        paginaAtual={paginaAtual}
        totalItens={listaFiltrada.length}
        itensPorPagina={ITENS_POR_PAGINA}
        onMudarPagina={setPaginaAtual}
        rotuloItem="cliente(s)"
      />

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nome">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo do cliente"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="telefone">
                Telefone <span className="text-destructive">*</span>
              </Label>
              <IMaskInput
                id="telefone"
                mask="(00) 0.0000-0000"
                value={form.telefone}
                onAccept={(valor: string) => setForm((f) => ({ ...f, telefone: valor }))}
                placeholder="(00) 9.0000-0000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cpf">CPF (opcional)</Label>
                <IMaskInput
                  id="cpf"
                  mask="000.000.000-00"
                  value={form.cpf}
                  onAccept={(valor: string) => setForm((f) => ({ ...f, cpf: valor }))}
                  placeholder="000.000.000-00"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="data_nascimento">Data de Nascimento (opcional)</Label>
                <IMaskInput
                  id="data_nascimento"
                  mask="00/00/0000"
                  value={form.data_nascimento}
                  onAccept={(valor: string) => setForm((f) => ({ ...f, data_nascimento: valor }))}
                  placeholder="DD/MM/AAAA"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="endereco">Endereço (opcional)</Label>
              <Input
                id="endereco"
                value={form.endereco}
                onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            {erro && (
              <p className="text-destructive text-sm bg-destructive/10 rounded px-3 py-2">{erro}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={carregando}>
              {carregando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DividasClienteDialog
        clienteNome={clienteDividas?.nome ?? null}
        vendas={clienteDividas ? dividasPorCliente.get(clienteDividas.id)?.vendas ?? [] : []}
        totalEmAberto={clienteDividas ? dividasPorCliente.get(clienteDividas.id)?.total ?? 0 : 0}
        onFechar={() => setClienteDividas(null)}
      />
    </div>
  )
}

export default Clientes
