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
  Plus,
  Mic,
} from "lucide-react";
import SimpleButton from "../components/UI/Button";
import SimpleCard from "../components/UI/Card";
import Modal from "../components/UI/Modal";
import { useThemeByTime } from "../hooks/useThemeByTime";
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
      nlpPhrase:
        routine.trigger.type === "NLP" ? routine.trigger.phrase : "",
      timeHour:
        routine.trigger.type === "Tiempo" ? routine.trigger.hour : "08:00",
      timeDays:
        routine.trigger.type === "Tiempo" ? routine.trigger.days : [],
      timeDate:
        routine.trigger.type === "Tiempo"
          ? (routine.trigger as any).date || ""
          : "",
      deviceId:
        routine.trigger.type === "Evento" ? routine.trigger.deviceId : "",
      deviceEvent:
        routine.trigger.type === "Evento" ? routine.trigger.event : "",
      actionIds: routine.actions.map((a) => a.id),
      ttsMessages: routine.actions.map((a) =>
        a.name.replace("tts_speak:", "")
      ),
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
        setIsFormOpen(false);
        setEditingId(null);
        setFormData(INITIAL_FORM);
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
    if (confirm("¿Eliminar esta rutina?")) {
      await deleteRutina(id);
    }
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
                      <div className={`px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        rutina.confirmed
                          ? colors.successChip
                          : colors.warningChip
                      }`}>
                        {rutina.confirmed ? "Confirmada" : "Pendiente"}
                      </div>
                    </div>

                    <p className={`text-sm ${colors.mutedText} mb-2`}>
                      <span className="font-semibold">Disparador:</span>{" "}
                      {describeTrigger(rutina.trigger)}
                    </p>

                    {rutina.actions.length > 0 && (
                      <div>
                        <p className={`text-sm font-semibold mb-1 ${colors.mutedText}`}>
                          Acciones:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {rutina.actions.slice(0, 3).map((action, i) => (
                            <span
                              key={i}
                              className={`text-xs px-2 py-1 rounded ${colors.chipBg}`}
                            >
                              {action.name.replace("tts_speak:", "")}
                            </span>
                          ))}
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
          <div className="flex justify-center">
            <SimpleButton
              onClick={() => generateSuggestions()}
              active
              disabled={isLoadingSuggestions}
            >
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                {isLoadingSuggestions ? "Generando..." : "Generar Sugerencias"}
              </div>
            </SimpleButton>
          </div>

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
                      <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${colors.chipBg}`}>
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
                        if (confirm("¿Descartar?")) {
                          rejectSuggestion(suggestion.id);
                        }
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
        panelClassName="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-6">
          {/* Información General */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">📋 Información General</h3>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}>
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
              <label className={`block text-sm font-semibold mb-2 ${colors.mutedText}`}>
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

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) =>
                  setFormData({ ...formData, enabled: e.target.checked })
                }
                className="w-5 h-5 rounded accent-cyan-500"
              />
              <span className="font-semibold">Habilitar rutina</span>
            </label>
          </div>

          {/* Disparador */}
          <div className={`space-y-4 p-4 rounded-lg ${colors.cardBg}`}>
            <h3 className="text-lg font-semibold">🎙️ Disparador</h3>

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
              <option value="Evento">Evento de dispositivo</option>
            </select>

            {/* NLP */}
            {formData.triggerType === "NLP" && (
              <input
                type="text"
                value={formData.nlpPhrase}
                onChange={(e) =>
                  setFormData({ ...formData, nlpPhrase: e.target.value })
                }
                placeholder='Ej: "Buenas noches"'
                className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
              />
            )}

            {/* Tiempo */}
            {formData.triggerType === "Tiempo" && (
              <div className="space-y-3">
                <input
                  type="time"
                  value={formData.timeHour}
                  onChange={(e) =>
                    setFormData({ ...formData, timeHour: e.target.value })
                  }
                  className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                />

                <div className="grid grid-cols-4 gap-2">
                  {DAY_LABELS.map((day) => (
                    <button
                      key={day}
                      onClick={() => handleToggleDay(day)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                        formData.timeDays.includes(day)
                          ? `bg-gradient-to-r ${colors.primary} text-white`
                          : `${colors.chipBg} ${colors.chipText}`
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>

                <input
                  type="date"
                  value={formData.timeDate}
                  onChange={(e) =>
                    setFormData({ ...formData, timeDate: e.target.value })
                  }
                  className={`w-full px-4 py-2 rounded-lg ${colors.inputBg} ${colors.inputBorder} border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${colors.text}`}
                />
              </div>
            )}

            {/* Evento */}
            {formData.triggerType === "Evento" && (
              <div className="space-y-3">
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

                {selectedDevice && (
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
                )}

                <div className="grid grid-cols-2 gap-2">
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
            )}
          </div>

          {/* Acciones */}
          <div className={`space-y-3 p-4 rounded-lg ${colors.cardBg}`}>
            <h3 className="text-lg font-semibold">⚡ Acciones</h3>

            {availableActions.length > 0 && (
              <div>
                <p className={`text-sm font-semibold mb-2 ${colors.mutedText}`}>
                  Comandos IoT
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {availableActions.map((action) => (
                    <label
                      key={action.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-slate-700/30 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.actionIds.includes(action.id)}
                        onChange={() => handleToggleAction(action.id)}
                        className="w-4 h-4 rounded accent-cyan-500"
                      />
                      <span className="text-sm">{action.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className={`text-sm font-semibold mb-2 ${colors.mutedText}`}>
                Mensajes de voz
              </p>
              <div className="flex gap-2 mb-2">
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
                  className={`px-4 py-2 rounded-lg font-semibold ${colors.chipBg} hover:bg-slate-700/60`}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {formData.ttsMessages.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {formData.ttsMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2 rounded-lg ${colors.chipBg}`}
                    >
                      <span className="text-sm flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        {msg}
                      </span>
                      <button
                        onClick={() => handleRemoveTtsMessage(i)}
                        className="hover:text-red-400"
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
          <div className="flex gap-3 justify-end">
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
    </div>
  );
}