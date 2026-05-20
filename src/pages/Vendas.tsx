import { FC, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Plus, Eye, CheckCircle, Search, Trash2, ShoppingCart, UserPlus, Printer } from 'lucide-react'
import { IMaskInput } from 'react-imask'
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
import { gerarHtmlCupomVenda } from '@/utils/cupomVenda'

const ITENS_POR_PAGINA = 20

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusPagamento = 'pago' | 'pendente' | 'inadimplente' | 'parcelado'

type Parcela = {
  id: number
  venda_id: number
  numero: number
  valor: number
  data_vencimento: string
  status: 'pendente' | 'pago' | 'inadimplente'
}

type Venda = {
  id: number
  cliente_id: number | null
  data: string
  total: number
  valor_pago: number
  status_pagamento: StatusPagamento
  data_vencimento: string | null
  num_parcelas: number | null
  valor_inadimplente: number
  cliente_nome?: string | null
  cliente_telefone?: string | null
  cliente_endereco?: string | null
  cliente_cpf?: string | null
}

type ItemVenda = {
  produto_id: number
  quantidade: number
  preco_unitario: number
  produto_nome?: string
  codigo_barras?: string
}

type VendaDetalhada = Venda & { itens: ItemVenda[]; parcelas: Parcela[] }

type ItemCarrinho = {
  produto_id: number
  codigo_barras: string
  nome: string
  preco_unitario: number
  quantidade: number
  estoque_disponivel: number
}

type Produto = {
  id: number
  codigo_barras: string
  nome: string
  preco: number
  estoque: number
}

type Cliente = { id: number; nome: string; telefone: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CORES_STATUS: Record<StatusPagamento, string> = {
  pago: 'bg-green-100 text-green-700 border border-green-200',
  pendente: 'bg-amber-100 text-amber-700 border border-amber-200',
  inadimplente: 'bg-red-100 text-red-700 border border-red-200',
  parcelado: 'bg-blue-100 text-blue-700 border border-blue-200'
}

const LABEL_STATUS: Record<StatusPagamento, string> = {
  pago: 'Pago',
  pendente: 'Venda a prazo',
  inadimplente: 'Inadimplente',
  parcelado: 'Parcelado'
}

const CORES_PARCELA: Record<string, string> = {
  pago: 'bg-green-100 text-green-700',
  pendente: 'bg-amber-100 text-amber-700',
  inadimplente: 'bg-red-100 text-red-700'
}

const badgeVenda = (v: Venda): string => {
  if (v.num_parcelas) {
    if (v.status_pagamento === 'parcelado') return `Parcelado (${v.num_parcelas}x)`
    if (v.status_pagamento === 'pago') return `Pago (${v.num_parcelas}x)`
  }
  return LABEL_STATUS[v.status_pagamento]
}

const fmt = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtData = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

const fmtDataCurta = (iso: string) => new Date(iso + 'T00:00').toLocaleDateString('pt-BR')

// ─── Componente principal ─────────────────────────────────────────────────────

type View = 'historico' | 'pdv'

const Vendas: FC = () => {
  const [view, setView] = useState<View>('historico')
  return view === 'historico' ? (
    <HistoricoVendas onNova={() => setView('pdv')} />
  ) : (
    <PDV onSair={() => setView('historico')} />
  )
}

// ─── Histórico de Vendas ──────────────────────────────────────────────────────

const HistoricoVendas: FC<{ onNova: () => void }> = ({ onNova }) => {
  const [lista, setLista] = useState<Venda[]>([])
  const [filtroStatus, setFiltroStatus] = useState<StatusPagamento | 'todos'>('todos')
  const [vendaDetalhada, setVendaDetalhada] = useState<VendaDetalhada | null>(null)
  const [valorPagamento, setValorPagamento] = useState('')
  const [salvandoPagamento, setSalvandoPagamento] = useState(false)
  const [erroPagamento, setErroPagamento] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)

  const carregar = async () => {
    const resp = await window.api.vendas.listar()
    if (resp.success) setLista(resp.data as Venda[])
  }

  useEffect(() => { carregar() }, [])

  const listaFiltrada = filtroStatus === 'todos'
    ? lista
    : lista.filter((v) => v.status_pagamento === filtroStatus)

  useEffect(() => {
    setPaginaAtual(1)
  }, [filtroStatus])

  const inicioPagina = (paginaAtual - 1) * ITENS_POR_PAGINA
  const listaPaginada = listaFiltrada.slice(inicioPagina, inicioPagina + ITENS_POR_PAGINA)

  const verDetalhes = async (id: number) => {
    const resp = await window.api.vendas.buscarPorId(id)
    if (resp.success && resp.data) {
      const venda = resp.data as VendaDetalhada
      setVendaDetalhada(venda)
      const restante = +(venda.total - venda.valor_pago).toFixed(2)
      setValorPagamento(restante > 0 ? String(restante) : '')
      setErroPagamento('')
    }
  }

  const registrarPagamento = async (id: number) => {
    const valor = parseFloat(valorPagamento.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      setErroPagamento('Informe um valor válido maior que zero.')
      return
    }
    setSalvandoPagamento(true)
    setErroPagamento('')
    const resp = await window.api.vendas.registrarPagamentoParcial(id, valor)
    if (resp.success) {
      await verDetalhes(id)
      await carregar()
    } else {
      setErroPagamento(resp.error)
    }
    setSalvandoPagamento(false)
  }

  const marcarComoPago = async (id: number) => {
    await window.api.vendas.atualizarStatus(id, 'pago')
    await carregar()
  }

  const imprimirCupom = async (id: number) => {
    const resp = await window.api.vendas.buscarPorId(id)
    if (!resp.success || !resp.data) {
      alert('Não foi possível carregar os dados da venda.')
      return
    }
    const html = gerarHtmlCupomVenda(resp.data as VendaDetalhada)
    const r = await window.api.impressao.imprimir(html)
    if (!r.success) alert(`Erro ao imprimir: ${r.error}`)
  }

  const pagarParcela = async (parcelaId: number) => {
    await window.api.vendas.pagarParcela(parcelaId)
    if (vendaDetalhada) {
      const resp = await window.api.vendas.buscarPorId(vendaDetalhada.id)
      if (resp.success && resp.data) setVendaDetalhada(resp.data as VendaDetalhada)
    }
    await carregar()
  }

  const tabs: Array<{ key: StatusPagamento | 'todos'; label: string }> = [
    { key: 'todos', label: 'Todos' },
    { key: 'pago', label: 'Pagos' },
    { key: 'pendente', label: 'Pendentes' },
    { key: 'parcelado', label: 'Parcelados' },
    { key: 'inadimplente', label: 'Inadimplentes' }
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Vendas</h2>
        <Button onClick={onNova}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Venda (PDV)
        </Button>
      </div>

      {/* Filtro de status */}
      <div className="flex gap-1 mb-4 border-b">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltroStatus(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filtroStatus === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
              {key === 'todos'
                ? lista.length
                : lista.filter((v) => v.status_pagamento === key).length}
            </span>
          </button>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">#</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vencimento</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="w-32 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhuma venda encontrada.
                </td>
              </tr>
            )}
            {listaPaginada.map((v, i) => (
              <tr key={v.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{v.id}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtData(v.data)}</td>
                <td className="px-4 py-3 font-medium">{v.cliente_nome || 'Venda avulsa'}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {v.num_parcelas && v.status_pagamento === 'inadimplente' && v.valor_inadimplente > 0
                    ? (
                      <span title={`Total da venda: ${fmt(v.total)}`}>
                        {fmt(v.valor_inadimplente)}
                        <span className="text-xs text-muted-foreground ml-1 font-normal">em atraso</span>
                      </span>
                    )
                    : !v.num_parcelas && v.status_pagamento !== 'pago' && v.valor_pago > 0
                      ? (
                        <span title={`Total da venda: ${fmt(v.total)} — Pago: ${fmt(v.valor_pago)}`}>
                          {fmt(v.total - v.valor_pago)}
                          <span className="text-xs text-muted-foreground ml-1 font-normal">restante</span>
                        </span>
                      )
                      : fmt(v.total)}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {v.num_parcelas
                    ? `${v.num_parcelas}x — 1ª ${v.data_vencimento ? fmtDataCurta(v.data_vencimento) : '—'}`
                    : v.data_vencimento ? fmtDataCurta(v.data_vencimento) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${CORES_STATUS[v.status_pagamento]}`}>
                    {badgeVenda(v)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => verDetalhes(v.id)} title="Ver detalhes">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {v.status_pagamento !== 'pago' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => marcarComoPago(v.id)}
                        title="Marcar como pago"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => imprimirCupom(v.id)}
                      title="Imprimir cupom"
                    >
                      <Printer className="w-4 h-4" />
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
        rotuloItem="venda(s)"
      />

      {/* Dialog detalhes da venda */}
      <Dialog open={!!vendaDetalhada} onOpenChange={(open) => !open && setVendaDetalhada(null)}>
        {vendaDetalhada && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Venda #{vendaDetalhada.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Cliente: </span>
                  {vendaDetalhada.cliente_nome || 'Avulso'}
                </div>
                <div>
                  <span className="font-medium text-foreground">Data: </span>
                  {fmtData(vendaDetalhada.data)}
                </div>
                <div>
                  <span className="font-medium text-foreground">Status: </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CORES_STATUS[vendaDetalhada.status_pagamento]}`}>
                    {badgeVenda(vendaDetalhada)}
                  </span>
                </div>
                {vendaDetalhada.num_parcelas ? (
                  <div>
                    <span className="font-medium text-foreground">Parcelamento: </span>
                    {vendaDetalhada.num_parcelas}x de ≈ {fmt(vendaDetalhada.total / vendaDetalhada.num_parcelas)}
                  </div>
                ) : vendaDetalhada.data_vencimento ? (
                  <div>
                    <span className="font-medium text-foreground">Vencimento: </span>
                    {fmtDataCurta(vendaDetalhada.data_vencimento)}
                  </div>
                ) : null}
              </div>

              {/* Itens da venda */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Produto</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qtd</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unitário</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendaDetalhada.itens.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="px-3 py-2">{item.produto_nome}</td>
                        <td className="px-3 py-2 text-right">{item.quantidade}</td>
                        <td className="px-3 py-2 text-right">{fmt(item.preco_unitario)}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {fmt(item.quantidade * item.preco_unitario)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-semibold">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right">Total</td>
                      <td className="px-3 py-2 text-right">{fmt(vendaDetalhada.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagamento parcial — apenas para venda a prazo simples não quitada */}
              {vendaDetalhada.status_pagamento !== 'pago' && !vendaDetalhada.num_parcelas && (
                <div className="border rounded-lg p-3 space-y-2.5 bg-muted/20">
                  <p className="font-medium text-sm">Registrar Pagamento</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor total</span>
                    <span>{fmt(vendaDetalhada.total)}</span>
                  </div>
                  {vendaDetalhada.valor_pago > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Já pago</span>
                      <span className="text-green-600 font-medium">{fmt(vendaDetalhada.valor_pago)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Restante</span>
                    <span className="text-destructive">
                      {fmt(Math.max(0, vendaDetalhada.total - vendaDetalhada.valor_pago))}
                    </span>
                  </div>
                  {vendaDetalhada.valor_pago > 0 && (
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (vendaDetalhada.valor_pago / vendaDetalhada.total) * 100)}%` }}
                      />
                    </div>
                  )}
                  <div className="flex gap-2 pt-0.5">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={valorPagamento}
                      onChange={(e) => { setValorPagamento(e.target.value); setErroPagamento('') }}
                      placeholder="Valor recebido"
                      className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button
                      size="sm"
                      onClick={() => registrarPagamento(vendaDetalhada.id)}
                      disabled={salvandoPagamento}
                    >
                      {salvandoPagamento ? 'Salvando...' : 'Registrar'}
                    </Button>
                  </div>
                  {erroPagamento && (
                    <p className="text-destructive text-xs bg-destructive/10 rounded px-2 py-1.5">
                      {erroPagamento}
                    </p>
                  )}
                </div>
              )}

              {/* Parcelas — visível apenas para vendas parceladas */}
              {vendaDetalhada.parcelas.length > 0 && (
                <div>
                  <p className="font-medium mb-1.5">Parcelas</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground w-10">#</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vencimento</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Valor</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                          <th className="w-10 px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {vendaDetalhada.parcelas.map((p, i) => (
                          <tr key={p.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                            <td className="px-3 py-2 text-muted-foreground">{p.numero}</td>
                            <td className="px-3 py-2">{fmtDataCurta(p.data_vencimento)}</td>
                            <td className="px-3 py-2 text-right font-medium">{fmt(p.valor)}</td>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CORES_PARCELA[p.status]}`}>
                                {p.status === 'pago' ? 'Pago' : p.status === 'inadimplente' ? 'Atrasado' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {p.status !== 'pago' && (
                                <button
                                  onClick={() => pagarParcela(p.id)}
                                  title="Marcar parcela como paga"
                                  className="text-green-600 hover:text-green-700 transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

// ─── PDV (Ponto de Venda) ─────────────────────────────────────────────────────

const PDV: FC<{ onSair: () => void }> = ({ onSair }) => {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clienteId, setClienteId] = useState('')
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamento>('pago')
  const [dataVencimento, setDataVencimento] = useState('')
  const [numParcelas, setNumParcelas] = useState(2)
  const [codigoScan, setCodigoScan] = useState('')
  const [feedbackScan, setFeedbackScan] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const [buscaProdutos, setBuscaProdutos] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const scanRef = useRef<HTMLInputElement>(null)

  // Cadastro rápido de cliente
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  const [nomeClienteRapido, setNomeClienteRapido] = useState('')
  const [telefoneClienteRapido, setTelefoneClienteRapido] = useState('')
  const [erroCliente, setErroCliente] = useState('')
  const [salvandoCliente, setSalvandoCliente] = useState(false)

  useEffect(() => {
    Promise.all([window.api.clientes.listar(), window.api.produtos.listar()]).then(
      ([rClientes, rProdutos]) => {
        if (rClientes.success) setClientes(rClientes.data as Cliente[])
        if (rProdutos.success) setProdutos(rProdutos.data as Produto[])
      }
    )
    scanRef.current?.focus()
  }, [])

  const total = carrinho.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0)
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0)

  const adicionarProduto = (produto: Produto) => {
    if (produto.estoque <= 0) {
      setFeedbackScan({ tipo: 'erro', msg: `"${produto.nome}" está sem estoque.` })
      setTimeout(() => setFeedbackScan(null), 3000)
      return
    }
    const existente = carrinho.find((item) => item.produto_id === produto.id)
    if (existente && existente.quantidade >= produto.estoque) {
      setFeedbackScan({ tipo: 'erro', msg: `Limite de estoque atingido para "${produto.nome}" (máx ${produto.estoque}).` })
      setTimeout(() => setFeedbackScan(null), 3000)
      return
    }
    setCarrinho((prev) => {
      const ex = prev.find((item) => item.produto_id === produto.id)
      if (ex) {
        return prev.map((item) =>
          item.produto_id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          produto_id: produto.id,
          codigo_barras: produto.codigo_barras,
          nome: produto.nome,
          preco_unitario: produto.preco,
          quantidade: 1,
          estoque_disponivel: produto.estoque
        }
      ]
    })
    setFeedbackScan({ tipo: 'ok', msg: `✓ ${produto.nome}` })
    setTimeout(() => setFeedbackScan(null), 2000)
  }

  const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const codigo = codigoScan.trim()
    if (!codigo) return

    setCodigoScan('')
    const resp = await window.api.produtos.buscarPorCodigoBarras(codigo)

    if (resp.success && resp.data) {
      adicionarProduto(resp.data as Produto)
    } else {
      setFeedbackScan({ tipo: 'erro', msg: `Código "${codigo}" não encontrado.` })
      setTimeout(() => setFeedbackScan(null), 3000)
    }
    scanRef.current?.focus()
  }

  const atualizarQtd = (produtoId: number, qtd: number) => {
    if (qtd <= 0) {
      setCarrinho((prev) => prev.filter((item) => item.produto_id !== produtoId))
    } else {
      setCarrinho((prev) =>
        prev.map((item) => {
          if (item.produto_id !== produtoId) return item
          return { ...item, quantidade: Math.min(qtd, item.estoque_disponivel) }
        })
      )
    }
  }

  const atualizarPreco = (produtoId: number, preco: number) => {
    if (isNaN(preco) || preco < 0) return
    setCarrinho((prev) =>
      prev.map((item) =>
        item.produto_id === produtoId ? { ...item, preco_unitario: preco } : item
      )
    )
  }

  const finalizarVenda = async () => {
    if (carrinho.length === 0) { setErro('Adicione pelo menos um produto.'); return }
    if (statusPagamento !== 'pago' && !clienteId) {
      setErro('Selecione um cliente para vendas a prazo ou parceladas.')
      return
    }
    if (statusPagamento !== 'pago' && !dataVencimento) {
      setErro(
        statusPagamento === 'parcelado'
          ? 'Informe a data de vencimento da 1ª parcela.'
          : 'Informe a data de vencimento para pagamentos pendentes.'
      )
      return
    }
    if (statusPagamento === 'parcelado' && (numParcelas < 2 || numParcelas > 24)) {
      setErro('O número de parcelas deve ser entre 2 e 24.')
      return
    }

    setSalvando(true)
    setErro('')

    const dados = {
      cliente_id: clienteId ? parseInt(clienteId) : null,
      status_pagamento: statusPagamento,
      data_vencimento: dataVencimento || null,
      num_parcelas: statusPagamento === 'parcelado' ? numParcelas : null,
      itens: carrinho.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }))
    }

    const resp = await window.api.vendas.criar(dados)
    if (resp.success) {
      onSair()
    } else {
      setErro(resp.error)
      setSalvando(false)
    }
  }

  const abrirClienteRapido = () => {
    setNomeClienteRapido('')
    setTelefoneClienteRapido('')
    setErroCliente('')
    setModalClienteAberto(true)
  }

  const salvarClienteRapido = async () => {
    if (!nomeClienteRapido.trim()) { setErroCliente('O nome é obrigatório.'); return }
    if (telefoneClienteRapido.replace(/\D/g, '').length !== 11) {
      setErroCliente('Telefone incompleto. Preencha no formato (00) 9.0000-0000.')
      return
    }
    setSalvandoCliente(true)
    setErroCliente('')
    const resp = await window.api.clientes.criar({
      nome: nomeClienteRapido.trim(),
      telefone: telefoneClienteRapido,
      endereco: null,
      cpf: null,
      data_nascimento: null,
    })
    if (resp.success) {
      const novoCliente = resp.data as Cliente
      const rClientes = await window.api.clientes.listar()
      if (rClientes.success) setClientes(rClientes.data as Cliente[])
      setClienteId(String(novoCliente.id))
      setModalClienteAberto(false)
    } else {
      setErroCliente(resp.error)
    }
    setSalvandoCliente(false)
  }

  const produtosFiltrados = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      p.codigo_barras.includes(termoBusca)
  )

  return (
    <div className="flex h-full">
      {/* ── Painel esquerdo: scanner + carrinho ── */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onSair}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">Nova Venda — PDV</h2>
        </div>

        <div className="mb-3">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Leitor de código de barras (Enter para adicionar)
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={scanRef}
                value={codigoScan}
                onChange={(e) => setCodigoScan(e.target.value)}
                onKeyDown={handleScan}
                placeholder="Aponte o leitor ou digite o código de barras..."
                className="flex h-10 w-full rounded-md border-2 border-primary bg-background px-3 py-2 pl-9 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button variant="outline" onClick={() => { setBuscaProdutos(true); setTermoBusca('') }}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buscar produto
            </Button>
          </div>
          {feedbackScan && (
            <p className={`text-sm mt-1 font-medium ${feedbackScan.tipo === 'ok' ? 'text-green-600' : 'text-destructive'}`}>
              {feedbackScan.msg}
            </p>
          )}
        </div>

        {/* Carrinho */}
        <div className="flex-1 border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Produto</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground w-24">Qtd</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Unitário</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Subtotal</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {carrinho.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Carrinho vazio. Escaneie um produto para começar.
                  </td>
                </tr>
              )}
              {carrinho.map((item, i) => (
                <tr key={item.produto_id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-3 py-2 font-medium">
                    <div>{item.nome}</div>
                    <div className="text-xs text-muted-foreground font-mono">{item.codigo_barras}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min="1"
                      max={item.estoque_disponivel}
                      value={item.quantidade}
                      onChange={(e) => atualizarQtd(item.produto_id, parseInt(e.target.value) || 0)}
                      className="w-16 text-center border rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="text-xs text-muted-foreground mt-0.5">/ {item.estoque_disponivel}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.preco_unitario}
                      onChange={(e) => atualizarPreco(item.produto_id, parseFloat(e.target.value))}
                      className="w-24 text-right border rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {fmt(item.quantidade * item.preco_unitario)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => atualizarQtd(item.produto_id, 0)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Painel direito: resumo + pagamento ── */}
      <div className="w-96 border-l bg-muted/20 flex flex-col p-5 gap-4 shrink-0">
        {/* Cliente */}
        <div>
          <Label className="text-xs mb-1 block">
            Cliente
            {statusPagamento !== 'pago'
              ? <span className="text-destructive ml-0.5">*</span>
              : <span className="text-muted-foreground ml-1">(opcional)</span>
            }
          </Label>
          <div className="flex gap-2">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— Venda avulsa —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={abrirClienteRapido}
              title="Cadastrar novo cliente"
              className="shrink-0"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Resumo numérico */}
        <div className="border rounded-lg p-4 bg-background space-y-2 text-base">
          <div className="flex justify-between text-muted-foreground">
            <span>Produtos</span>
            <span>{carrinho.length} tipo(s)</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Unidades</span>
            <span>{totalItens}</span>
          </div>
          <div className="flex justify-between font-bold text-xl pt-2 border-t">
            <span>TOTAL</span>
            <span>{fmt(total)}</span>
          </div>
          {statusPagamento === 'parcelado' && total > 0 && numParcelas >= 2 && (
            <div className="flex justify-between text-sm text-blue-600 font-medium pt-0.5">
              <span>{numParcelas}x de</span>
              <span>≈ {fmt(total / numParcelas)}</span>
            </div>
          )}
        </div>

        {/* Forma de pagamento */}
        <div>
          <Label className="text-xs mb-2 block">Forma de pagamento</Label>
          <div className="space-y-1.5">
            {(['pago', 'pendente', 'parcelado'] as StatusPagamento[]).map((s) => (
              <label
                key={s}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                  statusPagamento === s
                    ? CORES_STATUS[s] + ' border-current font-medium'
                    : 'bg-background hover:bg-muted/30'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={statusPagamento === s}
                  onChange={() => setStatusPagamento(s)}
                  className="hidden"
                />
                <span
                  className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    statusPagamento === s ? 'bg-current border-current' : 'border-muted-foreground'
                  }`}
                />
                {LABEL_STATUS[s]}
              </label>
            ))}
          </div>
        </div>

        {/* Número de parcelas (apenas para parcelado) */}
        {statusPagamento === 'parcelado' && (
          <div>
            <Label htmlFor="num-parcelas" className="text-xs mb-1 block">
              Número de parcelas <span className="text-destructive">*</span>
            </Label>
            <input
              id="num-parcelas"
              type="number"
              min={2}
              max={24}
              value={numParcelas}
              onChange={(e) =>
                setNumParcelas(Math.max(2, Math.min(24, parseInt(e.target.value) || 2)))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        {/* Data de vencimento */}
        {statusPagamento !== 'pago' && (
          <div>
            <Label htmlFor="vencimento" className="text-xs mb-1 block">
              {statusPagamento === 'parcelado' ? '1ª parcela — vencimento' : 'Data de vencimento'}
              {' '}<span className="text-destructive">*</span>
            </Label>
            <Input
              id="vencimento"
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
            />
          </div>
        )}

        {erro && (
          <p className="text-destructive text-xs bg-destructive/10 rounded px-2 py-1.5">{erro}</p>
        )}

        <div className="mt-auto space-y-2">
          <Button
            className="w-full"
            onClick={finalizarVenda}
            disabled={salvando || carrinho.length === 0}
          >
            {salvando ? 'Registrando...' : `Finalizar — ${fmt(total)}`}
          </Button>
          <Button variant="outline" className="w-full" onClick={onSair}>
            Cancelar
          </Button>
        </div>
      </div>

      {/* ── Dialog: cadastro rápido de cliente ── */}
      <Dialog open={modalClienteAberto} onOpenChange={setModalClienteAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            O cliente será cadastrado e já ficará selecionado na venda.
            Dados adicionais podem ser completados depois em <strong>Clientes</strong>.
          </p>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="nome-cliente-rapido">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome-cliente-rapido"
                value={nomeClienteRapido}
                onChange={(e) => setNomeClienteRapido(e.target.value)}
                placeholder="Nome completo do cliente"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="telefone-cliente-rapido">
                Telefone <span className="text-destructive">*</span>
              </Label>
              <IMaskInput
                id="telefone-cliente-rapido"
                mask="(00) 0.0000-0000"
                value={telefoneClienteRapido}
                onAccept={(valor: string) => setTelefoneClienteRapido(valor)}
                placeholder="(00) 9.0000-0000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            {erroCliente && (
              <p className="text-destructive text-sm bg-destructive/10 rounded px-3 py-2">
                {erroCliente}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalClienteAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarClienteRapido} disabled={salvandoCliente}>
              {salvandoCliente ? 'Salvando...' : 'Cadastrar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: busca manual de produto ── */}
      <Dialog open={buscaProdutos} onOpenChange={setBuscaProdutos}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar Produto</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Nome ou código de barras..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            {produtosFiltrados.slice(0, 50).map((p, i) => (
              <button
                key={p.id}
                disabled={p.estoque === 0}
                onClick={() => {
                  adicionarProduto(p)
                  setBuscaProdutos(false)
                  scanRef.current?.focus()
                }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex justify-between items-center ${
                  i > 0 ? 'border-t' : ''
                } ${p.estoque === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'}`}
              >
                <div>
                  <div className="font-medium">{p.nome}</div>
                  <div className="text-xs text-muted-foreground font-mono">{p.codigo_barras}</div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-semibold">{fmt(p.preco)}</div>
                  <div className={`text-xs ${p.estoque === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {p.estoque} em estoque
                  </div>
                </div>
              </button>
            ))}
            {produtosFiltrados.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Nenhum produto encontrado.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Vendas
