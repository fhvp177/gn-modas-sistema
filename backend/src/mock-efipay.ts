// Mock do EfiPay enquanto a conta real ainda não está habilitada.
// Mantém o MESMO formato de retorno que a integração final terá, pra que
// substituir esse arquivo por chamadas reais seja só plug-and-play.
//
// Quando o EfiPay entrar:
//   - trocar criarCobrancaPIX por uma chamada à API /v2/cob
//   - manter o tipo de retorno idêntico
//   - o resto do código (endpoints, KV, geração de licença) não muda nada.

export type CobrancaPIX = {
  txid: string
  qrcode: string // payload "copia e cola"
  qrcodeBase64: string // imagem QR em data URL ou base64 puro
  expiraEm: string // ISO
}

// Gera um txid pseudo-aleatório de 32 chars (compatível com regex do EfiPay).
function gerarTxid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < 32; i++) out += chars[bytes[i] % chars.length]
  return out
}

// QR placeholder com payload "FAKE-PIX:<txid>:<valor>". O frontend pode
// renderizar como QR code real (qualquer encoder), só não é pagável.
export async function criarCobrancaPIX(
  valorCentavos: number,
  diasExpiracao = 1
): Promise<CobrancaPIX> {
  const txid = gerarTxid()
  const payload = `FAKE-PIX:${txid}:${valorCentavos}`

  // Base64 da string crua — é só pra mostrar algo na UI; substituído depois
  // pelo QR real do EfiPay (que vem como imagem PNG base64).
  const qrcodeBase64 = btoa(payload)

  const expiraEm = new Date(Date.now() + diasExpiracao * 86_400_000).toISOString()

  return { txid, qrcode: payload, qrcodeBase64, expiraEm }
}
