import { useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { axiosInstance } from "../services/authService";

export type TriggerType = "NLP" | "Tiempo" | "Evento";

export interface TriggerNLP {
  type: "NLP";
  phrase: string;
}

export interface TriggerTime {
  type: "Tiempo";
  hour: string;
  days: string[];
  date?: string;
}

export interface TriggerDeviceCondition {
  operator: ">" | "<" | "=";
  value: number;
}

export interface TriggerDevice {
  type: "Evento";
  deviceId: string;
  deviceName: string;
  event: string;
  condition?: TriggerDeviceCondition;
}

export type Trigger = TriggerNLP | TriggerTime | TriggerDevice;

export interface RoutineAction {
  id: string;
  name: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  confirmed: boolean;
  trigger: Trigger;
  actions: RoutineAction[];
  executionsCount: number;
  lastExecutedAt: string | null;
}

export interface RoutineSuggestion {
  id: string;
  name: string;
  trigger: Trigger;
  confidence: number;
  actions: RoutineAction[];
}

export interface FormState {
  name: string;
  description: string;
  enabled: boolean;
  triggerType: TriggerType;
  nlpPhrase: string;
  timeHour: string;
  timeDays: string[];
  timeDate: string;
  relativeMinutes: number;
  deviceId: string;
  deviceEvent: string;
  condOperator: ">" | "<" | "=" | "";
  condValue: number | "";
  actionIds: string[];
  ttsInput: string;
  ttsMessages: string[];
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
  relativeMinutes: 0,
  deviceId: "sensor-sala",
  deviceEvent: "movimiento",
  condOperator: "",
  condValue: "",
  actionIds: [],
  ttsInput: "",
  ttsMessages: [],
};

export const DEVICE_OPTIONS = [
  {
    id: "sensor-sala",
    name: "Sensor de sala",
    events: ["movimiento", "temperatura", "humedad"],
  },
  {
    id: "sensor-puerta",
    name: "Sensor de puerta",
    events: ["apertura", "cierre"],
  },
  {
    id: "interruptor-salon",
    name: "Interruptor salón",
    events: ["encendido", "apagado"],
  },
];

export const DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function describeTrigger(trigger: Trigger): string {
  switch (trigger.type) {
    case "NLP":
      return `Cuando diga "${trigger.phrase}"`;
    case "Tiempo":
      if ((trigger as any).date) {
        return `A las ${trigger.hour} el ${(trigger as any).date}`;
      }
      return `A las ${trigger.hour} ${
        trigger.days?.length ? `(${trigger.days.join(", ")})` : "todos los días"
      }`;
    case "Evento":
      return `Cuando ${trigger.deviceName} reporte "${trigger.event}"${
        trigger.condition
          ? ` ${trigger.condition.operator} ${trigger.condition.value}`
          : ""
      }`;
  }
}

export function useRutinas() {
  const [rutinas, setRutinas] = useState<Routine[]>([]);
  const [suggestions, setSuggestions] = useState<RoutineSuggestion[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableActions, setAvailableActions] = useState<RoutineAction[]>([]);

  useEffect(() => {
    loadAvailableActions();
    loadRutinas();
  }, []);

  const loadAvailableActions = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/iot/commands");
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped: RoutineAction[] = list.map((c: any) => ({
        id: String(c.id),
        name: String(c.name),
      }));
      setAvailableActions(mapped);
    } catch (e) {
      setAvailableActions([]);
    }
  }, []);

  const mapTriggerFromBackend = (trigger: any): Trigger => {
    const t = String(trigger?.type || "").toLowerCase();
    if (t === "time_based" || t === "relative_time_based") {
      const hour = String(trigger?.hour || "08:00");
      const days = Array.isArray(trigger?.days) ? trigger.days : [];
      const date = trigger?.date ? String(trigger.date) : undefined;
      return { type: "Tiempo", hour, days, date };
    }
    if (t === "event_based") {
      const intent = String(trigger?.intent || "");
      if (intent.includes(":")) {
        const parts = intent.split(":");
        const deviceId = parts[0] || "";
        const event = parts[1] || intent;
        const deviceName =
          DEVICE_OPTIONS.find((d) => d.id === deviceId)?.name || "Evento";
        return { type: "Evento", deviceId, deviceName, event };
      }
      return { type: "NLP", phrase: intent };
    }
    const phrase = String(trigger?.phrase || trigger?.intent || "");
    return { type: "NLP", phrase };
  };

  const mapRoutineFromBackend = (r: any): Routine => {
    const actionsFromCommands: RoutineAction[] = Array.isArray(r?.iot_commands)
      ? r.iot_commands.map((n: any) => ({ id: uuidv4(), name: String(n) }))
      : [];
    const actionsFromTexts: RoutineAction[] = Array.isArray(r?.actions)
      ? r.actions.map((s: any) => {
          const txt = String(s);
          const label = txt.startsWith("tts_speak:")
            ? txt.replace("tts_speak:", "").trim()
            : txt;
          return { id: uuidv4(), name: label };
        })
      : [];
    const actions = [...actionsFromCommands, ...actionsFromTexts];
    return {
      id: String(r.id),
      name: String(r.name || "Rutina"),
      description: String(r.description || ""),
      enabled: Boolean(r.enabled),
      confirmed: Boolean(r.confirmed),
      trigger: mapTriggerFromBackend(r.trigger || {}),
      actions,
      executionsCount: Number(r.execution_count || 0),
      lastExecutedAt: r.last_executed ? String(r.last_executed) : null,
    };
  };

  const loadRutinas = useCallback(async () => {
    try {
      setIsLoadingList(true);
      setError(null);
      // Solo cargar rutinas confirmadas, las no confirmadas son "sugerencias"
      const res = await axiosInstance.get("/nlp/routines?confirmed_only=true");
      const list = Array.isArray(res.data) ? res.data : [];
      setRutinas(list.map(mapRoutineFromBackend));
    } catch (err) {
      setError("Error al cargar las rutinas");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const buildTrigger = useCallback(
    (form: FormState): { trigger: any; trigger_type: string } => {
      if (form.triggerType === "NLP") {
        return {
          trigger: { type: "event_based", intent: form.nlpPhrase.trim() },
          trigger_type: "event_based",
        };
      }
      if (form.triggerType === "Tiempo") {
        if (form.relativeMinutes && form.relativeMinutes > 0) {
          const now = new Date();
          const future = new Date(now.getTime() + form.relativeMinutes * 60000);
          const hh = String(future.getHours()).padStart(2, "0");
          const mm = String(future.getMinutes()).padStart(2, "0");
          return {
            trigger: {
              type: "relative_time_based",
              hour: `${hh}:${mm}`,
            },
            trigger_type: "relative_time_based",
          };
        }
        return {
          trigger: {
            type: "time_based",
            hour: form.timeHour,
            days: form.timeDays,
            date: form.timeDate || undefined,
          },
          trigger_type: "time_based",
        };
      }
      const dev = DEVICE_OPTIONS.find((d) => d.id === form.deviceId)!;
      const cond =
        form.condOperator && form.condValue !== ""
          ? {
              operator: form.condOperator as any,
              value: Number(form.condValue),
            }
          : undefined;
      return {
        trigger: {
          type: "event_based",
          intent: `${form.deviceId}:${form.deviceEvent}`,
          deviceId: form.deviceId,
          event: form.deviceEvent,
          condition: cond,
          deviceName: dev.name,
        },
        trigger_type: "event_based",
      };
    },
    []
  );

  const validateForm = useCallback(
    (form: FormState): { valid: boolean; message?: string } => {
      if (!form.name.trim())
        return { valid: false, message: "El nombre es obligatorio" };
      if (form.triggerType === "NLP" && !form.nlpPhrase.trim())
        return { valid: false, message: "La frase activadora es obligatoria" };
      if (
        form.triggerType === "Tiempo" &&
        form.relativeMinutes <= 0 &&
        form.timeDays.length === 0 &&
        !form.timeDate
      )
        return {
          valid: false,
          message: "Selecciona al menos un día o una fecha",
        };
      if (
        form.actionIds.length === 0 &&
        (!form.ttsMessages || form.ttsMessages.length === 0)
      )
        return {
          valid: false,
          message: "Añade al menos una acción (IoT o voz)",
        };
      return { valid: true };
    },
    []
  );

  const createRutina = useCallback(
    async (form: FormState) => {
      const validation = validateForm(form);
      if (!validation.valid)
        return {
          success: false,
          message: validation.message || "Error de validación",
        };
      try {
        const built = buildTrigger(form);
        const command_ids = form.actionIds
          .map((id) => Number(id))
          .filter((n) => !Number.isNaN(n));
        const actions = (form.ttsMessages || [])
          .map((msg) => msg.trim())
          .filter((msg) => msg.length > 0)
          .map((msg) => `tts_speak:${msg}`);
        const payload = {
          name: form.name.trim(),
          description: form.description.trim(),
          enabled: form.enabled,
          trigger: built.trigger,
          trigger_type: built.trigger_type,
          command_ids,
          actions,
        };
        const res = await axiosInstance.post("/nlp/routines", payload);
        const routine = mapRoutineFromBackend(res.data);
        setRutinas((prev) => [routine, ...prev]);
        return {
          success: true,
          message: "Rutina creada correctamente",
          routine,
        };
      } catch (e: any) {
        return { success: false, message: "Error al crear la rutina" };
      }
    },
    [validateForm, buildTrigger]
  );

  const updateRutina = useCallback(async (id: string, form: FormState) => {
    const validation = validateForm(form);
    if (!validation.valid)
      return {
        success: false,
        message: validation.message || "Error de validación",
      };
    try {
      const built = buildTrigger(form);
      const command_ids = form.actionIds
        .map((id) => Number(id))
        .filter((n) => !Number.isNaN(n));
      const actions = (form.ttsMessages || [])
        .map((msg) => msg.trim())
        .filter((msg) => msg.length > 0)
        .map((msg) => `tts_speak:${msg}`);
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        enabled: form.enabled,
        trigger: built.trigger,
        trigger_type: built.trigger_type,
        command_ids,
        actions,
      };
      const res = await axiosInstance.put(
        `/nlp/routines/${Number(id)}`,
        payload
      );
      const routine = mapRoutineFromBackend(res.data);
      setRutinas((prev) => prev.map((r) => (r.id === id ? routine : r)));
      return { success: true, message: "Rutina actualizada correctamente" };
    } catch (e: any) {
      return { success: false, message: "Error al actualizar la rutina" };
    }
  }, []);

  const deleteRutina = useCallback(async (id: string) => {
    try {
      await axiosInstance.delete(`/nlp/routines/${Number(id)}`);
      setRutinas((prev) => prev.filter((r) => r.id !== id));
      return { success: true, message: "Rutina eliminada correctamente" };
    } catch (e: any) {
      return { success: false, message: "Error al eliminar la rutina" };
    }
  }, []);

  const toggleEnabled = useCallback(async (id: string) => {
    try {
      const res = await axiosInstance.post(
        `/nlp/routines/${Number(id)}/toggle`
      );
      const routine = mapRoutineFromBackend(res.data);
      setRutinas((prev) => prev.map((r) => (r.id === id ? routine : r)));
      return { success: true };
    } catch {
      return { success: false };
    }
  }, []);

  const confirmRutina = useCallback(async (id: string) => {
    try {
      await axiosInstance.post(`/nlp/routines/${Number(id)}/confirm`);
      setRutinas((prev) =>
        prev.map((r) => (r.id === id ? { ...r, confirmed: true } : r))
      );
      return { success: true };
    } catch {
      return { success: false };
    }
  }, []);

  const rejectRutina = useCallback(async (id: string) => {
    try {
      await axiosInstance.post(`/nlp/routines/${Number(id)}/reject`);
      setRutinas((prev) => prev.filter((r) => r.id !== id));
      return { success: true };
    } catch {
      return { success: false };
    }
  }, []);

  const runRutineNow = useCallback(async (id: string) => {
    try {
      const res = await axiosInstance.post(
        `/nlp/routines/${Number(id)}/execute`
      );
      setRutinas((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                executionsCount: r.executionsCount + 1,
                lastExecutedAt: new Date().toISOString(),
              }
            : r
        )
      );
      return {
        success: true,
        message: String(res.data?.message || "Rutina ejecutada correctamente"),
      };
    } catch (e: any) {
      return { success: false, message: "No se pudo ejecutar la rutina" };
    }
  }, []);

  const generateSuggestions = useCallback(async () => {
    try {
      setIsLoadingSuggestions(true);
      setError(null);

      // Primero, obtener las sugerencias existentes (rutinas no confirmadas)
      const res = await axiosInstance.get("/nlp/routines?confirmed_only=false");
      const existingList = Array.isArray(res.data) ? res.data : [];

      // Filtrar solo las no confirmadas
      const unconfirmedRoutines = existingList.filter(
        (r: any) => r.confirmed === false
      );

      // Si ya hay sugerencias, usarlas
      if (unconfirmedRoutines.length > 0) {
        const mapped: RoutineSuggestion[] = unconfirmedRoutines.map(
          (r: any) => ({
            id: String(r.id),
            name: String(r.name || "Rutina"),
            trigger: mapTriggerFromBackend(r.trigger || {}),
            confidence: Number(r.confidence || 0),
            actions: Array.isArray(r.iot_commands)
              ? r.iot_commands.map((n: any) => ({
                  id: uuidv4(),
                  name: String(n),
                }))
              : Array.isArray(r.actions)
              ? r.actions.map((a: any) => ({ id: uuidv4(), name: String(a) }))
              : [],
          })
        );
        setSuggestions(mapped);
      } else {
        // Solo generar nuevas sugerencias si no hay ninguna
        const suggestRes = await axiosInstance.post(
          `/nlp/routines/suggest?min_confidence=${0.5}`
        );
        const list = Array.isArray(suggestRes.data) ? suggestRes.data : [];
        const mapped: RoutineSuggestion[] = list.map((r: any) => ({
          id: String(r.id),
          name: String(r.name || "Rutina"),
          trigger: mapTriggerFromBackend(r.trigger || {}),
          confidence: Number(r.confidence || 0),
          actions: Array.isArray(r.iot_commands)
            ? r.iot_commands.map((n: any) => ({
                id: uuidv4(),
                name: String(n),
              }))
            : Array.isArray(r.actions)
            ? r.actions.map((a: any) => ({ id: uuidv4(), name: String(a) }))
            : [],
        }));
        setSuggestions(mapped);
      }
    } catch (err) {
      setError("Error al generar sugerencias");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const acceptSuggestion = useCallback(
    async (sugg: RoutineSuggestion) => {
      try {
        await axiosInstance.post(`/nlp/routines/${Number(sugg.id)}/confirm`);
        setSuggestions((prev) => prev.filter((s) => s.id !== sugg.id));
        await loadRutinas();
        return { success: true, message: "Sugerencia aceptada" };
      } catch {
        return { success: false, message: "Error al aceptar sugerencia" };
      }
    },
    [loadRutinas]
  );

  const rejectSuggestion = useCallback(async (id: string) => {
    try {
      await axiosInstance.post(`/nlp/routines/${Number(id)}/reject`);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      return { success: true };
    } catch {
      return { success: false };
    }
  }, []);

  const getRoutineById = useCallback(
    (id: string) => rutinas.find((r) => r.id === id),
    [rutinas]
  );

  const getStatistics = useCallback(
    () => ({
      total: rutinas.length,
      enabled: rutinas.filter((r) => r.enabled).length,
      confirmed: rutinas.filter((r) => r.confirmed).length,
      totalExecutions: rutinas.reduce((sum, r) => sum + r.executionsCount, 0),
    }),
    [rutinas]
  );

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
  };
}
