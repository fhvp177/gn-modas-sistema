// Tipos da API exposta pelo preload via contextBridge
// Mantido em sync com electron/preload.ts

type RespostaIPC<T = unknown> = { success: true; data: T } | { success: false; error: string }

type StatusLicenca = {
  valida: boolean
  diasRestantes?: number
  mensagem: string
  clienteId?: string
}

interface Window {
  api: {
    produtos: {
      listar: () => Promise<RespostaIPC>
      criar: (dados: unknown) => Promise<RespostaIPC>
      atualizar: (id: number, dados: unknown) => Promise<RespostaIPC>
      deletar: (id: number) => Promise<RespostaIPC>
      buscarPorCodigoBarras: (codigo: string) => Promise<RespostaIPC>
    }
    clientes: {
      listar: () => Promise<RespostaIPC>
      criar: (dados: unknown) => Promise<RespostaIPC>
      atualizar: (id: number, dados: unknown) => Promise<RespostaIPC>
      deletar: (id: number) => Promise<RespostaIPC>
      listarInadimplentes: () => Promise<RespostaIPC>
      listarVencendoHoje: () => Promise<RespostaIPC>
    }
    fornecedores: {
      listar: () => Promise<RespostaIPC>
      criar: (dados: unknown) => Promise<RespostaIPC>
      atualizar: (id: number, dados: unknown) => Promise<RespostaIPC>
      deletar: (id: number) => Promise<RespostaIPC>
    }
    vendas: {
      listar: () => Promise<RespostaIPC>
      criar: (dados: unknown) => Promise<RespostaIPC>
      atualizarStatus: (id: number, status: string) => Promise<RespostaIPC>
      buscarPorId: (id: number) => Promise<RespostaIPC>
      pagarParcela: (parcelaId: number) => Promise<RespostaIPC>
      registrarPagamentoParcial: (id: number, valor: number) => Promise<RespostaIPC>
      resumoDashboard: () => Promise<RespostaIPC>
    }
    licenca: {
      validar: () => Promise<RespostaIPC<StatusLicenca>>
      ativar: (chave: string) => Promise<RespostaIPC<StatusLicenca>>
    }
    impressao: {
      imprimir: (html: string) => Promise<RespostaIPC>
    }
    atualizacao: {
      obterInfo: () => Promise<RespostaIPC<{
        versaoAtual: string
        ultimaVerificacao: string | null
        ultimaMensagem: string | null
        versaoBaixada: string | null
      }>>
      verificar: () => Promise<RespostaIPC>
      instalar: () => Promise<RespostaIPC>
      onEvento: (cb: (evt: { tipo: string; dados?: unknown }) => void) => () => void
    }
    backup: {
      fazerManual: () => Promise<RespostaIPC>
      obterStatus: () => Promise<RespostaIPC>
      gravarConfig: (chave: string, valor: string) => Promise<RespostaIPC>
      selecionarPasta: () => Promise<RespostaIPC>
      verificarSenha: (senha: string) => Promise<RespostaIPC>
      listarBackups: () => Promise<RespostaIPC>
      restaurar: (caminhoZip: string) => Promise<RespostaIPC>
      onNotificacao: (cb: (data: { tipo: string; sucesso: boolean }) => void) => () => void
      onCarregando: (cb: (visivel: boolean) => void) => () => void
    }
  }
}
