import { ipcMain } from 'electron'
import {
  listarVendas,
  buscarVendaPorId,
  criarVenda,
  atualizarStatusVenda,
  pagarParcela,
  registrarPagamentoParcial,
  resumoDashboard,
  type DadosNovaVenda,
  type StatusPagamento
} from '../db/queries/vendas'
import { obterBackupManager } from '../backup/BackupManager'

export function registrarHandlersVendas(): void {
  ipcMain.handle('vendas:listar', () => {
    try {
      return { success: true, data: listarVendas() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('vendas:buscarPorId', (_event, id: number) => {
    try {
      return { success: true, data: buscarVendaPorId(id) ?? null }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('vendas:criar', (_event, dados: DadosNovaVenda) => {
    try {
      const resultado = criarVenda(dados)
      obterBackupManager().marcarAlteracao()
      return { success: true, data: resultado }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('vendas:atualizarStatus', (_event, id: number, status: StatusPagamento) => {
    try {
      atualizarStatusVenda(id, status)
      obterBackupManager().marcarAlteracao()
      return { success: true, data: null }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('vendas:pagarParcela', (_event, parcelaId: number) => {
    try {
      pagarParcela(parcelaId)
      obterBackupManager().marcarAlteracao()
      return { success: true, data: null }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('vendas:registrarPagamentoParcial', (_event, id: number, valor: number) => {
    try {
      registrarPagamentoParcial(id, valor)
      obterBackupManager().marcarAlteracao()
      return { success: true, data: null }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('vendas:resumoDashboard', () => {
    try {
      return { success: true, data: resumoDashboard() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
