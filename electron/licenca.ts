/**
 * Módulo de licença — validação 100% offline via HMAC-SHA256 + arquivo AES.
 *
 * Formato da chave entregue ao lojista:  CLIENTE:AAAA-MM-DD:HMAC16
 *   Exemplo: LOJA001:2026-06-30:A3F2B891C4D5E6F7
 *
 * O arquivo licenca.lic armazena a chave criptografada com AES-256-CBC
 * para dificultar inspeção manual.
 *
 * ATENÇÃO: as constantes CHAVE_HMAC e CHAVE_AES devem ser idênticas
 * às definidas em tools/gerar-licenca.ts.
 */
import { createHmac, createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const CHAVE_HMAC = 'SR-2024-hmac-varejo-k9x3mz'
const CHAVE_AES = 'SR-2024-aes-varejo-file-k7z1qp'
const SALT_AES = 'sistema-rt-2024-salt'

function derivarChaveAES(): Buffer {
  return scryptSync(CHAVE_AES, SALT_AES, 32)
}

function criptografar(texto: string): string {
  const chave = derivarChaveAES()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', chave, iv)
  const enc = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + enc.toString('hex')
}

function descriptografar(cifrado: string): string {
  const idx = cifrado.indexOf(':')
  if (idx === -1) throw new Error('Formato de arquivo inválido')
  const ivHex = cifrado.slice(0, idx)
  const encHex = cifrado.slice(idx + 1)
  const chave = derivarChaveAES()
  const decipher = createDecipheriv('aes-256-cbc', chave, Buffer.from(ivHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final()
  ]).toString('utf8')
}

export function calcularHMAC(clienteId: string, expiracao: string): string {
  return createHmac('sha256', CHAVE_HMAC)
    .update(`${clienteId}:${expiracao}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase()
}

export function caminhoLicenca(): string {
  return join(app.getPath('userData'), 'licenca.lic')
}

export type StatusLicenca = {
  valida: boolean
  diasRestantes?: number
  mensagem: string
  clienteId?: string
}

export function validarChave(chave: string): StatusLicenca {
  const partes = chave.trim().split(':')
  if (partes.length !== 3) {
    return { valida: false, mensagem: 'Formato inválido. Use: CLIENTE:AAAA-MM-DD:CODIGO' }
  }

  const [clienteId, expiracao, hmacFornecido] = partes

  if (hmacFornecido.toUpperCase() !== calcularHMAC(clienteId, expiracao)) {
    return { valida: false, mensagem: 'Chave de licença inválida ou adulterada.' }
  }

  const dataExp = new Date(expiracao + 'T23:59:59')
  if (isNaN(dataExp.getTime())) {
    return { valida: false, mensagem: 'Data de expiração inválida na chave.' }
  }

  if (dataExp < new Date()) {
    return {
      valida: false,
      mensagem: 'Licença expirada. Contate o suporte para renovação.',
      clienteId
    }
  }

  const diasRestantes = Math.ceil((dataExp.getTime() - Date.now()) / 86_400_000)
  return {
    valida: true,
    diasRestantes,
    mensagem: `Licença válida por mais ${diasRestantes} dia(s).`,
    clienteId
  }
}

export function validarLicenca(): StatusLicenca {
  const caminho = caminhoLicenca()

  if (!existsSync(caminho)) {
    return { valida: false, mensagem: 'Nenhuma licença encontrada. Insira sua chave de ativação.' }
  }

  try {
    const conteudo = readFileSync(caminho, 'utf8').trim()
    const chaveDecriptada = descriptografar(conteudo)
    return validarChave(chaveDecriptada)
  } catch {
    return { valida: false, mensagem: 'Arquivo de licença corrompido. Reinsira a chave.' }
  }
}

export function ativarLicenca(chave: string): StatusLicenca {
  const status = validarChave(chave)
  if (!status.valida) return status
  writeFileSync(caminhoLicenca(), criptografar(chave.trim()), 'utf8')
  return status
}
