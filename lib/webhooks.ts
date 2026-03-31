import { supabase, ORG_UID } from './supabase'

let urlCache: Record<string, string> | null = null

const DEFAULT_WEBHOOK_URLS: Record<string, string> = {
  rassylka_zapustit: 'https://n8n.srv1090249.hstgr.cloud/webhook/growice/rassylka_zapustit',
}

async function getUrl(code: string): Promise<string | null> {
  if (code === 'rassylka_zapustit') return 'https://n8n.srv1090249.hstgr.cloud/webhook/growice/rassylka_zapustit'
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
  return (process.env as any)[envKey] || DEFAULT_WEBHOOK_URLS[code] || null
}

async function log(code: string, params: any, status: string, error?: string) {
  try {
    await supabase.from('action_log').insert({
      org_uid: ORG_UID, action_code: code, params, status, error_message: error,
    })
  } catch {}
}

export async function callWebhook(
  actionCode: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  const url = await getUrl(actionCode)
  if (!url) return { ok: false, configured: false }

  const payload = {
    org_uid: ORG_UID,
    action_code: actionCode,
    params,
    client_time: new Date().toISOString(),
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await log(actionCode, params, res.ok ? 'успех' : 'ошибка')
    return { ok: res.ok, configured: true }
  } catch (err: any) {
    await log(actionCode, params, 'ошибка', err.message)
    return { ok: false, configured: true, error: err.message }
  }
}

export function invalidateCache() { urlCache = null }
