// utils/chatUtils.ts
export interface Message {
  sender: "Tú" | "CasaIA"
  text: string
  timestamp: Date
  type: "text"
}

/**
 * Genera una respuesta de la IA según el texto recibido.
 * (Simulación local mientras se conecta con backend/IA real)
 */
export function generateAIResponse(userMessage: string): string {
  const text = userMessage.toLowerCase()
  if (text.includes("temperatura")) return "CasaIA: La temperatura actual es 22°C."
  if (text.includes("luz") || text.includes("luces")) return "CasaIA: He encendido las luces del salón."
  if (text.includes("hola") || text.includes("buenos días")) return "CasaIA: ¡Hola! ¿Cómo puedo ayudarte hoy?"
  return "CasaIA: He entendido tu solicitud."
}

/**
 * Crea un objeto mensaje listo para usar.
 */
export function createMessage(sender: "Tú" | "CasaIA", text: string): Message {
  return {
    sender,
    text,
    timestamp: new Date(),
    type: "text",
  }
}

/**
 * Simula un pequeño retardo al responder (efecto 'escribiendo...').
 */
export async function simulateResponseDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

//lógica visual de Sparkline, Donut y MiniBars
export function generateSparklinePoints(values: number[]): string {
  if (!values || values.length === 0) return ""
  const max = Math.max(...values)
  if (max === 0) return values.map((_, i) => `${(i / (values.length - 1)) * 100},100`).join(" ")
  return values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 100}`)
    .join(" ")
}

export function donutParams(percent: number, radius = 18) {
  const circumference = 2 * Math.PI * radius
  const dash = Math.max(0, Math.min(1, percent / 100)) * circumference
  return { radius, circumference, dash }
}

export function normalizeBars(values: number[]) {
  const max = Math.max(...values, 1)
  return values.map((v) => (v / max) * 100)
}
