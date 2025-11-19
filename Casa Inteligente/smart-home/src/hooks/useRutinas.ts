import { useEffect, useMemo, useState, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"

export type TriggerType = "NLP" | "Tiempo" | "Evento"

export interface TriggerNLP {
  type: "NLP"
  phrase: string
}

export interface TriggerTime {
  type: "Tiempo"
  hour: string
  days: string[]
  date?: string
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
  lastExecutedAt: string | null
}

export interface RoutineSuggestion {
  id: string
  name: string
  trigger: Trigger
  confidence: number
  actions: RoutineAction[]
}

export interface FormState {
  name: string
  description: string
  enabled: boolean
  triggerType: TriggerType
  nlpPhrase: string
  timeHour: string
  timeDays: string[]
  timeDate: string
  deviceId: string
  deviceEvent: string
  condOperator: ">" | "<" | "=" | ""
  condValue: number | ""
  actionIds: string[]
}

export const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  enabled: true,
  triggerType: "NLP",
  nlpPhrase: "",
  timeHour: "08:00",
  timeDays: [],
  timeDate: "",
  deviceId: "sensor-sala",
  deviceEvent: "movimiento",
  condOperator: "",
  condValue: "",
  actionIds: [],
}

export const DEVICE_OPTIONS = [
  { id: "sensor-sala", name: "Sensor de sala", events: ["movimiento", "temperatura", "humedad"] },
  { id: "sensor-puerta", name: "Sensor de puerta", events: ["apertura", "cierre"] },
  { id: "interruptor-salon", name: "Interruptor salón", events: ["encendido", "apagado"] },
]

export const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

export function describeTrigger(trigger: Trigger): string {
  switch (trigger.type) {
    case "NLP":
      return `Cuando diga "${trigger.phrase}"`
    case "Tiempo":
      return `A las ${trigger.hour} ${trigger.days?.length ? `(${trigger.days.join(", ")})` : "todos los días"}`
    case "Evento":
      return `Cuando ${trigger.deviceName} reporte "${trigger.event}"${trigger.condition ? ` ${trigger.condition.operator} ${trigger.condition.value}` : ""}`
  }
}

export function useRutinas() {
  const [rutinas, setRutinas] = useState<Routine[]>([])
  const [suggestions, setSuggestions] = useState<RoutineSuggestion[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableActions: RoutineAction[] = useMemo(() => [
    { id: "act-1", name: "Encender luz salón" },
    { id: "act-2", name: "Apagar ventilador" },
    { id: "act-3", name: "Subir cortinas" },
    { id: "act-4", name: "Bajar cortinas" },
    { id: "act-5", name: "Activar modo noche" },
  ], [])

  useEffect(() => {
    loadRutinas()
  }, [])

  const loadRutinas = useCallback(async () => {
    try {
      setIsLoadingList(true)
      setError(null)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setRutinas([
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
          trigger: { type: "Evento", deviceId: "sensor-sala", deviceName: "Sensor de sala", event: "movimiento" },
          actions: [availableActions[0]],
          executionsCount: 58,
          lastExecutedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
      ])
    } catch (err) {
      setError("Error al cargar las rutinas")
    } finally {
      setIsLoadingList(false)
    }
  }, [availableActions])

  const buildTrigger = useCallback((form: FormState): Trigger => {
    if (form.triggerType === "NLP") return { type: "NLP", phrase: form.nlpPhrase }
    if (form.triggerType === "Tiempo") return { type: "Tiempo", hour: form.timeHour, days: form.timeDays, date: form.timeDate || undefined }
    const dev = DEVICE_OPTIONS.find(d => d.id === form.deviceId)!
    const cond = form.condOperator && form.condValue !== "" ? { operator: form.condOperator as any, value: Number(form.condValue) } : undefined
    return { type: "Evento", deviceId: form.deviceId, deviceName: dev.name, event: form.deviceEvent, condition: cond }
  }, [])

  const mapActions = useCallback((ids: string[]): RoutineAction[] =>
    ids.map(id => availableActions.find(a => a.id === id)).filter(Boolean) as RoutineAction[], [availableActions])

  const validateForm = useCallback((form: FormState): { valid: boolean; message?: string } => {
    if (!form.name.trim()) return { valid: false, message: "El nombre es obligatorio" }
    if (form.triggerType === "NLP" && !form.nlpPhrase.trim()) return { valid: false, message: "La frase activadora es obligatoria" }
    if (form.triggerType === "Tiempo" && form.timeDays.length === 0 && !form.timeDate) return { valid: false, message: "Selecciona al menos un día o una fecha" }
    if (form.actionIds.length === 0) return { valid: false, message: "Selecciona al menos una acción" }
    return { valid: true }
  }, [])

  const createRutina = useCallback((form: FormState) => {
    const validation = validateForm(form)
    if (!validation.valid) return { success: false, message: validation.message || "Error de validación" }

    const newRoutine: Routine = {
      id: uuidv4(),
      name: form.name.trim(),
      description: form.description.trim(),
      enabled: form.enabled,
      confirmed: false,
      trigger: buildTrigger(form),
      actions: mapActions(form.actionIds),
      executionsCount: 0,
      lastExecutedAt: null,
    }
    setRutinas(prev => [newRoutine, ...prev])
    return { success: true, message: "Rutina creada correctamente", routine: newRoutine }
  }, [validateForm, buildTrigger, mapActions])

  const updateRutina = useCallback((id: string, form: FormState) => {
    const validation = validateForm(form)
    if (!validation.valid) return { success: false, message: validation.message || "Error de validación" }

    let updated = false
    setRutinas(prev => prev.map(r => {
      if (r.id === id) {
        updated = true
        return {
          ...r,
          name: form.name.trim(),
          description: form.description.trim(),
          enabled: form.enabled,
          trigger: buildTrigger(form),
          actions: mapActions(form.actionIds),
        }
      }
      return r
    }))
    return { success: updated, message: updated ? "Rutina actualizada correctamente" : "Rutina no encontrada" }
  }, [validateForm, buildTrigger, mapActions])

  const deleteRutina = useCallback((id: string) => {
    let deleted = false
    setRutinas(prev => {
      const newRutinas = prev.filter(r => r.id !== id)
      deleted = newRutinas.length < prev.length
      return newRutinas
    })
    return { success: deleted, message: deleted ? "Rutina eliminada correctamente" : "Rutina no encontrada" }
  }, [])

  const toggleEnabled = useCallback((id: string, enabled: boolean) => {
    let updated = false
    setRutinas(prev => prev.map(r => {
      if (r.id === id) {
        updated = true
        return { ...r, enabled }
      }
      return r
    }))
    return { success: updated }
  }, [])

  const confirmRutina = useCallback((id: string) => {
    let updated = false
    setRutinas(prev => prev.map(r => {
      if (r.id === id) {
        updated = true
        return { ...r, confirmed: true }
      }
      return r
    }))
    return { success: updated }
  }, [])

  const rejectRutina = useCallback((id: string) => {
    let updated = false
    setRutinas(prev => prev.map(r => {
      if (r.id === id) {
        updated = true
        return { ...r, confirmed: false }
      }
      return r
    }))
    return { success: updated }
  }, [])

  const runRutineNow = useCallback((id: string) => {
    let executed = false
    setRutinas(prev => prev.map(r => {
      if (r.id === id && r.enabled) {
        executed = true
        return { ...r, executionsCount: r.executionsCount + 1, lastExecutedAt: new Date().toISOString() }
      }
      return r
    }))
    return { success: executed, message: executed ? "Rutina ejecutada correctamente" : "No se pudo ejecutar la rutina" }
  }, [])

  const generateSuggestions = useCallback(async () => {
    try {
      setIsLoadingSuggestions(true)
      setError(null)
      await new Promise(resolve => setTimeout(resolve, 400))

      setSuggestions([
        { id: uuidv4(), name: "Modo tarde", trigger: { type: "Tiempo", hour: "18:00", days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] }, confidence: 78, actions: [availableActions[2], availableActions[4]] },
        { id: uuidv4(), name: "Bienvenida", trigger: { type: "NLP", phrase: "hola casa" }, confidence: 62, actions: [availableActions[0]] },
        { id: uuidv4(), name: "Seguridad noche", trigger: { type: "Evento", deviceId: "sensor-puerta", deviceName: "Sensor de puerta", event: "apertura", condition: { operator: "=", value: 1 } }, confidence: 85, actions: [availableActions[4]] },
      ])
    } catch (err) {
      setError("Error al generar sugerencias")
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [availableActions])

  const acceptSuggestion = useCallback((sugg: RoutineSuggestion) => {
    const newRoutine: Routine = {
      id: uuidv4(),
      name: sugg.name,
      description: describeTrigger(sugg.trigger),
      enabled: true,
      confirmed: true,
      trigger: sugg.trigger,
      actions: sugg.actions,
      executionsCount: 0,
      lastExecutedAt: null,
    }
    setRutinas(prev => [newRoutine, ...prev])
    setSuggestions(prev => prev.filter(s => s.id !== sugg.id))
    return { success: true, message: "Sugerencia aceptada y convertida en rutina", routine: newRoutine }
  }, [])

  const rejectSuggestion = useCallback((id: string) => {
    let rejected = false
    setSuggestions(prev => {
      const newSuggestions = prev.filter(s => s.id !== id)
      rejected = newSuggestions.length < prev.length
      return newSuggestions
    })
    return { success: rejected }
  }, [])

  const getRoutineById = useCallback((id: string) => rutinas.find(r => r.id === id), [rutinas])

  const getStatistics = useCallback(() => ({
    total: rutinas.length,
    enabled: rutinas.filter(r => r.enabled).length,
    confirmed: rutinas.filter(r => r.confirmed).length,
    totalExecutions: rutinas.reduce((sum, r) => sum + r.executionsCount, 0),
  }), [rutinas])

  return {
    // Estado
    rutinas,
    suggestions,
    availableActions,
    isLoadingList,
    isLoadingSuggestions,
    error,
    
    // Helpers
    describeTrigger,
    getRoutineById,
    getStatistics,
    
    // CRUD
    createRutina,
    updateRutina,
    deleteRutina,
    loadRutinas,
    
    // Acciones
    toggleEnabled,
    confirmRutina,
    rejectRutina,
    runRutineNow,
    
    // Sugerencias
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    
    // Constantes
    INITIAL_FORM,
    DEVICE_OPTIONS,
    DAY_LABELS,
  }
}