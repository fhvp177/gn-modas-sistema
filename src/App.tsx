import { createContext, FC, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { MemoryRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  Lock,
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  Tags,
  Settings,
  DatabaseBackup,
  MessageCircle,
  QrCode,
  LucideIcon
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Fornecedores from './pages/Fornecedores'
import Produtos from './pages/Produtos'
import Clientes from './pages/Clientes'
import Vendas from './pages/Vendas'
import EtiquetasA4 from './pages/EtiquetasA4'
import Configuracoes from './pages/Configuracoes'
import TelaRestauracao from './pages/TelaRestauracao'
import LicencaBloqueada from './pages/LicencaBloqueada'
import LoginSistema from './pages/LoginSistema'
import IndicadorBackupAtivo from './components/backup/IndicadorBackupAtivo'
import AlertaBackupFalhando from './components/backup/AlertaBackupFalhando'
import DialogoBackupAoFechar from './components/backup/DialogoBackupAoFechar'
import ModalAtualizacaoDisponivel from './components/ModalAtualizacaoDisponivel'
import ModalPagamentoPix from './components/ModalPagamentoPix'
import { ToastProvider, useToast } from './components/ui/toast'
import { useAutoLock } from './hooks/useAutoLock'

type EstadoLicenca = 'verificando' | 'valida' | 'invalida'
type EstadoAuth = 'verificando' | 'cadastro' | 'bloqueado' | 'desbloqueado'

// Permite que a tela do PDV oculte a barra lateral enquanto está ativa,
// liberando a tela inteira para a operação de venda.
type PdvModeCtx = { ativo: boolean; setAtivo: (v: boolean) => void }
const PdvModeContext = createContext<PdvModeCtx>({ ativo: false, setAtivo: () => {} })
export const usePdvMode = () => useContext(PdvModeContext)

// Expõe a função "bloquear agora" para qualquer página acessar
// (Configurações usa para deslogar o usuário após mudar o PIN).
type LockCtx = { bloquear: () => void; autoLockMinutos: number; setAutoLockMinutos: (m: number) => void }
const LockContext = createContext<LockCtx>({ bloquear: () => {}, autoLockMinutos: 15, setAutoLockMinutos: () => {} })
export const useLock = () => useContext(LockContext)

// MemoryRouter é necessário no Electron: não existe servidor HTTP nem hash routing
const App: FC = () => {
  const [estadoLicenca, setEstadoLicenca] = useState<EstadoLicenca>('verificando')
  const [mensagemLicenca, setMensagemLicenca] = useState('')
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)
  const [avisoLicenca, setAvisoLicenca] = useState<string | null>(null)
  const [pdvAtivo, setPdvAtivo] = useState(false)
  const [estadoAuth, setEstadoAuth] = useState<EstadoAuth>('verificando')
  const [autoLockMinutos, setAutoLockMinutos] = useState(15)
  const [mostrarPagamento, setMostrarPagamento] = useState(false)

  const validarLicenca = useCallback(async (): Promise<void> => {
    const resp = await window.api.licenca.validar()
    if (resp.success) {
      const status = resp.data
      setMensagemLicenca(status.mensagem)
      setEstadoLicenca(status.valida ? 'valida' : 'invalida')
      setDiasRestantes(
        status.valida && status.diasRestantes !== undefined ? status.diasRestantes : null
      )
      if (status.valida && status.aviso) setAvisoLicenca(status.aviso)
    } else {
      setMensagemLicenca(resp.error)
      setEstadoLicenca('invalida')
    }
  }, [])

  useEffect(() => {
    validarLicenca()
  }, [validarLicenca])

  const abrirPagamento = useCallback(() => setMostrarPagamento(true), [])
  const fecharPagamento = useCallback(() => setMostrarPagamento(false), [])
  const aoRenovar = useCallback(async () => {
    await validarLicenca()
  }, [validarLicenca])

  // Verifica status do PIN apenas depois da licença passar
  useEffect(() => {
    if (estadoLicenca !== 'valida') return
    window.api.auth.obterStatus().then((resp) => {
      if (!resp.success) {
        // Falha grave: se nem o status carrega, melhor não travar o usuário
        setEstadoAuth('desbloqueado')
        return
      }
      const { pinConfigurado, precisaValidarHoje, autoLockMinutos: m } = resp.data
      setAutoLockMinutos(m)
      if (!pinConfigurado) setEstadoAuth('cadastro')
      else if (precisaValidarHoje) setEstadoAuth('bloqueado')
      else setEstadoAuth('desbloqueado')
    })
  }, [estadoLicenca])

  const bloquear = useCallback(() => {
    setEstadoAuth((prev) => (prev === 'desbloqueado' ? 'bloqueado' : prev))
  }, [])

  // Atalho global Ctrl+L bloqueia o sistema imediatamente
  useEffect(() => {
    if (estadoAuth !== 'desbloqueado') return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        bloquear()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [estadoAuth, bloquear])

  // Auto-lock por inatividade — só roda quando desbloqueado e tempo > 0
  useAutoLock(estadoAuth === 'desbloqueado' ? autoLockMinutos : 0, bloquear)

  if (estadoLicenca === 'verificando') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Verificando licença...</p>
      </div>
    )
  }

  if (estadoLicenca === 'invalida') {
    return (
      <>
        <LicencaBloqueada
          mensagemInicial={mensagemLicenca}
          onAtivar={(dias) => { setEstadoLicenca('valida'); if (dias !== undefined) setDiasRestantes(dias) }}
          onRenovarComPix={abrirPagamento}
        />
        <ModalPagamentoPix
          aberto={mostrarPagamento}
          onClose={fecharPagamento}
          onLicencaRenovada={aoRenovar}
        />
      </>
    )
  }

  if (estadoAuth === 'verificando') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Verificando acesso...</p>
      </div>
    )
  }

  return (
    <ToastProvider>
      <ToastInicial aviso={avisoLicenca} onMostrado={() => setAvisoLicenca(null)} />
      <LockContext.Provider value={{ bloquear, autoLockMinutos, setAutoLockMinutos }}>
        <PdvModeContext.Provider value={{ ativo: pdvAtivo, setAtivo: setPdvAtivo }}>
          <MemoryRouter>
            <div className="flex h-screen bg-background">
              {!pdvAtivo && (
                <Sidebar
                  diasRestantes={diasRestantes}
                  onBloquear={bloquear}
                  onRenovarComPix={abrirPagamento}
                />
              )}
              <div className="flex-1 flex flex-col overflow-hidden">
                {!pdvAtivo && <AlertaBackupFalhando />}
                <main className="flex-1 overflow-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/fornecedores" element={<Fornecedores />} />
                    <Route path="/produtos" element={<Produtos />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/vendas" element={<Vendas />} />
                    <Route path="/etiquetas" element={<EtiquetasA4 />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/restauracao" element={<TelaRestauracao />} />
                  </Routes>
                </main>
              </div>
            </div>
            <IndicadorBackupAtivo />
            <DialogoBackupAoFechar />
            <ModalAtualizacaoDisponivel />
            <ModalPagamentoPix
              aberto={mostrarPagamento}
              onClose={fecharPagamento}
              onLicencaRenovada={aoRenovar}
            />
          </MemoryRouter>
        </PdvModeContext.Provider>
      </LockContext.Provider>
      {(estadoAuth === 'bloqueado' || estadoAuth === 'cadastro') && (
        <LoginSistema
          modoCadastro={estadoAuth === 'cadastro'}
          onDesbloquear={() => setEstadoAuth('desbloqueado')}
        />
      )}
    </ToastProvider>
  )
}

// Exibe um toast assim que `aviso` muda para uma string. Precisa viver dentro do
// ToastProvider, por isso é um componente filho separado. O ref garante que o
// mesmo aviso não dispare dois toasts — necessário por causa do double-invoke
// de useEffect no React.StrictMode em dev.
const ToastInicial: FC<{ aviso: string | null; onMostrado: () => void }> = ({
  aviso,
  onMostrado
}) => {
  const { showToast } = useToast()
  const ultimoMostrado = useRef<string | null>(null)
  useEffect(() => {
    if (aviso && ultimoMostrado.current !== aviso) {
      ultimoMostrado.current = aviso
      showToast({ message: aviso, variant: 'destructive', durationMs: 15000 })
      onMostrado()
    }
  }, [aviso, showToast, onMostrado])
  return null
}

const CATEGORIAS_SIDEBAR: {
  titulo: string
  itens: { to: string; label: string; icon: LucideIcon }[]
}[] = [
  {
    titulo: 'Visão geral',
    itens: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    titulo: 'Cadastros',
    itens: [
      { to: '/produtos', label: 'Produtos', icon: Package },
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/fornecedores', label: 'Fornecedores', icon: Truck }
    ]
  },
  {
    titulo: 'Operação',
    itens: [
      { to: '/vendas', label: 'Vendas', icon: ShoppingCart },
      { to: '/etiquetas', label: 'Etiquetas A4', icon: Tags }
    ]
  },
  {
    titulo: 'Sistema',
    itens: [
      { to: '/configuracoes', label: 'Configurações', icon: Settings },
      { to: '/restauracao', label: 'Restauração', icon: DatabaseBackup }
    ]
  }
]

const URL_SUPORTE_WHATSAPP = `https://wa.me/5585921871975?text=${encodeURIComponent(
  `Olá, sou usuário do Sistema GN Modas (versão ${__APP_VERSION__}) e preciso de suporte.`
)}`

const Sidebar: FC<{
  diasRestantes: number | null
  onBloquear: () => void
  onRenovarComPix: () => void
}> = ({ diasRestantes, onBloquear, onRenovarComPix }) => (
  <nav className="w-56 bg-slate-900 text-white flex flex-col p-4 shrink-0">
    <div className="mb-6">
      <h1 className="text-lg font-bold text-white">GN Modas</h1>
      <p className="text-xs text-slate-400">Sistema de Gestão de Varejo</p>
    </div>

    <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-4">
      {CATEGORIAS_SIDEBAR.map((cat) => (
        <div key={cat.titulo}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-1">
            {cat.titulo}
          </p>
          <div className="flex flex-col gap-1">
            {cat.itens.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
      {diasRestantes !== null && diasRestantes <= 3 && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-2.5">
          <p className="text-amber-400 text-xs font-semibold">
            ⚠ Licença vence em {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}
          </p>
          <p className="text-amber-500/70 text-xs mt-1 leading-tight">
            Renove para evitar o bloqueio. Em caso de dúvidas, contate o suporte:
            {' '}
            <span className="font-semibold text-amber-300 whitespace-nowrap">(85) 9.2187-1975</span>
          </p>
        </div>
      )}
      {diasRestantes !== null && diasRestantes <= 7 && (
        <button
          onClick={onRenovarComPix}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors"
        >
          <QrCode className="w-4 h-4" />
          Renovar com PIX
        </button>
      )}
      <a
        href={URL_SUPORTE_WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        title="Falar com o suporte no WhatsApp"
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        Suporte
      </a>
      <button
        onClick={onBloquear}
        title="Bloquear sistema (Ctrl+L)"
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700 hover:text-white transition-colors"
      >
        <Lock className="w-4 h-4" />
        Bloquear
      </button>
    </div>
  </nav>
)

const Placeholder: FC<{ titulo: string; etapa: number }> = ({ titulo, etapa }) => (
  <div className="p-8 flex items-center justify-center h-full">
    <div className="text-center text-muted-foreground">
      <p className="text-2xl font-semibold text-foreground mb-2">{titulo}</p>
      <p>Será implementado na etapa {etapa}.</p>
    </div>
  </div>
)

export default App
