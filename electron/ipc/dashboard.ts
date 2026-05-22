import { ipcMain } from 'electron'
import { obterMetricasDashboard } from '../db/queries/dashboard'

export function registrarHandlersDashboard(): void {
  ipcMain.handle('dashboard:metricas', (_event, periodoDias: number) => {
    try {
      // Sanitiza: aceita só valores razoáveis para evitar consultas absurdas.
      const periodo = [7, 30, 90, 365].includes(periodoDias) ? periodoDias : 30
      return { success: true, data: obterMetricasDashboard(periodo) }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
