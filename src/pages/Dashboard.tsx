import { FC, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock, TrendingUp, Users, Package, ShoppingBag } from 'lucide-react'
import DividasClienteDialog, {
  calcularDividasPorCliente,
  type VendaDivida
} from '@/components/DividasClienteDialog'

type Resumo = {
  vendas_hoje: number
  total_hoje: number
  total_clientes: number
  total_produtos: number
}

type ClienteInadimplente = {
  id: number
  nome: string
  telefone: string
  total_devido: number
  vencimento_mais_antigo: string
}

type ClienteVencendoHoje = {
  id: number
  nome: string
  telefone: string
  total: number
  data_vencimento: string
}

const fmt = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtData = (iso: string) => new Date(iso + 'T00:00').toLocaleDateString('pt-BR')

const Dashboard: FC = () => {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [inadimplentes, setInadimplentes] = useState<ClienteInadimplente[]>([])
  const [vencendoHoje, setVencendoHoje] = useState<ClienteVencendoHoje[]>([])
  const [vendas, setVendas] = useState<VendaDivida[]>([])
  const [clienteDividas, setClienteDividas] = useState<{ id: number; nome: string } | null>(null)

  useEffect(() => {
    Promise.all([
      window.api.vendas.resumoDashboard(),
      window.api.clientes.listarInadimplentes(),
      window.api.clientes.listarVencendoHoje(),
      window.api.vendas.listar()
    ]).then(([rResumo, rInadimp, rVencendo, rVendas]) => {
      if (rResumo.success) setResumo(rResumo.data as Resumo)
      if (rInadimp.success) setInadimplentes(rInadimp.data as ClienteInadimplente[])
      if (rVencendo.success) setVencendoHoje(rVencendo.data as ClienteVencendoHoje[])
      if (rVendas.success) setVendas(rVendas.data as VendaDivida[])
    })
  }, [])

  const dividasPorCliente = useMemo(() => calcularDividasPorCliente(vendas), [vendas])

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {/* ── Alertas de inadimplência (destaque no topo) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Inadimplentes */}
        <div className="border border-red-200 bg-red-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-700">
              Inadimplentes{' '}
              {inadimplentes.length > 0 && (
                <span className="bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
                  {inadimplentes.length}
                </span>
              )}
            </h3>
          </div>
          {inadimplentes.length === 0 ? (
            <p className="text-sm text-red-400">Nenhum cliente inadimplente.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {inadimplentes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClienteDividas({ id: c.id, nome: c.nome })}
                  className="w-full text-left bg-white rounded-lg px-3 py-2 border border-red-100 text-sm hover:bg-red-100/50 hover:border-red-200 transition-colors cursor-pointer"
                  title="Ver dívidas e parcelas em atraso"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-red-800">{c.nome}</p>
                      <p className="text-xs text-red-500">{c.telefone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-700">{fmt(c.total_devido)}</p>
                      <p className="text-xs text-red-400">desde {fmtData(c.vencimento_mais_antigo)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Vencem hoje */}
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-700">
              Vencem Hoje{' '}
              {vencendoHoje.length > 0 && (
                <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
                  {vencendoHoje.length}
                </span>
              )}
            </h3>
          </div>
          {vencendoHoje.length === 0 ? (
            <p className="text-sm text-amber-400">Nenhum vencimento para hoje.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {vencendoHoje.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-lg px-3 py-2 border border-amber-100 text-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-amber-800">{c.nome}</p>
                      <p className="text-xs text-amber-500">{c.telefone}</p>
                    </div>
                    <p className="font-bold text-amber-700">{fmt(c.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardResumo
          icone={<TrendingUp className="w-5 h-5 text-blue-600" />}
          titulo="Vendas Hoje"
          valor={resumo ? fmt(resumo.total_hoje) : '...'}
          subtitulo={resumo ? `${resumo.vendas_hoje} transação(ões)` : ''}
          corIcone="bg-blue-100"
        />
        <CardResumo
          icone={<Users className="w-5 h-5 text-purple-600" />}
          titulo="Clientes"
          valor={resumo ? String(resumo.total_clientes) : '...'}
          subtitulo="cadastrados"
          corIcone="bg-purple-100"
        />
        <CardResumo
          icone={<Package className="w-5 h-5 text-emerald-600" />}
          titulo="Produtos"
          valor={resumo ? String(resumo.total_produtos) : '...'}
          subtitulo="no catálogo"
          corIcone="bg-emerald-100"
        />
        <CardResumo
          icone={<ShoppingBag className="w-5 h-5 text-orange-600" />}
          titulo="Inadimplentes"
          valor={String(inadimplentes.length)}
          subtitulo="cliente(s)"
          corIcone="bg-orange-100"
        />
      </div>

      <DividasClienteDialog
        clienteNome={clienteDividas?.nome ?? null}
        vendas={clienteDividas ? dividasPorCliente.get(clienteDividas.id)?.vendas ?? [] : []}
        totalEmAberto={clienteDividas ? dividasPorCliente.get(clienteDividas.id)?.total ?? 0 : 0}
        onFechar={() => setClienteDividas(null)}
      />
    </div>
  )
}

type CardResumoProps = {
  icone: React.ReactNode
  titulo: string
  valor: string
  subtitulo: string
  corIcone: string
}

const CardResumo: FC<CardResumoProps> = ({ icone, titulo, valor, subtitulo, corIcone }) => (
  <div className="border rounded-xl p-4 bg-card">
    <div className={`w-10 h-10 rounded-lg ${corIcone} flex items-center justify-center mb-3`}>
      {icone}
    </div>
    <p className="text-sm text-muted-foreground">{titulo}</p>
    <p className="text-2xl font-bold mt-0.5">{valor}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
  </div>
)

export default Dashboard
