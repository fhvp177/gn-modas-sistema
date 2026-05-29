// Gera chaves de licença no MESMO formato que o app valida:
//   CLIENTE:AAAA-MM-DD:HMAC16
// Onde HMAC16 é HMAC-SHA256(`clienteId:expiracao`) com CHAVE_HMAC,
// truncado nos primeiros 16 chars hex, uppercase.
//
// Mantém compatibilidade total com electron/licenca.ts. Qualquer alteração
// aqui PRECISA refletir no app — e vice-versa.

export async function calcularHMAC(
  segredo: string,
  clienteId: string,
  expiracao: string
): Promise<string> {
  const enc = new TextEncoder()
  const chave = await crypto.subtle.importKey(
    'raw',
    enc.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const assinatura = await crypto.subtle.sign(
    'HMAC',
    chave,
    enc.encode(`${clienteId}:${expiracao}`)
  )
  const hex = Array.from(new Uint8Array(assinatura))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 16).toUpperCase()
}

// Soma dias à data atual (UTC) e devolve no formato AAAA-MM-DD.
export function calcularExpiracao(diasContratados: number, base = new Date()): string {
  const data = new Date(base.getTime() + diasContratados * 86_400_000)
  const ano = data.getUTCFullYear()
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(data.getUTCDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// Soma dias a uma data AAAA-MM-DD existente — usado em renovações pra estender
// a partir da validade atual, não da data de hoje (cliente que renova adiantado
// não perde os dias restantes).
export function somarDiasNaExpiracao(
  expiracaoAtual: string | undefined,
  diasContratados: number
): string {
  const hoje = new Date()
  const dataAtual = expiracaoAtual ? new Date(expiracaoAtual + 'T23:59:59Z') : hoje
  const base = dataAtual > hoje ? dataAtual : hoje
  return calcularExpiracao(diasContratados, base)
}

export async function gerarChaveLicenca(
  segredo: string,
  clienteId: string,
  expiracao: string
): Promise<string> {
  const hmac = await calcularHMAC(segredo, clienteId, expiracao)
  return `${clienteId}:${expiracao}:${hmac}`
}
