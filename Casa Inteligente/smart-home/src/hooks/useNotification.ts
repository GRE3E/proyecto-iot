// src/hooks/useNotifications.ts
"use client"
import { useState } from "react"
import type { Notification } from "../utils/notificationsUtils"
import { initialNotifications } from "../utils/notificationsUtils"

export function useNotifications(initial: Notification[] = initialNotifications) {
  const [notifications, setNotifications] = useState<Notification[]>(initial)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)

  const remove = (id: number) => setNotifications((prev) => prev.filter((n) => n.id !== id))

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
    }
  }

  return {
    notifications,
    open,
    closing,
    remove,
    clearAll,
    toggle,
    setNotifications, // opcional si necesitas actualizar desde la page
  }
}
