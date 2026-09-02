const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY as string
const TOKEN_STORAGE_KEY = 'housekeeping.dropbox.tokens'
const PKCE_VERIFIER_KEY = 'housekeeping.dropbox.pkceVerifier'

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(digest)
}

function randomVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return base64UrlEncode(bytes)
}

function redirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

export function isConnected(): boolean {
  return readTokens() !== null
}

function readTokens(): StoredTokens | null {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredTokens
  } catch {
    return null
  }
}

function writeTokens(tokens: StoredTokens): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
}

export function disconnect(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export async function startLogin(): Promise<void> {
  const verifier = randomVerifier()
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
  const challenge = base64UrlEncode(await sha256(verifier))

  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri(),
    token_access_type: 'offline',
  })
  window.location.assign(`https://www.dropbox.com/oauth2/authorize?${params.toString()}`)
}

/** Da chiamare all'avvio dell'app: se l'URL contiene ?code=..., completa il login PKCE. */
export async function handleRedirectIfPresent(): Promise<boolean> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return false

  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  if (!verifier) throw new Error('Verifier PKCE mancante: riavviare il login Dropbox')

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: DROPBOX_APP_KEY,
    code_verifier: verifier,
    redirect_uri: redirectUri(),
  })
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Scambio token Dropbox fallito: ${res.status}`)
  const json = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number }

  writeTokens({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  })
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)

  url.searchParams.delete('code')
  url.searchParams.delete('state')
  window.history.replaceState({}, '', url.toString())
  return true
}

async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: DROPBOX_APP_KEY,
  })
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Refresh token Dropbox fallito: ${res.status}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  const tokens: StoredTokens = {
    accessToken: json.access_token,
    refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
  writeTokens(tokens)
  return tokens
}

const EXPIRY_SAFETY_MARGIN_MS = 60_000

/** Ritorna un access token valido, rinnovandolo automaticamente se in scadenza. */
export async function getValidAccessToken(): Promise<string> {
  const tokens = readTokens()
  if (!tokens) throw new Error('Dropbox non connesso')
  if (tokens.expiresAt - EXPIRY_SAFETY_MARGIN_MS > Date.now()) {
    return tokens.accessToken
  }
  const refreshed = await refreshAccessToken(tokens.refreshToken)
  return refreshed.accessToken
}
