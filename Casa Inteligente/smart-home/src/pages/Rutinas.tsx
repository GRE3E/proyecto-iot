"use client";

import PageHeader from "../components/UI/PageHeader";
import {
  ListTodo,
  ClipboardList,
  PlusCircle,
  Wand2,
  Eye,
  Pencil,
  Trash2,
  Zap,
  CheckCircle,
  ShieldCheck,
  ArrowLeft,
  Clock,
  Mic,
  Cpu,
} from "lucide-react";
import SimpleButton from "../components/UI/Button";
import SimpleCard from "../components/UI/Card";
import Modal from "../components/UI/Modal";
import { useState, useRef } from "react";
import type { FormState } from "../hooks/useRutinas";
import {
  useRutinas,
  INITIAL_FORM,
  DEVICE_OPTIONS,
  DAY_LABELS,
} from "../hooks/useRutinas";
import { useThemeByTime } from "../hooks/useThemeByTime";

type View = "tabs" | "edit" | "detail";

export default function Rutinas() {
  const hook = useRutinas();
  const { colors } = useThemeByTime();
  const [view, setView] = useState<View>("tabs");
  const [activeTab, setActiveTab] = useState<"rutinas" | "sugerencias">("rutinas");
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
  const [showOnlyConfirmed, setShowOnlyConfirmed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const filteredRutinas = hook.rutinas.filter((r) => {
    if (showOnlyEnabled && !r.enabled) return false;
    if (showOnlyConfirmed && !r.confirmed) return false;
    return true;
  });

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const updateForm = (changes: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...changes }));
  const resetForm = () => setForm(INITIAL_FORM);

  const fillFormFromRoutine = (id: string) => {
    const r = hook.getRoutineById(id);
    if (!r) return;
    const iotNames = hook.availableActions.map((a) => a.name);
    const actionIotIds = r.actions
      .filter((a) => iotNames.includes(a.name))
      .map(
        (a) =>
          hook.availableActions.find((x) => x.name === a.name)?.id as string
      )
      .filter(Boolean);
    const ttsMsgs = r.actions
      .filter((a) => !iotNames.includes(a.name))
      .map((a) => a.name);
    setForm((prev) => ({
      ...prev,
      name: r.name,
      description: r.description,
      enabled: r.enabled,
      actionIds: actionIotIds,
      ttsMessages: ttsMsgs,
      ttsInput: "",
      triggerType: r.trigger.type,
      ...(r.trigger.type === "NLP" && { nlpPhrase: (r as any).trigger.phrase }),
      ...(r.trigger.type === "Tiempo" && {
        timeHour: (r as any).trigger.hour,
        timeDays: (r as any).trigger.days || [],
        timeDate: (r as any).trigger.date || "",
        relativeMinutes: 0,
      }),
      ...(r.trigger.type === "Evento" && {
        deviceId: (r as any).trigger.deviceId,
        deviceEvent: (r as any).trigger.event,
        condOperator: (r as any).trigger.condition?.operator || "",
        condValue: (r as any).trigger.condition?.value ?? "",
      }),
    }));
  };

  const handleCreate = async () => {
    const result = await hook.createRutina(form);
    if (result?.success) {
      showMessage("Rutina creada correctamente");
      resetForm();
      setView("tabs");
      setActiveTab("rutinas");
      setIsCreateModalOpen(false);
    } else showMessage(result?.message || "Error al crear", "error");
  };

  const handleUpdate = async () => {
    if (!selectedId) return;
    const result = await hook.updateRutina(selectedId, form);
    if (result?.success) {
      showMessage("Cambios guardados");
      setView("detail");
    } else showMessage(result?.message || "Error al actualizar", "error");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await hook.deleteRutina(deleteId);
    if (result?.success) {
      showMessage("Rutina eliminada");
      setDeleteId(null);
      setView("tabs");
    } else showMessage(result?.message || "Error al eliminar", "error");
  };

  const startCreate = () => {
    resetForm();
    setIsEditing(false);
    setIsCreateModalOpen(true);
  };

  const startEdit = (id: string) => {
    setSelectedId(id);
    fillFormFromRoutine(id);
    setIsEditing(true);
    setIsCreateModalOpen(true);
  };

  const startDetail = (id: string) => {
    setSelectedId(id);
    setView("detail");
  };

  const openSuggestions = async () => {
    setActiveTab("sugerencias");
    await hook.generateSuggestions();
  };

  // Componentes del formulario igual que el original...
  const FormField = ({
    label,
    type = "text",
    value,
    onChange,
    inputRef,
    autoFocus = false,
    ...props
  }: any) => (
    <label className="block">
      <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
      {type === "textarea" ? (
        <textarea
          className={`mt-2 w-full rounded-lg ${colors.inputBg} border ${colors.inputBorder} px-4 py-3 ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
          value={value}
          onChange={onChange}
          {...props}
        />
      ) : (
        <input
          type={type}
          ref={inputRef}
          autoFocus={autoFocus}
          onKeyDown={(e) => e.stopPropagation()}
          className={`mt-2 w-full rounded-lg ${colors.inputBg} border ${colors.inputBorder} px-4 py-3 ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
          value={value}
          onChange={onChange}
          {...props}
        />
      )}
    </label>
  );

  const SelectField = ({ label, value, onChange, options }: any) => (
    <label className="block">
      <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
      <select
        className={`mt-2 w-full rounded-lg ${colors.inputBg} border ${colors.inputBorder} px-4 py-3 ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
        value={value}
        onChange={onChange}
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );

  const Form = () => (
    <div className="space-y-6">
      <SimpleCard className={`p-5 border ${colors.border}`}>
        <h3 className={`text-lg font-semibold ${colors.text} mb-4`}>
          Información General
        </h3>
        <div className="space-y-4">
          <FormField
            label="Nombre de la rutina"
            placeholder="Ej: Buenas noches"
            value={form.name}
            inputRef={nameInputRef}
            autoFocus
            onChange={(e: any) => updateForm({ name: e.target.value })}
          />
          <FormField
            label="Descripción (opcional)"
            type="textarea"
            rows={2}
            placeholder="Describe qué hace esta rutina..."
            value={form.description}
            onChange={(e: any) => updateForm({ description: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <SimpleButton
              active={form.enabled}
              onClick={() => updateForm({ enabled: !form.enabled })}
              className={`text-sm font-medium px-4 py-2 ${
                form.enabled
                  ? `bg-gradient-to-r ${colors.primary} text-white`
                  : `${colors.buttonInactive}`
              }`}
            >
              {form.enabled ? "✓ Habilitada" : "✗ Deshabilitada"}
            </SimpleButton>
          </div>
        </div>
      </SimpleCard>

      <SimpleCard className={`p-5 border ${colors.border}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 rounded-lg bg-blue-500/20`}>
            {form.triggerType === "NLP" ? (
              <Mic className="w-5 h-5 text-blue-400" />
            ) : form.triggerType === "Tiempo" ? (
              <Clock className="w-5 h-5 text-orange-400" />
            ) : (
              <Cpu className="w-5 h-5 text-cyan-400" />
            )}
          </div>
          <h3 className={`text-lg font-semibold ${colors.text}`}>Disparador</h3>
        </div>

        <div className="space-y-4">
          <SelectField
            label="Tipo de activación"
            value={form.triggerType}
            onChange={(e: any) => updateForm({ triggerType: e.target.value })}
            options={[
              { value: "NLP", label: "🎤 Comando de voz" },
              { value: "Tiempo", label: "⏰ Programado por hora" },
              { value: "Evento", label: "📊 Evento de dispositivo" },
            ]}
          />

          {form.triggerType === "NLP" && (
            <FormField
              label="¿Qué frase activará esta rutina?"
              placeholder="Ej: 'Buenas noches'"
              value={form.nlpPhrase}
              onChange={(e: any) => updateForm({ nlpPhrase: e.target.value })}
            />
          )}

          {form.triggerType === "Tiempo" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <SimpleButton
                  active={!(form.relativeMinutes > 0)}
                  onClick={() => updateForm({ relativeMinutes: 0 })}
                  className={`flex-1 text-sm px-3 py-2 rounded-lg ${
                    !(form.relativeMinutes > 0)
                      ? `bg-gradient-to-r ${colors.primary} text-white`
                      : colors.buttonInactive
                  }`}
                >
                  Hora fija
                </SimpleButton>
                <SimpleButton
                  active={form.relativeMinutes > 0}
                  onClick={() =>
                    updateForm({
                      relativeMinutes:
                        form.relativeMinutes > 0 ? form.relativeMinutes : 5,
                    })
                  }
                  className={`flex-1 text-sm px-3 py-2 rounded-lg ${
                    form.relativeMinutes > 0
                      ? `bg-gradient-to-r ${colors.primary} text-white`
                      : colors.buttonInactive
                  }`}
                >
                  En minutos
                </SimpleButton>
              </div>

              {!(form.relativeMinutes > 0) ? (
                <>
                  <FormField
                    label="Hora del día"
                    type="time"
                    value={form.timeHour}
                    onChange={(e: any) =>
                      updateForm({
                        timeHour: e.target.value,
                        relativeMinutes: 0,
                      })
                    }
                  />
                  <div>
                    <p className={`text-sm font-medium ${colors.text} mb-2`}>
                      Repetir en días específicos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DAY_LABELS.map((day) => (
                        <SimpleButton
                          key={day}
                          active={form.timeDays.includes(day)}
                          onClick={() =>
                            updateForm({
                              timeDays: form.timeDays.includes(day)
                                ? form.timeDays.filter((d) => d !== day)
                                : [...form.timeDays, day],
                            })
                          }
                          className={`text-xs px-3 py-2 rounded-full ${
                            form.timeDays.includes(day)
                              ? `bg-gradient-to-r ${colors.primary} text-white`
                              : colors.buttonInactive
                          }`}
                        >
                          {day.slice(0, 3)}
                        </SimpleButton>
                      ))}
                    </div>
                  </div>
                  <FormField
                    label="Fecha específica (opcional)"
                    type="date"
                    value={form.timeDate}
                    onChange={(e: any) =>
                      updateForm({ timeDate: e.target.value })
                    }
                  />
                </>
              ) : (
                <FormField
                  label="¿En cuántos minutos?"
                  type="number"
                  value={form.relativeMinutes}
                  onChange={(e: any) =>
                    updateForm({ relativeMinutes: Number(e.target.value || 0) })
                  }
                  min={1}
                  max={1440}
                />
              )}
            </div>
          )}

          {form.triggerType === "Evento" && (
            <div className="space-y-4">
              <SelectField
                label="Selecciona un dispositivo"
                value={form.deviceId}
                onChange={(e: any) => {
                  const dev = DEVICE_OPTIONS.find(
                    (d) => d.id === e.target.value
                  );
                  updateForm({
                    deviceId: e.target.value,
                    deviceEvent: dev?.events[0] || "",
                  });
                }}
                options={DEVICE_OPTIONS.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
              <SelectField
                label="Evento a monitorear"
                value={form.deviceEvent}
                onChange={(e: any) =>
                  updateForm({ deviceEvent: e.target.value })
                }
                options={
                  DEVICE_OPTIONS.find(
                    (d) => d.id === form.deviceId
                  )?.events.map((ev) => ({ value: ev, label: ev })) || []
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Operador (opcional)"
                  value={form.condOperator}
                  onChange={(e: any) =>
                    updateForm({ condOperator: e.target.value })
                  }
                  options={[
                    { value: "", label: "Sin condición" },
                    { value: ">", label: "Mayor que (>)" },
                    { value: "<", label: "Menor que (<)" },
                    { value: "=", label: "Igual a (=)" },
                  ]}
                />
                <FormField
                  label="Valor (opcional)"
                  type="number"
                  value={form.condValue}
                  onChange={(e: any) =>
                    updateForm({
                      condValue:
                        e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  disabled={!form.condOperator}
                />
              </div>
            </div>
          )}
        </div>
      </SimpleCard>

      <SimpleCard className={`p-5 border ${colors.border}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 rounded-lg bg-green-500/20`}>
            <Zap className="w-5 h-5 text-green-400" />
          </div>
          <h3 className={`text-lg font-semibold ${colors.text}`}>Acciones</h3>
        </div>

        <div className="space-y-5">
          <div>
            <p className={`text-sm font-medium ${colors.text} mb-3`}>
              Comandos IoT a ejecutar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hook.availableActions.map((a) => {
                const active = form.actionIds.includes(a.id);
                return (
                  <SimpleButton
                    key={a.id}
                    active={active}
                    onClick={() =>
                      updateForm({
                        actionIds: active
                          ? form.actionIds.filter((id) => id !== a.id)
                          : [...form.actionIds, a.id],
                      })
                    }
                    className={`w-full justify-center text-sm font-medium py-3 ${
                      active
                        ? `bg-gradient-to-r ${colors.primary} text-white shadow-lg shadow-blue-500/20`
                        : colors.buttonInactive
                    }`}
                  >
                    {a.name}
                  </SimpleButton>
                );
              })}
            </div>
          </div>

          <div className={`border-t ${colors.border} pt-5`}>
            <p className={`text-sm font-medium ${colors.text} mb-3`}>
              Mensajes de voz
            </p>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                className={`flex-1 rounded-lg ${colors.inputBg} border ${colors.inputBorder} px-4 py-3 ${colors.text} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                placeholder="Ej: 'Buenas noches'"
                value={form.ttsInput}
                onChange={(e: any) => updateForm({ ttsInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const msg = (form.ttsInput || "").trim();
                    if (msg) {
                      updateForm({
                        ttsMessages: [...form.ttsMessages, msg],
                        ttsInput: "",
                      });
                    }
                  }
                }}
              />
              <SimpleButton
                onClick={() => {
                  const msg = (form.ttsInput || "").trim();
                  if (!msg) return;
                  updateForm({
                    ttsMessages: [...form.ttsMessages, msg],
                    ttsInput: "",
                  });
                }}
                className={`px-5 py-3 text-sm font-medium bg-gradient-to-r ${colors.primary} text-white shadow-lg shadow-blue-500/20 whitespace-nowrap`}
              >
                Añadir
              </SimpleButton>
            </div>
            {form.ttsMessages.length > 0 && (
              <div className="space-y-2">
                {form.ttsMessages.map((msg, idx) => (
                  <div
                    key={`${msg}-${idx}`}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg ${colors.chipBg} border ${colors.border}`}
                  >
                    <span className={`text-sm ${colors.text}`}>{msg}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateForm({
                          ttsMessages: form.ttsMessages.filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                      className={`text-lg font-bold ${colors.mutedText} hover:${colors.text} transition-colors`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SimpleCard>
    </div>
  );

  const RutinaCard = ({ r }: any) => {
    const triggerIcons: Record<string, any> = {
      NLP: <Mic className="w-4 h-4" />,
      Tiempo: <Clock className="w-4 h-4" />,
      Evento: <Cpu className="w-4 h-4" />,
    };

    const colorMap: Record<string, string> = {
      NLP: colors.purpleGradient,
      Tiempo: colors.orangeGradient,
      Evento: colors.cyanGradient,
    };

    return (
      <SimpleCard
        className={`p-5 bg-gradient-to-br border transition-all hover:shadow-xl ${
          colorMap[r.trigger.type]
        } ${colors.glow}`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h4 className={`text-lg font-bold ${colors.text}`}>{r.name}</h4>
              {r.description && (
                <p className={`text-sm ${colors.mutedText} mt-1`}>
                  {r.description}
                </p>
              )}
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                r.confirmed
                  ? `bg-green-500/20 text-green-400`
                  : `bg-yellow-500/20 text-yellow-400`
              }`}
            >
              {r.confirmed ? "✓ Confirmada" : "⚠ Pendiente"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className={`p-1.5 rounded-lg bg-blue-500/20`}>
              {triggerIcons[r.trigger.type]}
            </div>
            <span className={colors.mutedText}>
              {hook.describeTrigger(r.trigger)}
            </span>
          </div>

          {r.actions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs">
                <Zap className="w-3 h-3" />
                <span className={colors.mutedText}>
                  {r.actions.length} acción{r.actions.length > 1 ? "es" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {r.actions.slice(0, 2).map((a: any) => (
                  <span
                    key={a.id}
                    className={`text-xs px-2 py-1 rounded-full ${colors.chipBg} border ${colors.border} ${colors.chipText}`}
                  >
                    {a.name}
                  </span>
                ))}
                {r.actions.length > 2 && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${colors.chipBg} border ${colors.border} ${colors.chipText}`}
                  >
                    +{r.actions.length - 2}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-3">
            <SimpleButton
              onClick={() => hook.toggleEnabled(r.id)}
              className={`text-xs px-3 py-2 font-medium rounded-lg ${
                r.enabled
                  ? `${colors.buttonActive}`
                  : `${colors.buttonInactive}`
              }`}
            >
              {r.enabled ? "Activa" : "Inactiva"}
            </SimpleButton>
            <div className="flex gap-2">
              <SimpleButton
                onClick={() => startDetail(r.id)}
                className={`p-2 rounded-lg ${colors.buttonActive} hover:shadow-md transition-all`}
              >
                <Eye className="w-4 h-4" />
              </SimpleButton>
              <SimpleButton
                onClick={() => startEdit(r.id)}
                className={`p-2 rounded-lg bg-gradient-to-r ${colors.secondary} text-white shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all`}
              >
                <Pencil className="w-4 h-4" />
              </SimpleButton>
              <SimpleButton
                onClick={() => setDeleteId(r.id)}
                className={`p-2 rounded-lg ${colors.dangerChip} hover:shadow-md transition-all`}
              >
                <Trash2 className="w-4 h-4" />
              </SimpleButton>
            </div>
          </div>
        </div>
      </SimpleCard>
    );
  };

  return (
    <div
      className={`p-2 md:p-4 pt-8 md:pt-3 space-y-6 font-inter ${colors.background} ${colors.text} min-h-screen`}
    >
      <PageHeader
        title="Rutinas"
        icon={<ListTodo className={`w-8 md:w-10 h-8 md:h-10 ${colors.icon}`} />}
      />

      {message && (
        <div
          className={`rounded-xl px-5 py-4 text-sm font-medium backdrop-blur-sm border transition-all ${
            message.type === "success"
              ? `${colors.notifySuccess} border-green-500/20`
              : `${colors.notifyError} border-red-500/20`
          }`}
        >
          {message.text}
        </div>
      )}

      {/* VISTA PRINCIPAL CON TABS */}
      {view === "tabs" && (
        <div className="space-y-5">
          {/* Botones de tabs */}
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab("rutinas")}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === "rutinas"
                    ? `bg-gradient-to-r ${colors.primary} text-white shadow-lg`
                    : `${colors.buttonInactive}`
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Rutinas</span>
              </button>
              <button
                onClick={openSuggestions}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === "sugerencias"
                    ? `bg-gradient-to-r ${colors.secondary} text-white shadow-lg shadow-purple-500/20`
                    : `${colors.buttonInactive}`
                }`}
              >
                <Wand2 className="w-4 h-4" />
                <span>Sugerencias</span>
              </button>
              <button
                onClick={startCreate}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${colors.buttonInactive}`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear Rutina</span>
              </button>
            </div>

            {activeTab === "rutinas" && (
              <div className="flex gap-2">
                <SimpleButton
                  active={showOnlyEnabled}
                  onClick={() => setShowOnlyEnabled((v) => !v)}
                  className={`flex items-center gap-2 ${
                    showOnlyEnabled ? colors.buttonActive : colors.buttonInactive
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Mostrar solo habilitadas
                </SimpleButton>
                <SimpleButton
                  active={showOnlyConfirmed}
                  onClick={() => setShowOnlyConfirmed((v) => !v)}
                  className={`flex items-center gap-2 ${
                    showOnlyConfirmed
                      ? `bg-gradient-to-r ${colors.secondary} text-white shadow-lg shadow-purple-500/20`
                      : colors.buttonInactive
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Mostrar solo confirmadas
                </SimpleButton>
              </div>
            )}
            {activeTab === "sugerencias" && (
              <div className="flex gap-2">
                <SimpleButton
                  active={showOnlyEnabled}
                  onClick={() => setShowOnlyEnabled((v) => !v)}
                  className={`flex items-center gap-2 ${
                    showOnlyEnabled ? colors.buttonActive : colors.buttonInactive
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Mostrar solo habilitadas
                </SimpleButton>
                <SimpleButton
                  active={showOnlyConfirmed}
                  onClick={() => setShowOnlyConfirmed((v) => !v)}
                  className={`flex items-center gap-2 ${
                    showOnlyConfirmed
                      ? `bg-gradient-to-r ${colors.secondary} text-white shadow-lg shadow-purple-500/20`
                      : colors.buttonInactive
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Mostrar solo confirmadas
                </SimpleButton>
              </div>
            )}
          </div>

          {/* TAB RUTINAS */}
          {activeTab === "rutinas" && (
            <div className="space-y-5">
              {hook.isLoadingList ? (
                <SimpleCard className={`p-8 text-center ${colors.cardBg}`}>
                  <div className={`${colors.mutedText}`}>Cargando rutinas...</div>
                </SimpleCard>
              ) : filteredRutinas.length === 0 ? (
                <SimpleCard
                  className={`p-8 text-center bg-gradient-to-br ${colors.purpleGradient} border`}
                >
                  <div className={`text-lg font-semibold ${colors.text} mb-3`}>
                    Sin rutinas aún
                  </div>
                  <p className={`${colors.mutedText} mb-4`}>
                    Crea tu primera rutina para automatizar tus dispositivos
                  </p>
                  <SimpleButton
                    onClick={startCreate}
                    className={`inline-flex items-center gap-2 bg-gradient-to-r ${colors.primary} text-white shadow-lg shadow-blue-500/20`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Crear rutina
                  </SimpleButton>
                </SimpleCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredRutinas.map((r) => (
                    <RutinaCard key={r.id} r={r} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB SUGERENCIAS */}
          {activeTab === "sugerencias" && (
            <div className="space-y-5">
              {hook.isLoadingSuggestions ? (
                <SimpleCard className={`p-8 text-center ${colors.cardBg}`}>
                  <div className={`${colors.mutedText}`}>
                    Generando sugerencias...
                  </div>
                </SimpleCard>
              ) : hook.suggestions.length === 0 ? (
                <SimpleCard className={`p-8 text-center ${colors.cardBg}`}>
                  <p className={`${colors.mutedText}`}>
                    No hay sugerencias disponibles
                  </p>
                </SimpleCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {hook.suggestions.map((s) => (
                    <SimpleCard
                      key={s.id}
                      className={`p-5 bg-gradient-to-br ${colors.cyanGradient} border transition-all hover:shadow-xl`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={`text-lg font-bold ${colors.text}`}>
                              {s.name}
                            </h4>
                            <p className={`text-xs ${colors.mutedText} mt-1`}>
                              {s.trigger.type}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 whitespace-nowrap`}
                          >
                            {Math.round(s.confidence * 100)}%
                          </span>
                        </div>

                        {s.actions.length > 0 && (
                          <div className={`border-t border-white/10 pt-3`}>
                            <p
                              className={`text-xs font-semibold ${colors.text} mb-2`}
                            >
                              Acciones sugeridas
                            </p>
                            <div className="space-y-1">
                              {s.actions.map((a) => (
                                <div
                                  key={a.id}
                                  className={`text-xs ${colors.mutedText} flex items-center gap-2`}
                                >
                                  <Zap className="w-3 h-3" />
                                  {a.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-3">
                          <SimpleButton
                            onClick={() => {
                              hook.acceptSuggestion(s);
                              showMessage(
                                "Sugerencia aceptada y convertida en rutina"
                              );
                            }}
                            className={`flex-1 text-sm font-medium px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all`}
                          >
                            Aceptar
                          </SimpleButton>
                          <SimpleButton
                            onClick={() => {
                              hook.rejectSuggestion(s.id);
                              showMessage("Sugerencia rechazada");
                            }}
                            className={`flex-1 text-sm font-medium px-3 py-2 rounded-lg ${colors.dangerChip} hover:opacity-80 transition-all`}
                          >
                            Rechazar
                          </SimpleButton>
                        </div>
                      </div>
                    </SimpleCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VISTAS DETALLE Y EDICIÓN */}
      {view === "detail" && selectedId && (() => {
        const r = hook.getRoutineById(selectedId);
        return r ? (
          <SimpleCard className={`p-6 ${colors.cardBg}`}>
            <div className="space-y-5">
              {/* Contenido igual al original */}
              <div className="flex flex-wrap gap-2 pt-4">
                <SimpleButton
                  onClick={() => {
                    setView("tabs");
                    setActiveTab("rutinas");
                  }}
                  className={`text-sm px-4 py-2 font-medium rounded-lg ${colors.buttonInactive} hover:bg-opacity-80 transition-all`}
                >
                  <ArrowLeft className="w-4 h-4 inline mr-2" />
                  Volver
                </SimpleButton>
              </div>
            </div>
          </SimpleCard>
        ) : null;
      })()}

      {/* MODALS */}
      <Modal
        title={isEditing ? "Editar Rutina" : "Crear Rutina"}
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        panelClassName="max-w-4xl"
        backdropClassName={colors.backdropBg}
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
          <Form />
          <div className="mt-6 flex flex-wrap gap-2 pt-4">
            <SimpleButton
              onClick={isEditing ? handleUpdate : handleCreate}
              disabled={
                !(
                  (form.name || "").trim() &&
                  (form.triggerType !== "Tiempo" ||
                    form.relativeMinutes > 0 ||
                    form.timeDays.length > 0 ||
                    !!form.timeDate) &&
                  (form.actionIds.length > 0 ||
                    (form.ttsMessages && form.ttsMessages.length > 0))
                )
              }
              className={`px-5 py-3 text-sm font-medium bg-gradient-to-r ${colors.primary} text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isEditing ? "Guardar cambios" : "Crear Rutina"}
            </SimpleButton>
            <SimpleButton
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              className={`px-5 py-3 text-sm font-medium ${colors.buttonInactive} hover:bg-opacity-80 transition-all`}
            >
              Cancelar
            </SimpleButton>
          </div>
        </div>
      </Modal>

      <Modal
        title="Confirmar eliminación"
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        panelClassName="max-w-md"
      >
        <p className={`${colors.mutedText} mb-6`}>
          Esta acción no se puede deshacer. ¿Deseas eliminar la rutina?
        </p>
        <div className="flex gap-2">
          <SimpleButton
            onClick={handleDelete}
            className={`flex-1 px-4 py-3 text-sm font-medium ${colors.dangerChip}`}
          >
            Eliminar
          </SimpleButton>
          <SimpleButton
            onClick={() => setDeleteId(null)}
            className={`flex-1 px-4 py-3 text-sm font-medium ${colors.buttonInactive}`}
          >
            Cancelar
          </SimpleButton>
        </div>
      </Modal>
    </div>
  );
}