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

  // Only fetch notifications when receiving notification-related WebSocket messages
  useEffect(() => {
    if (!wsMessage) return;

    // Only fetch notifications for notification-related messages
    // Ignore music_update, device_update, etc.
    const notificationTypes = [
      "notification",
      "new_notification",
      "notification_update",
    ];
    if (!notificationTypes.includes(wsMessage.type)) {
      return;
    }

    fetchNotifications(options?.apiBase, options?.token, {
      limit: options?.limit,
      offset: options?.offset,
      status: "new",
    })
      .then((list) => {
        setNotifications(list);
      })
      .catch(() => {});
  }, [
    wsMessage,
    options?.apiBase,
    options?.token,
    options?.limit,
    options?.offset,
  ]);

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
