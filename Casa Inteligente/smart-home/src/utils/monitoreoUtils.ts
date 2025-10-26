import {
  Brain,
  FullscreenIcon,
  AirVentIcon,
  FanIcon,
  ThermometerIcon,
  MegaphoneIcon,
  Car,
  DoorClosed,
  Utensils,
  WashingMachine,
  ShowerHead,
  Users,
  Grid2X2,
  LightbulbIcon,
} from "lucide-react"
import type { Transition } from "framer-motion"

/* ===========================================================
   📦 Dispositivos de Seguridad
   =========================================================== */

export const devicesPage1 = [
  { icon: Brain, title: "Cerebro", status: (i: number, s: boolean[]) => (s[i] ? "Encendido" : "Apagado") },
  { icon: FullscreenIcon, title: "Pantalla LCD", status: (i: number, s: boolean[]) => (s[i] ? "Encendido" : "Apagado") },
  { icon: AirVentIcon, title: "Aire acondicionado", status: (i: number, s: boolean[]) => (s[i] ? "Encendido" : "Apagado") },
  { icon: FanIcon, title: "Ventilador", status: (i: number, s: boolean[]) => (s[i] ? "Encendido" : "Apagado") },
  { icon: ThermometerIcon, title: "Sensor de temperatura", status: (i: number, s: boolean[]) => (s[i] ? "Encendido" : "Apagado") },
  { icon: MegaphoneIcon, title: "Sensor de ultrasonido", status: (i: number, s: boolean[]) => (s[i] ? "Encendido" : "Apagado") },
  { icon: Car, title: "Cochera", status: (i: number, s: boolean[]) => (s[i] ? "Bloqueado" : "Desbloqueado") },
  { icon: DoorClosed, title: "Puerta principal", status: (i: number, s: boolean[]) => (s[i] ? "Bloqueado" : "Desbloqueado") },
  { icon: Utensils, title: "Puerta de la cocina", status: (i: number, s: boolean[]) => (s[i] ? "Bloqueado" : "Desbloqueado") },
  { icon: WashingMachine, title: "Puerta de la lavandería", status: (i: number, s: boolean[]) => (s[i] ? "Bloqueado" : "Desbloqueado") },
  { icon: DoorClosed, title: "Habitación principal", status: (i: number, s: boolean[]) => (s[i] ? "Bloqueado" : "Desbloqueado") },
  { icon: ShowerHead, title: "Baño principal", status: (i: number, s: boolean[]) => (s[i] ? "Bloqueado" : "Desbloqueado") },
]

export const devicesPage2 = [
  { icon: Users, title: "Habitación Invitados", status: (i: number, s: boolean[]) => (s[i] ? "Bloqueado" : "Desbloqueado") },
  { icon: ShowerHead, title: "Baño de invitados", status: (i: number, s: boolean[]) => (s[i] ? "Bloqueado" : "Desbloqueado") },
  { icon: Grid2X2, title: "Ventanas de la sala", status: (i: number, s: boolean[]) => (s[i] ? "Cerradas" : "Abiertas") },
  { icon: Grid2X2, title: "Ventana de la cocina", status: (i: number, s: boolean[]) => (s[i] ? "Cerrada" : "Abierta") },
  { icon: Grid2X2, title: "Ventana habitación principal", status: (i: number, s: boolean[]) => (s[i] ? "Cerrada" : "Abierta") },
  { icon: Grid2X2, title: "Ventana baño principal", status: (i: number, s: boolean[]) => (s[i] ? "Cerrada" : "Abierta") },
  { icon: Grid2X2, title: "Ventana habitación invitados", status: (i: number, s: boolean[]) => (s[i] ? "Cerrada" : "Abierta") },
  { icon: Grid2X2, title: "Ventana baño invitados", status: (i: number, s: boolean[]) => (s[i] ? "Cerrada" : "Abierta") },
  { icon: Grid2X2, title: "Ventana lavandería", status: (i: number, s: boolean[]) => (s[i] ? "Cerrada" : "Abierta") },
  { icon: Grid2X2, title: "Ventana cochera", status: (i: number, s: boolean[]) => (s[i] ? "Cerrada" : "Abierta") },
  { icon: LightbulbIcon, title: "Luz sala", status: (i: number, s: boolean[]) => (s[i] ? "Encendida" : "Apagada") },
]

export const devicesPage3 = [
  { icon: LightbulbIcon, title: "Luz cocina", status: (i: number, s: boolean[]) => (s[i] ? "Encendida" : "Apagada") },
  { icon: LightbulbIcon, title: "Luz habitación principal", status: (i: number, s: boolean[]) => (s[i] ? "Encendida" : "Apagada") },
  { icon: LightbulbIcon, title: "Luz baño principal", status: (i: number, s: boolean[]) => (s[i] ? "Encendida" : "Apagada") },
  { icon: LightbulbIcon, title: "Luz baño invitados", status: (i: number, s: boolean[]) => (s[i] ? "Encendida" : "Apagada") },
  { icon: LightbulbIcon, title: "Luz lavandería", status: (i: number, s: boolean[]) => (s[i] ? "Encendida" : "Apagada") },
  { icon: LightbulbIcon, title: "Luz cochera", status: (i: number, s: boolean[]) => (s[i] ? "Encendida" : "Apagada") },
]

/* ===========================================================
   🧮 Funciones Auxiliares
   =========================================================== */
export const getGlobalIndex = (page: number, index: number) =>
  page === 1
    ? index
    : page === 2
    ? devicesPage1.length + index
    : devicesPage1.length + devicesPage2.length + index

/* ===========================================================
   🪄 Animaciones
   =========================================================== */
export const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export const panelVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const panelTransition: Transition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1],
}

export const systemCardVariants = {
  initial: { opacity: 0, height: 0, marginBottom: 0 },
  animate: { opacity: 1, height: "auto", marginBottom: 16 },
  exit: { opacity: 0, height: 0, marginBottom: 0 },
}

export const systemCardTransition: Transition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1],
}
