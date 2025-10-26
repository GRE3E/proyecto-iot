//Encapsula la lógica de abrir, cerrar y limpiar notificaciones.
export interface Notification {
  id: number
  message: string
}

export const initialNotifications: Notification[] = [
  { id: 1, message: "Nueva actualización de seguridad" },
  { id: 2, message: "Sensor de movimiento activado" },
  { id: 3, message: "Consumo de energía elevado detectado" },
]

export function removeNotification(list: Notification[], id: number) {
  return list.filter((n) => n.id !== id)
}

export function clearNotifications() {
  return [] as Notification[]
}