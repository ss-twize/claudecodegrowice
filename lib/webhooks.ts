import { supabase, ORG_UID } from './supabase'

let urlCache: Record<string, string> | null = null

async function getUrl(code: string): Promise<string | null> {
  if (!urlCache) {
    const { data } = await supabase
      .from('webhooks')
      .select('action_code, url')
      .eq('org_uid', ORG_UID)
      .eq('enabled', true)
    urlCache = {}
    data?.forEach((r: any) => { urlCache![r.action_code] = r.url })
    setTimeout(() => { urlCache = null }, 30000) // cache for 30s
  }
  if (urlCache[code]) return urlCache[code]
  const envKey = `NEXT_PUBLIC_WEBHOOK_${code.toUpperCase().replace(/-/g, '_')}`
  return (process.env as any)[envKey] || null
}

async function log(code: string, params: any, status: string, error?: string, role?: string) {
  try {
    await supabase.from('action_log').insert({
      org_uid: ORG_UID, action_code: code, params, status, error_message: error, role,
    })
  } catch {}
}

export async function callWebhook(
  actionCode: string,
  params: Record<string, unknown> = {},
  role?: string
): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  const url = await getUrl(actionCode)
  if (!url) return { ok: false, configured: false }

  const payload = {
    org_uid: ORG_UID,
    action_code: actionCode,
    params,
    role,
    client_time: new Date().toISOString(),
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await log(actionCode, params, res.ok ? 'успех' : 'ошибка', undefined, role)
    return { ok: res.ok, configured: true }
  } catch (err: any) {
    await log(actionCode, params, 'ошибка', err.message, role)
    return { ok: false, configured: true, error: err.message }
  }
}

export function invalidateCache() { urlCache = null }
