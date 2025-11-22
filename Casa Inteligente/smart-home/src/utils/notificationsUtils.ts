//Encapsula la lógica de abrir, cerrar y limpiar notificaciones.
export interface Notification {
  id: number
  message: string
  type?: string
  title?: string
  timestamp?: string
}

export const initialNotifications: Notification[] = []

export function removeNotification(list: Notification[], id: number) {
  return list.filter((n) => n.id !== id)
}

export function clearNotifications() {
  return [] as Notification[]
}

export async function fetchNotifications(
  apiBase?: string,
  token?: string,
  params?: { limit?: number; offset?: number }
): Promise<Notification[]> {
  const resolvedEnv = (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_API_BASE_URL : undefined)
    || (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_API_URL : undefined)
    || (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_BACKEND_URL : undefined)
    || (typeof window !== "undefined" ? (window.localStorage.getItem("API_URL") || undefined) : undefined)
  const base = apiBase || resolvedEnv || (typeof window !== "undefined" ? window.location.origin : "")
  const url = new URL("/notifications/", base)
  if (params?.limit) url.searchParams.set("limit", String(params.limit))
  if (params?.offset) url.searchParams.set("offset", String(params.offset))

  const headers: Record<string, string> = { accept: "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(url.toString(), { headers, mode: "cors", credentials: "omit" })
  if (!res.ok) return []
  const data = await res.json().catch(() => [])
  const list = Array.isArray(data) ? data : (data?.notifications ?? data?.items ?? data?.results ?? data?.data ?? [])
  const mapped = list.map((n: any) => {
    let parsed: any = null
    if (typeof n?.message === "string") {
      try { parsed = JSON.parse(n.message) } catch {}
    }
    const type = n?.type ?? parsed?.type
    const title = n?.title ?? parsed?.title
    const msg = (parsed?.message ?? n?.message ?? n?.text ?? n?.content ?? "")
    const status = n?.status ?? parsed?.status
    const timestamp = n?.timestamp ?? n?.created_at ?? n?.time
    return {
      id: n?.id ?? n?.notification_id ?? n?.uuid ?? Math.floor(Math.random() * 1e9),
      message: msg,
      type,
      title,
      status,
      timestamp,
    }
  })
  return mapped.filter((x: Notification) => (x.type ?? "").toLowerCase() !== "user_action")
}

export async function deleteNotification(
  id: number,
  apiBase?: string,
  token?: string
): Promise<boolean> {
  const resolvedEnv = (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_API_BASE_URL : undefined)
    || (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_API_URL : undefined)
    || (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_BACKEND_URL : undefined)
    || (typeof window !== "undefined" ? (window.localStorage.getItem("API_URL") || undefined) : undefined)
  const base = apiBase || resolvedEnv || (typeof window !== "undefined" ? window.location.origin : "")
  const url = new URL(`/notifications/${id}`, base)
  const headers: Record<string, string> = { accept: "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(url.toString(), { method: "DELETE", headers, mode: "cors", credentials: "omit" })
  return res.ok
}
