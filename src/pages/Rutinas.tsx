"use client";

import { useState } from "react";
import PageHeader from "../components/UI/PageHeader";
import {
  ListTodo,
  PlusCircle,
  Wand2,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  ShieldCheck,
  Zap,
  AlertCircle,
  X,
  Mic,
  Wifi,
} from "lucide-react";
import SimpleButton from "../components/UI/Button";
import SimpleCard from "../components/UI/Card";
import Modal from "../components/UI/Modal";
import ConfirmModal from "../components/UI/ConfirmModal";
import ToastContainer from "../components/UI/ToastContainer";
import { useThemeByTime } from "../hooks/useThemeByTime";
import { useToast } from "../hooks/useToast";
import {
  useRutinas,
  type FormState,
  DEVICE_OPTIONS,
  DAY_LABELS,
} from "../hooks/useRutinas";

type Section = "rutinas" | "sugerencias";
type FilterStatus = "todos" | "confirmadas" | "noConfirmadas";

export default function Rutinas() {
  const { colors } = useThemeByTime();
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const {
    rutinas,
    suggestions,
    availableActions,
    isLoadingList,
    isLoadingSuggestions,
    INITIAL_FORM,
    createRutina,
    updateRutina,
    deleteRutina,
    toggleEnabled,
    confirmRutina,
    rejectRutina,
    runRutineNow,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    getRoutineById,
    describeTrigger,
  } = useRutinas();

  const [activeSection, setActiveSection] = useState<Section>("rutinas");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("todos");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [isSavingForm, setIsSavingForm] = useState(false);

  // Estado para el modal de confirmación
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "danger",
  });

  const filteredRutinas = rutinas.filter((r) => {
    if (filterStatus === "confirmadas") return r.confirmed;
    if (filterStatus === "noConfirmadas") return !r.confirmed;
    return true;
  });

  const handleNewRoutine = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setIsFormOpen(true);
  };

  const handleEditRoutine = (id: string) => {
    const routine = getRoutineById(id);
    if (!routine) return;

    const mapped: FormState = {
      ...INITIAL_FORM,
      name: routine.name,
      description: routine.description,
      enabled: routine.enabled,
      triggerType:
        routine.trigger.type === "NLP"
          ? "NLP"
          : routine.trigger.type === "Tiempo"
          ? "Tiempo"
          : "Evento",
      nlpPhrase: routine.trigger.type === "NLP" ? routine.trigger.phrase : "",
      timeHour:
        routine.trigger.type === "Tiempo" ? routine.trigger.hour : "08:00",
      timeDays: routine.trigger.type === "Tiempo" ? routine.trigger.days : [],
      timeDate:
        routine.trigger.type === "Tiempo"
          ? (routine.trigger as any).date || ""
          : "",
      deviceId:
        routine.trigger.type === "Evento" ? routine.trigger.deviceId : "",
      deviceEvent:
        routine.trigger.type === "Evento" ? routine.trigger.event : "",
      // Separar acciones IoT de mensajes TTS
      // Buscar IDs de comandos IoT comparando nombres con availableActions
      // Las acciones TTS empiezan con "tts_speak:"
      actionIds: routine.actions
        .filter((a) => !a.name.startsWith("tts_speak:"))
        .map((a) => {
          // Buscar el ID real del comando IoT por nombre
          const matchedAction = availableActions.find(
            (avail) => avail.name.toLowerCase() === a.name.toLowerCase()
          );
          return matchedAction?.id || a.id;
        })
        .filter((id) => availableActions.some((a) => a.id === id)),
      ttsMessages: routine.actions
        .filter((a) => a.name.startsWith("tts_speak:"))
        .map((a) => a.name.replace("tts_speak:", "").trim()),
    };

    setFormData(mapped);
    setEditingId(id);
    setIsFormOpen(true);
  };

  const handleSaveRoutine = async () => {
    setIsSavingForm(true);
    try {
      const result = editingId
        ? await updateRutina(editingId, formData)
        : await createRutina(formData);

      if (result.success) {
        showSuccess(result.message || "Rutina guardada correctamente");
        setIsFormOpen(false);
        setEditingId(null);
        setFormData(INITIAL_FORM);
      } else {
        showError(result.message || "Error al guardar la rutina");
      }
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleAddTtsMessage = () => {
    if (formData.ttsInput.trim()) {
      setFormData({
        ...formData,
        ttsMessages: [...formData.ttsMessages, formData.ttsInput],
        ttsInput: "",
      });
    }
  };

  const handleRemoveTtsMessage = (index: number) => {
    setFormData({
      ...formData,
      ttsMessages: formData.ttsMessages.filter((_, i) => i !== index),
    });
  };

  const handleToggleDay = (day: string) => {
    setFormData({
      ...formData,
      timeDays: formData.timeDays.includes(day)
        ? formData.timeDays.filter((d) => d !== day)
        : [...formData.timeDays, day],
    });
  };

  const handleToggleAction = (actionId: string) => {
    setFormData({
      ...formData,
      actionIds: formData.actionIds.includes(actionId)
        ? formData.actionIds.filter((id) => id !== actionId)
        : [...formData.actionIds, actionId],
    });
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar rutina",
      message:
        "¿Estás seguro de eliminar esta rutina? Esta acción no se puede deshacer.",
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const result = await deleteRutina(id);
        if (result.success) {
          showSuccess("Rutina eliminada correctamente");
        } else {
          showError("Error al eliminar la rutina");
        }
      },
    });
  };

  const selectedDevice = DEVICE_OPTIONS.find((d) => d.id === formData.deviceId);

  return (
    <div
      className={`p-2 md:p-4 pt-8 md:pt-3 space-y-6 font-inter ${colors.background} ${colors.text} min-h-screen`}
    >
      <PageHeader
        title="Rutinas"
        icon={<ListTodo className={`w-8 md:w-10 h-8 md:h-10 ${colors.icon}`} />}
      />

      {/* Controles */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-3">
          <button
            onClick={() => setActiveSection("rutinas")}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeSection === "rutinas"
                ? `bg-gradient-to-r ${colors.primary} text-white shadow-lg`
                : `${colors.cardBg} ${colors.text} border ${colors.cardHover}`
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Rutinas
          </button>
          <button
            onClick={() => {
              setActiveSection("sugerencias");
              if (suggestions.length === 0) {
                generateSuggestions();
              }
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeSection === "sugerencias"
                ? `bg-gradient-to-r ${colors.primary} text-white shadow-lg`
                : `${colors.cardBg} ${colors.text} border ${colors.cardHover}`
            }`}
          >
            <Wand2 className="w-4 h-4" />
            Sugerencias
          </button>
        </div>

        <SimpleButton onClick={handleNewRoutine} active>
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Crear Rutina
          </div>
        </SimpleButton>
      </div>

      {/* Filtros */}
      {activeSection === "rutinas" && (
        <div className="flex gap-2 flex-wrap">
          {(["todos", "confirmadas", "noConfirmadas"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  filterStatus === status
                    ? `bg-gradient-to-r ${colors.primary} text-white`
                    : `${colors.chipBg} ${colors.chipText} border ${colors.cardHover}`
                }`}
              >
                {status === "todos" && "Todos"}
                {status === "confirmadas" && (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmadas
                  </>
                )}
                {status === "noConfirmadas" && (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Sin confirmar
                  </>
                )}
              </button>
            )
          )}
        </div>
      )}

      {/* Contenido Rutinas */}
      {activeSection === "rutinas" && (
        <div className="space-y-4">
          {isLoadingList ? (
            <SimpleCard className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-slate-400 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
              <p className={colors.mutedText}>Cargando rutinas...</p>
            </SimpleCard>
          ) : filteredRutinas.length === 0 ? (
            <SimpleCard className="p-8 text-center">
              <AlertCircle
                className={`w-12 h-12 mx-auto mb-3 ${colors.mutedText}`}
              />
              <p className={`${colors.mutedText} mb-2`}>
                No hay rutinas disponibles
              </p>
            </SimpleCard>
          ) : (
            filteredRutinas.map((rutina) => (
              <SimpleCard
                key={rutina.id}
                className={`p-4 ${!rutina.enabled ? "opacity-60" : ""}`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-bold truncate`}>
                          {rutina.name}
                        </h3>
                        {rutina.description && (
                          <p className={`text-sm ${colors.mutedText}`}>
                            {rutina.description}
                          </p>
                        )}
                      </div>
                      <div
                        className={`px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                          rutina.confirmed
                            ? colors.successChip
                            : colors.warningChip
                        }`}
                      >
                        {rutina.confirmed ? "Confirmada" : "Pendiente"}
                      </div>
                    </div>

                    <p className={`text-sm ${colors.mutedText} mb-2`}>
                      <span className="font-semibold">Disparador:</span>{" "}
                      {describeTrigger(rutina.trigger)}
                    </p>

                    {rutina.actions.length > 0 && (
                      <div>
                        <p
                          className={`text-sm font-semibold mb-1 ${colors.mutedText}`}
                        >
                          Acciones:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {rutina.actions.slice(0, 3).map((action, i) => {
                            const isTTS = action.name.startsWith("tts_speak:");
                            const displayName = isTTS
                              ? action.name.replace("tts_speak:", "").trim()
                              : action.name;
                            return (
                              <span
                                key={i}
                                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${colors.chipBg}`}
                              >
                                {isTTS ? (
                                  <Mic className="w-3 h-3" />
                                ) : (
                                  <Wifi className="w-3 h-3" />
                                )}
                                {displayName}
                              </span>
                            );
                          })}
                          {rutina.actions.length > 3 && (
                            <span
                              className={`text-xs px-2 py-1 rounded ${colors.chipBg}`}
                            >
                              +{rutina.actions.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end md:justify-start md:flex-nowrap">
                    <button
                      onClick={() => runRutineNow(rutina.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${colors.chipBg} hover:bg-slate-700/60 flex items-center gap-1`}
                    >
                      <Zap className="w-4 h-4" />
                      <span className="hidden sm:inline">Ejecutar</span>
                    </button>

                    <button
                      onClick={() => handleEditRoutine(rutina.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${colors.chipBg} hover:bg-slate-700/60 flex items-center gap-1`}
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    {!rutina.confirmed && (
                      <>
                        <button
                          onClick={() => confirmRutina(rutina.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold ${colors.successChip} hover:opacity-80 flex items-center gap-1`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Confirmar</span>
                        </button>
                        <button
                          onClick={() => rejectRutina(rutina.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold ${colors.dangerChip} hover:opacity-80 flex items-center gap-1`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span className="hidden sm:inline">Rechazar</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDelete(rutina.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${colors.dangerChip} hover:opacity-80 flex items-center gap-1`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>

                    <button
                      onClick={() => toggleEnabled(rutina.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${
                        rutina.enabled
                          ? `bg-gradient-to-r ${colors.primary} text-white`
                          : `${colors.chipBg} hover:bg-slate-700/60`
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {rutina.enabled ? "Activa" : "Inactiva"}
                      </span>
                    </button>
                  </div>
                </div>
              </SimpleCard>
            ))
          )}
        </div>
      )}

      {/* Contenido Sugerencias */}
      {activeSection === "sugerencias" && (
        <div className="space-y-4">
          {isLoadingSuggestions && suggestions.length === 0 ? (
            <SimpleCard className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-slate-400 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
              <p className={colors.mutedText}>Generando sugerencias...</p>
            </SimpleCard>
          ) : suggestions.length === 0 ? (
            <SimpleCard className="p-8 text-center">
              <Wand2 className={`w-12 h-12 mx-auto mb-3 ${colors.mutedText}`} />
              <p className={colors.mutedText}>No hay sugerencias</p>
            </SimpleCard>
          ) : (
            suggestions.map((suggestion) => (
              <SimpleCard key={suggestion.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-bold`}>
                          {suggestion.name}
                        </h3>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded whitespace-nowrap ${colors.chipBg}`}
                      >
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>

                    <p className={`text-sm ${colors.mutedText} mb-2`}>
                      {describeTrigger(suggestion.trigger)}
                    </p>

                    {suggestion.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {suggestion.actions.map((action, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${colors.chipBg}`}
                          >
                            <Zap className="w-3 h-3" />
                            {action.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          suggestion.confidence >= 0.7
                            ? "bg-green-500"
                            : suggestion.confidence >= 0.5
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{
                          width: `${suggestion.confidence * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end md:flex-col md:justify-start">
                    <button
                      onClick={() => acceptSuggestion(suggestion)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${colors.successChip} hover:opacity-80`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Aceptar</span>
                    </button>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "Descartar sugerencia",
                          message: "¿Deseas descartar esta sugerencia?",
                          variant: "warning",
                          onConfirm: () => {
                            setConfirmModal((prev) => ({
                              ...prev,
                              isOpen: false,
                            }));
                            rejectSuggestion(suggestion.id);
                          },
                        });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${colors.dangerChip} hover:opacity-80`}
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Rechazar</span>
                    </button>
                  </div>
                </div>
              </SimpleCard>
            ))
          )}
        </div>
      )}

      {/* Modal Formulario */}
      <Modal
        title={editingId ? "Editar Rutina" : "Crear Rutina"}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingId(null);
          setFormData(INITIAL_FORM);
        }}
        panelClassName="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600 scrollbar-track-transparent"
      >
        <div className="space-y-6 pr-1">
          {/* Información General */}
          <div className="space-y-4 pb-4 border-b border-slate-700/50">
            <h3
              className={`text-base font-bold flex items-center gap-2 ${colors.text}`}
            >
              <ListTodo className="w-5 h-5" />
              Información General
            </h3>

            <div>
              <label
                className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
              >
                Nombre de la rutina
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Buenas noches"
                className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
              />
            </div>

            <div>
              <label
                className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
              >
                Descripción (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe qué hace esta rutina..."
                className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text} h-20 resize-none`}
              />
            </div>

            <button
              onClick={() =>
                setFormData({ ...formData, enabled: !formData.enabled })
              }
              className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                formData.enabled
                  ? `bg-gradient-to-r ${colors.primary} text-white`
                  : `${colors.chipBg} ${colors.chipText} hover:bg-slate-700/60`
              }`}
            >
              {formData.enabled ? "Habilitada" : "Deshabilitada"}
            </button>
          </div>

          {/* Disparador */}
          <div className="space-y-4 pb-4 border-b border-slate-700/50">
            <h3
              className={`text-base font-bold flex items-center gap-2 ${colors.text}`}
            >
              <Mic className="w-5 h-5" />
              Disparador
            </h3>

            <div>
              <label
                className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
              >
                Tipo de activación
              </label>
              <select
                value={formData.triggerType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerType: e.target.value as any,
                  })
                }
                className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
              >
                <option value="NLP">Comando de voz</option>
                <option value="Tiempo">Programado</option>
              </select>
            </div>

            {/* NLP */}
            {formData.triggerType === "NLP" && (
              <div>
                <label
                  className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                >
                  ¿Qué frase activará esta rutina?
                </label>
                <input
                  type="text"
                  value={formData.nlpPhrase}
                  onChange={(e) =>
                    setFormData({ ...formData, nlpPhrase: e.target.value })
                  }
                  placeholder='Ej: "Buenas noches"'
                  className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                />
              </div>
            )}

            {/* Tiempo */}
            {formData.triggerType === "Tiempo" &&
              (() => {
                // Preseleccionar día y fecha actual si están vacíos
                const today = new Date();
                const currentDateStr = today.toISOString().split("T")[0];

                // Estado local para modo de tiempo
                const useRelativeTime = formData.relativeMinutes > 0;

                return (
                  <div className="space-y-4">
                    {/* Selector de modo de tiempo */}
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                      >
                        ¿Cuándo ejecutar?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, relativeMinutes: 0 })
                          }
                          className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                            !useRelativeTime
                              ? `bg-gradient-to-r ${colors.primary} text-white`
                              : `${colors.chipBg} ${colors.chipText}`
                          }`}
                        >
                          Hora específica
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              relativeMinutes: 5,
                              timeHour: "",
                            })
                          }
                          className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                            useRelativeTime
                              ? `bg-gradient-to-r ${colors.primary} text-white`
                              : `${colors.chipBg} ${colors.chipText}`
                          }`}
                        >
                          En X minutos
                        </button>
                      </div>
                    </div>

                    {/* Opciones de tiempo relativo */}
                    {useRelativeTime && (
                      <div>
                        <label
                          className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                        >
                          Ejecutar en:
                        </label>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {[5, 10, 15, 30].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  relativeMinutes: mins,
                                })
                              }
                              className={`py-2 px-2 rounded-lg text-sm font-semibold transition-all ${
                                formData.relativeMinutes === mins
                                  ? `bg-gradient-to-r ${colors.primary} text-white`
                                  : `${colors.chipBg} ${colors.chipText}`
                              }`}
                            >
                              {mins} min
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            value={formData.relativeMinutes}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                relativeMinutes: parseInt(e.target.value) || 0,
                              })
                            }
                            className={`flex-1 px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                          />
                          <span className={`text-sm ${colors.mutedText}`}>
                            minutos
                          </span>
                        </div>
                        <p className={`text-xs mt-1 ${colors.mutedText}`}>
                          Se ejecutará a las{" "}
                          {(() => {
                            const execTime = new Date(
                              Date.now() + formData.relativeMinutes * 60 * 1000
                            );
                            return execTime.toLocaleTimeString("es-PE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          })()}
                        </p>
                      </div>
                    )}

                    {/* Hora específica */}
                    {!useRelativeTime && (
                      <div>
                        <label
                          className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                        >
                          Hora
                        </label>
                        <input
                          type="time"
                          value={formData.timeHour}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timeHour: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                        />
                      </div>
                    )}

                    {/* Días */}
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                      >
                        Días
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {DAY_LABELS.map((day) => {
                          const isSelected = formData.timeDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleToggleDay(day)}
                              className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                  ? `bg-gradient-to-r ${colors.primary} text-white`
                                  : `${colors.chipBg} ${colors.chipText}`
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                      {formData.timeDays.length === 0 && (
                        <p
                          className={`text-xs mt-2 ${colors.mutedText} italic`}
                        >
                          Se ejecutará todos los días
                        </p>
                      )}
                    </div>

                    {/* Fecha */}
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                      >
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={formData.timeDate || currentDateStr}
                        onChange={(e) =>
                          setFormData({ ...formData, timeDate: e.target.value })
                        }
                        className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                      />
                    </div>
                  </div>
                );
              })()}

            {/* Evento */}
            {formData.triggerType === "Evento" && (
              <div className="space-y-3">
                <div>
                  <label
                    className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                  >
                    Dispositivo
                  </label>
                  <select
                    value={formData.deviceId}
                    onChange={(e) =>
                      setFormData({ ...formData, deviceId: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                  >
                    {DEVICE_OPTIONS.map((dev) => (
                      <option key={dev.id} value={dev.id}>
                        {dev.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDevice && (
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                    >
                      Evento
                    </label>
                    <select
                      value={formData.deviceEvent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deviceEvent: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                    >
                      {selectedDevice.events.map((event) => (
                        <option key={event} value={event}>
                          {event}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                    >
                      Operador
                    </label>
                    <select
                      value={formData.condOperator}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condOperator: e.target.value as any,
                        })
                      }
                      className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                    >
                      <option value="">Sin condición</option>
                      <option value=">">Mayor que</option>
                      <option value="<">Menor que</option>
                      <option value="=">Igual a</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}
                    >
                      Valor
                    </label>
                    <input
                      type="number"
                      value={formData.condValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condValue: e.target.value
                            ? Number(e.target.value)
                            : "",
                        })
                      }
                      placeholder="0"
                      className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="space-y-4 pb-4 border-b border-slate-700/50">
            <h3
              className={`text-base font-bold flex items-center gap-2 ${colors.text}`}
            >
              <Zap className="w-5 h-5" />
              Acciones
            </h3>

            {availableActions.length > 0 && (
              <div>
                <p className={`text-sm font-semibold mb-3 ${colors.mutedText}`}>
                  Comandos IoT a ejecutar
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                  {availableActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleToggleAction(action.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg font-medium transition-all border ${
                        formData.actionIds.includes(action.id)
                          ? `bg-gradient-to-r ${colors.primary} text-white border-transparent shadow-lg`
                          : `${colors.cardBg} ${colors.text} border-slate-700/50 hover:border-slate-600/80 hover:bg-slate-800/40`
                      }`}
                    >
                      <span className="text-sm flex items-center gap-2">
                        <Wifi className="w-4 h-4" />
                        {action.name}
                      </span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          formData.actionIds.includes(action.id)
                            ? "border-white bg-white/20"
                            : "border-slate-500"
                        }`}
                      >
                        {formData.actionIds.includes(action.id) && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className={`text-sm font-semibold mb-3 ${colors.mutedText}`}>
                Mensajes de voz
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={formData.ttsInput}
                  onChange={(e) =>
                    setFormData({ ...formData, ttsInput: e.target.value })
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAddTtsMessage();
                  }}
                  placeholder='Ej: "Buenas noches"'
                  className={`flex-1 px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                />
                <button
                  onClick={handleAddTtsMessage}
                  className="px-4 py-2 rounded-lg font-semibold bg-cyan-500 hover:bg-cyan-600 text-white transition-all"
                >
                  Añadir
                </button>
              </div>

              {formData.ttsMessages.length > 0 && (
                <div className="space-y-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                  {formData.ttsMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg ${colors.chipBg}`}
                    >
                      <span className="text-sm flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        {msg}
                      </span>
                      <button
                        onClick={() => handleRemoveTtsMessage(i)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => {
                setIsFormOpen(false);
                setEditingId(null);
                setFormData(INITIAL_FORM);
              }}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${colors.chipBg} hover:bg-slate-700/60`}
            >
              Cancelar
            </button>
            <SimpleButton
              onClick={handleSaveRoutine}
              disabled={isSavingForm}
              active
            >
              {isSavingForm
                ? "Guardando..."
                : editingId
                ? "Actualizar"
                : "Crear Rutina"}
            </SimpleButton>
          </div>
        </div>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
