import { ipcMain } from 'electron'
import {
  listarProdutos,
  buscarProdutoPorCodigoBarras,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  type DadosProduto
} from '../db/queries/produtos'
import { obterBackupManager } from '../backup/BackupManager'

export function registrarHandlersProdutos(): void {
  ipcMain.handle('produtos:listar', () => {
    try {
      return { success: true, data: listarProdutos() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('produtos:buscarPorCodigoBarras', (_event, codigo: string) => {
    try {
      const produto = buscarProdutoPorCodigoBarras(codigo)
      return { success: true, data: produto ?? null }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('produtos:criar', (_event, dados: DadosProduto) => {
    try {
      const resultado = criarProduto(dados)
      obterBackupManager().marcarAlteracao()
      return { success: true, data: resultado }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('produtos:atualizar', (_event, id: number, dados: DadosProduto) => {
    try {
      atualizarProduto(id, dados)
      obterBackupManager().marcarAlteracao()
      return { success: true, data: null }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('produtos:deletar', (_event, id: number) => {
    try {
      deletarProduto(id)
      obterBackupManager().marcarAlteracao()
      return { success: true, data: null }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
