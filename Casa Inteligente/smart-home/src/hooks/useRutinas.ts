import { useEffect, useMemo, useState } from "react"
import { v4 as uuidv4 } from "uuid"

export type TriggerType = "NLP" | "Tiempo" | "Evento"

export interface TriggerNLP {
  type: "NLP"
  phrase: string
}

export interface TriggerTime {
  type: "Tiempo"
  hour: string // HH:mm
  days: string[] // ["Lunes", "Martes", ...]
  date?: string // YYYY-MM-DD opcional
}

export interface TriggerDeviceCondition {
  operator: ">" | "<" | "="
  value: number
}

export interface TriggerDevice {
  type: "Evento"
  deviceId: string
  deviceName: string
  event: string
  condition?: TriggerDeviceCondition
}

export type Trigger = TriggerNLP | TriggerTime | TriggerDevice

export interface RoutineAction {
  id: string
  name: string
}

export interface Routine {
  id: string
  name: string
  description: string
  enabled: boolean
  confirmed: boolean
  trigger: Trigger
  actions: RoutineAction[]
  executionsCount: number
  lastExecutedAt: string | null // ISO string
}

export interface RoutineSuggestion {
  id: string
  name: string
  trigger: Trigger
  confidence: number // 0-100
  actions: RoutineAction[]
}

function describeTrigger(trigger: Trigger): string {
  switch (trigger.type) {
    case "NLP":
      return `Cuando diga "${trigger.phrase}"`
    case "Tiempo":
      return `A las ${trigger.hour} ${trigger.days && trigger.days.length ? `(${trigger.days.join(", ")})` : "todos los días"}`
    case "Evento":
      return `Cuando ${trigger.deviceName} reporte "${trigger.event}"${trigger.condition ? ` con condición ${trigger.condition.operator} ${trigger.condition.value}` : ""}`
  }
}

export function useRutinas() {
  const [rutinas, setRutinas] = useState<Routine[]>([])
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [suggestions, setSuggestions] = useState<RoutineSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false)

  const availableActions: RoutineAction[] = useMemo(
    () => [
      { id: "act-1", name: "Encender luz salón" },
      { id: "act-2", name: "Apagar ventilador" },
      { id: "act-3", name: "Subir cortinas" },
      { id: "act-4", name: "Bajar cortinas" },
      { id: "act-5", name: "Activar modo noche" },
    ],
    []
  )

  useEffect(() => {
    loadRutinas()
  }, [])

  function loadRutinas() {
    try {
      setIsLoadingList(true)
      setError(null)
      // Mock inicial, podría leer de localStorage
      const initial: Routine[] = [
        {
          id: uuidv4(),
          name: "Buenas noches",
          description: "Prepara la casa para dormir",
          enabled: true,
          confirmed: true,
          trigger: { type: "NLP", phrase: "buenas noches" },
          actions: [availableActions[0], availableActions[2], availableActions[4]],
          executionsCount: 12,
          lastExecutedAt: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          name: "Ventilación matutina",
          description: "Abre cortinas y apaga ventilador",
          enabled: false,
          confirmed: false,
          trigger: { type: "Tiempo", hour: "07:30", days: ["Lunes", "Miércoles"] },
          actions: [availableActions[1], availableActions[2]],
          executionsCount: 3,
          lastExecutedAt: null,
        },
        {
          id: uuidv4(),
          name: "Movimiento en sala",
          description: "Enciende luz al detectar movimiento",
          enabled: true,
          confirmed: true,
          trigger: {
            type: "Evento",
            deviceId: "sensor-sala",
            deviceName: "Sensor de sala",
            event: "movimiento",
          },
          actions: [availableActions[0]],
          executionsCount: 58,
          lastExecutedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
      ]
      setRutinas(initial)
    } catch (e: any) {
      setError(e?.message ?? "Error cargando rutinas")
    } finally {
      setIsLoadingList(false)
    }
  }

  function createRutina(input: Omit<Routine, "id" | "executionsCount" | "lastExecutedAt">) {
    const newRoutine: Routine = {
      id: uuidv4(),
      executionsCount: 0,
      lastExecutedAt: null,
      ...input,
    }
    setRutinas((prev) => [newRoutine, ...prev])
    return newRoutine
  }

  function updateRutina(id: string, changes: Partial<Routine>) {
    setRutinas((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  }

  function deleteRutina(id: string) {
    setRutinas((prev) => prev.filter((r) => r.id !== id))
  }

  function toggleEnabled(id: string, enabled: boolean) {
    updateRutina(id, { enabled })
  }

  function confirmRutina(id: string) {
    updateRutina(id, { confirmed: true })
  }

  function rejectRutina(id: string) {
    updateRutina(id, { confirmed: false })
  }

  function runRutinaNow(id: string) {
    const now = new Date().toISOString()
    setRutinas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, executionsCount: r.executionsCount + 1, lastExecutedAt: now } : r))
    )
  }

  function getRoutineById(id: string): Routine | undefined {
    return rutinas.find((r) => r.id === id)
  }

  function generateSuggestions() {
    setIsLoadingSuggestions(true)
    // Mock de sugerencias
    const sugg: RoutineSuggestion[] = [
      {
        id: uuidv4(),
        name: "Modo tarde",
        trigger: { type: "Tiempo", hour: "18:00", days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] },
        confidence: 78,
        actions: [availableActions[2], availableActions[4]],
      },
      {
        id: uuidv4(),
        name: "Bienvenida",
        trigger: { type: "NLP", phrase: "hola casa" },
        confidence: 62,
        actions: [availableActions[0]],
      },
      {
        id: uuidv4(),
        name: "Seguridad noche",
        trigger: {
          type: "Evento",
          deviceId: "sensor-puerta",
          deviceName: "Sensor de puerta",
          event: "apertura",
          condition: { operator: "=", value: 1 },
        },
        confidence: 85,
        actions: [availableActions[4]],
      },
    ]
    setTimeout(() => {
      setSuggestions(sugg)
      setIsLoadingSuggestions(false)
    }, 400)
  }

  function acceptSuggestion(sugg: RoutineSuggestion) {
    createRutina({
      name: sugg.name,
      description: describeTrigger(sugg.trigger),
      enabled: true,
      confirmed: true,
      trigger: sugg.trigger,
      actions: sugg.actions,
    })
    setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id))
  }

  function rejectSuggestion(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  return {
    // datos
    rutinas,
    suggestions,
    availableActions,
    // estados
    isLoadingList,
    isLoadingSuggestions,
    error,
    // helpers
    describeTrigger,
    getRoutineById,
    // acciones
    loadRutinas,
    createRutina,
    updateRutina,
    deleteRutina,
    toggleEnabled,
    confirmRutina,
    rejectRutina,
    runRutinaNow,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
  }
}