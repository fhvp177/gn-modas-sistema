import { obterBackupManager } from './BackupManager'

/**
 * Executa o backup pré-atualização.
 * Chamado diretamente pelo handler do evento 'before-quit-for-update'.
 */
export async function executarBackupPreUpdate(): Promise<void> {
  const resultado = await obterBackupManager().executarBackup('pre-update')
  if (resultado.sucesso) {
    console.log('[backup-pre-update] Backup concluído com sucesso.')
  } else {
    console.warn(`[backup-pre-update] Falha no backup: ${resultado.erro}`)
    // Falha não bloqueia a atualização — apenas registra o aviso.
    // O backup automático pré-restauração cobre o caso de rollback.
  }
}

/**
 * Registra o hook de backup no autoUpdater do electron-updater.
 *
 * ── Como ativar (Fase futura) ──────────────────────────────────────────────
 *
 *  1. Instalar: npm install electron-updater
 *
 *  2. Em electron/main.ts, dentro de app.whenReady().then(() => { ... }),
 *     após inicializarBackupManager(), adicionar:
 *
 *       import { autoUpdater } from 'electron-updater'
 *       import { registrarBackupPreUpdate } from './backup/BackupPreUpdate'
 *       registrarBackupPreUpdate(autoUpdater)
 *
 * ──────────────────────────────────────────────────────────────────────────
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registrarBackupPreUpdate(autoUpdater: any): void {
  autoUpdater.on('before-quit-for-update', async () => {
    console.log('[backup-pre-update] Evento before-quit-for-update recebido. Iniciando backup...')
    await executarBackupPreUpdate()
  })

  console.log('[backup-pre-update] Hook registrado no autoUpdater.')
}
