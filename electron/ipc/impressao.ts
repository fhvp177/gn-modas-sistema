import { ipcMain, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

type RespostaIPC<T = unknown> = { success: true; data: T } | { success: false; error: string }

export function registrarHandlersImpressao(): void {
  ipcMain.handle('impressao:imprimir', async (_event, html: string): Promise<RespostaIPC> => {
    try {
      const tmpPath = join(tmpdir(), `relatorio-estoque-${Date.now()}.html`)
      writeFileSync(tmpPath, html, 'utf-8')

      const janela = new BrowserWindow({
        show: false,
        autoHideMenuBar: true,
        webPreferences: { sandbox: false }
      })

      await janela.loadFile(tmpPath)

      await new Promise<void>((resolve) => {
        janela.webContents.print({ silent: false, printBackground: false }, () => {
          janela.close()
          resolve()
        })
      })

      return { success: true, data: null }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
