// src/hooks/useNotifications.ts
"use client"
import { useEffect, useRef, useState } from "react"
import type { Notification } from "../utils/notificationsUtils"
import { initialNotifications, fetchNotifications, deleteNotification } from "../utils/notificationsUtils"
import { useWebSocket } from "./useWebSocket"
import { v4 as uuidv4 } from "uuid"

export function useNotifications(
  initial: Notification[] = initialNotifications,
  options?: { apiBase?: string; token?: string; limit?: number; offset?: number }
) {
  const [notifications, setNotifications] = useState<Notification[]>(initial)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const clientId = useRef(uuidv4())
  const { message: wsMessage } = useWebSocket(clientId.current)

  const remove = (id: number) => {
    const prev = notifications
    setNotifications((p) => p.filter((n) => n.id !== id))
    deleteNotification(id, options?.apiBase, options?.token)
      .then((ok) => {
        if (!ok) setNotifications(prev)
      })
      .catch(() => setNotifications(prev))
  }

  const clearAll = () => {
    setNotifications([])
    setOpen(false)
  }

  const toggle = () => {
    if (open) {
      setClosing(true)
      setTimeout(() => {
        setOpen(false)
        setClosing(false)
      }, 350)
    } else {
      setOpen(true)
      fetchNotifications(options?.apiBase, options?.token, { limit: options?.limit, offset: options?.offset })
        .then((list) => {
          setNotifications(list)
        })
        .catch(() => {})
    }
  }

  const refresh = () => {
    return fetchNotifications(options?.apiBase, options?.token, { limit: options?.limit, offset: options?.offset })
      .then((list) => {
        setNotifications(list)
        return list
      })
  }

  useEffect(() => {
    if (!wsMessage) return
    if (wsMessage.device_name && wsMessage.state) return
    const raw = wsMessage.notification ?? wsMessage
    const parsed = typeof raw?.message === "string" ? (() => { try { return JSON.parse(raw.message) } catch { return null } })() : null
    const wsType = raw?.type ?? parsed?.type
    const wsTitle = raw?.title ?? parsed?.title
    if (wsType === "user_action") return
    const id = raw?.id ?? raw?.notification_id ?? raw?.uuid ?? Math.floor(Math.random() * 1e9)
    const type = wsType
    const title = wsTitle
    const msg = parsed?.message ?? raw?.message ?? raw?.text ?? raw?.content ?? ""
    const status = raw?.status ?? parsed?.status
    const timestamp = raw?.timestamp ?? raw?.created_at ?? raw?.time
    const nn: Notification = { id, message: msg, type, title, status, timestamp } as any
    setNotifications((prev) => {
      const exists = prev.some((x) => x.id === id && x.message === msg)
      if (exists) return prev
      return [nn, ...prev]
    })
  }, [wsMessage])

  useEffect(() => {
    fetchNotifications(options?.apiBase, options?.token, { limit: options?.limit, offset: options?.offset })
      .then((list) => setNotifications(list))
      .catch(() => {})
  }, [])

  return {
    notifications,
    open,
    closing,
    remove,
    clearAll,
    toggle,
    refresh,
    setNotifications, // opcional si necesitas actualizar desde la page
  }
}