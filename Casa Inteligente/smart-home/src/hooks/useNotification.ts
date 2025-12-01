// src/hooks/useNotifications.ts
"use client";
import { useEffect, useState } from "react";
import type { Notification } from "../utils/notificationsUtils";
import {
  initialNotifications,
  fetchNotifications,
  updateNotificationStatus,
} from "../utils/notificationsUtils";
import { useWebSocket } from "./useWebSocket";

export function useNotifications(
  initial: Notification[] = initialNotifications,
  options?: {
    apiBase?: string;
    token?: string;
    limit?: number;
    offset?: number;
    userId?: number;
  }
) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const { message: wsMessage } = useWebSocket();

  // Fetch notifications on initial load
  useEffect(() => {
    fetchNotifications(options?.apiBase, options?.token, {
      limit: options?.limit,
      offset: options?.offset,
      status: "new",
    })
      .then((list) => {
        setNotifications(list);
      })
      .catch(() => {});
  }, [options?.apiBase, options?.token, options?.limit, options?.offset]);

  const remove = async (id: number) => {
    const success = await updateNotificationStatus(
      id,
      "archived",
      options?.apiBase,
      options?.token
    );
    if (success) {
      setNotifications((p) => p.filter((n) => n.id !== id));
    } else {
      console.error("Failed to archive notification", id);
    }
  };

  const clearAll = async () => {
    const archivePromises = notifications.map((n) =>
      updateNotificationStatus(
        n.id,
        "archived",
        options?.apiBase,
        options?.token
      )
    );
    const results = await Promise.all(archivePromises);
    if (results.every(Boolean)) {
      setNotifications([]);
      setOpen(false);
    } else {
      console.error("Failed to archive all notifications");
    }
  };

  const toggle = () => {
    if (open) {
      setClosing(true);
      setTimeout(() => {
        setOpen(false);
        setClosing(false);
      }, 350);
    } else {
      setOpen(true);
      fetchNotifications(options?.apiBase, options?.token, {
        limit: options?.limit,
        offset: options?.offset,
        status: "new",
      })
        .then((list) => {
          setNotifications(list);
        })
        .catch(() => {});
    }
  };

  const refresh = () => {
    return fetchNotifications(options?.apiBase, options?.token, {
      limit: options?.limit,
      offset: options?.offset,
    }).then((list) => {
      setNotifications(list);
      return list;
    });
  };

  useEffect(() => {
    if (!wsMessage) return;
    if (wsMessage.device_name && wsMessage.state) return;
    const raw = wsMessage.notification ?? wsMessage;
    const parsed =
      typeof raw?.message === "string"
        ? (() => {
            try {
              return JSON.parse(raw.message);
            } catch {
              return null;
            }
          })()
        : null;
    const wsType = raw?.type ?? parsed?.type;
    const wsTitle = raw?.title ?? parsed?.title;

    const id =
      raw?.id ??
      raw?.notification_id ??
      raw?.uuid ??
      Math.floor(Math.random() * 1e9);
    const type = wsType;
    const title = wsTitle;
    const msg =
      parsed?.message ?? raw?.message ?? raw?.text ?? raw?.content ?? "";
    const status = raw?.status ?? parsed?.status;
    const timestamp = raw?.timestamp ?? raw?.created_at ?? raw?.time;
    const nn: Notification = {
      id,
      message: msg,
      type,
      title,
      status,
      timestamp,
    } as any;
    setNotifications((prev) => {
      const exists = prev.some((x) => x.id === id && x.message === msg);
      if (exists) return prev;
      return [nn, ...prev];
    });
  }, [wsMessage]);

  return {
    notifications,
    open,
    closing,
    remove,
    clearAll,
    toggle,
    refresh,
    setNotifications,
  };
}
