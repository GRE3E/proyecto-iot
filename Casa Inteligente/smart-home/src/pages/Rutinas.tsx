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
} from "lucide-react";
import SimpleButton from "../components/UI/Button";
import SimpleCard from "../components/UI/Card";
import Modal from "../components/UI/Modal";
import CollapsibleSection from "../components/UI/CollapsibleSection";
import { useState, useRef } from "react";
import type { FormState } from "../hooks/useRutinas";
import {
  useRutinas,
  INITIAL_FORM,
  DEVICE_OPTIONS,
  DAY_LABELS,
} from "../hooks/useRutinas";
import { useThemeByTime } from "../hooks/useThemeByTime";

type View = "list" | "edit" | "detail" | "suggestions";

export default function Rutinas() {
  const hook = useRutinas();
  const { colors } = useThemeByTime();
  const [view, setView] = useState<View>("list");
  const [activeTab, setActiveTab] = useState<"list" | "suggestions">("list");
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
      setActiveTab("list");
      setView("list");
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
      setView("list");
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
    setActiveTab("suggestions");
    setView("suggestions");
    await hook.generateSuggestions();
  };

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
      <span className={`text-sm ${colors.mutedText}`}>{label}</span>
      {type === "textarea" ? (
        <textarea
          className={`mt-1 w-full rounded-lg ${colors.inputBg} border ${colors.inputBorder} px-3 py-2 ${colors.text}`}
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
          className={`mt-1 w-full rounded-lg ${colors.inputBg} border ${colors.inputBorder} px-3 py-2 ${colors.text}`}
          value={value}
          onChange={onChange}
          {...props}
        />
      )}
    </label>
  );

  const SelectField = ({ label, value, onChange, options }: any) => (
    <label className="block">
      <span className={`text-sm ${colors.mutedText}`}>{label}</span>
      <select
        className={`mt-1 w-full rounded-lg ${colors.inputBg} border ${colors.inputBorder} px-3 py-2 ${colors.text}`}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-3">
          <span className={`text-sm ${colors.mutedText}`}>Datos básicos</span>
          <FormField
            label="Nombre"
            value={form.name}
            inputRef={nameInputRef}
            autoFocus
            onChange={(e: any) => {
              updateForm({ name: e.target.value });
            }}
          />
          <FormField
            label="Descripción"
            type="textarea"
            rows={3}
            value={form.description}
            onChange={(e: any) => updateForm({ description: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <SimpleButton
              active={form.enabled}
              onClick={() => updateForm({ enabled: !form.enabled })}
              className={
                form.enabled
                  ? colors.successChip
                  : colors.buttonInactive
              }
            >
              {form.enabled ? "Habilitada" : "Deshabilitada"}
            </SimpleButton>
          </div>
        </div>

        <div className="space-y-3">
          <span className={`text-sm ${colors.mutedText}`}>Resumen</span>
          <div className={`rounded-xl border ${colors.border} ${colors.panelBg} p-3 text-sm ${colors.mutedText}`}>
            <div className="mb-2">
              <span className={`font-semibold ${colors.text}`}>Tipo:</span>{" "}
              {form.triggerType === "NLP" ? "Voz" : form.triggerType}
            </div>
            <div className="mb-2">
              {form.triggerType === "NLP" && (
                <span>Cuando diga "{form.nlpPhrase || ""}"</span>
              )}
              {form.triggerType === "Tiempo" && (
                <span>
                  {form.relativeMinutes > 0
                    ? `En ${form.relativeMinutes} minutos`
                    : `A las ${form.timeHour} ${
                        form.timeDate
                          ? `(el ${form.timeDate})`
                          : form.timeDays.length
                          ? `(${form.timeDays.join(", ")})`
                          : "todos los días"
                      }`}
                </span>
              )}
              {form.triggerType === "Evento" && (
                <span>
                  {(() => {
                    const dev = DEVICE_OPTIONS.find(
                      (d) => d.id === form.deviceId
                    );
                    return `Cuando ${dev?.name || form.deviceId} reporte "${
                      form.deviceEvent
                    }"${
                      form.condOperator && form.condValue !== ""
                        ? ` ${form.condOperator} ${form.condValue}`
                        : ""
                    }`;
                  })()}
                </span>
              )}
            </div>
            <div>
              <span className={`font-semibold ${colors.text}`}>Acciones:</span>{" "}
              {form.actionIds.length + (form.ttsMessages?.length || 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <span className={`text-sm ${colors.mutedText}`}>Disparador</span>
        <SelectField
          label="Tipo de trigger"
          value={form.triggerType}
          onChange={(e: any) => updateForm({ triggerType: e.target.value })}
          options={[
            { value: "NLP", label: "Voz (frase activadora)" },
            { value: "Tiempo", label: "Tiempo" },
            { value: "Evento", label: "Evento de dispositivo" },
          ]}
        />

        {form.triggerType === "NLP" && (
          <FormField
            label="Frase activadora"
            value={form.nlpPhrase}
            onChange={(e: any) => updateForm({ nlpPhrase: e.target.value })}
          />
        )}

        {form.triggerType === "Tiempo" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <SimpleButton
                active={!(form.relativeMinutes > 0)}
                onClick={() => updateForm({ relativeMinutes: 0 })}
                className={
                  !(form.relativeMinutes > 0)
                    ? `text-xs rounded-full px-3 py-1.5 ${colors.buttonActive}`
                    : `text-xs rounded-full px-3 py-1.5 ${colors.buttonInactive}`
                }
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
                className={
                  form.relativeMinutes > 0
                    ? `text-xs rounded-full px-3 py-1.5 ${colors.buttonActive}`
                    : `text-xs rounded-full px-3 py-1.5 ${colors.buttonInactive}`
                }
              >
                En minutos
              </SimpleButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                label="Hora"
                type="time"
                value={form.timeHour}
                onChange={(e: any) =>
                  updateForm({ timeHour: e.target.value, relativeMinutes: 0 })
                }
                disabled={form.relativeMinutes > 0}
              />
              <FormField
                label="En minutos"
                type="number"
                value={form.relativeMinutes}
                onChange={(e: any) =>
                  updateForm({ relativeMinutes: Number(e.target.value || 0) })
                }
                min={0}
                disabled={!(form.relativeMinutes > 0)}
              />
            </div>
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
                  className={
                    form.timeDays.includes(day)
                      ? `text-xs rounded-full px-3 py-1.5 ${colors.buttonActive}`
                      : `text-xs rounded-full px-3 py-1.5 ${colors.buttonInactive}`
                  }
                  disabled={form.relativeMinutes > 0}
                >
                  {day}
                </SimpleButton>
              ))}
            </div>
            <FormField
              label="Fecha específica (opcional)"
              type="date"
              value={form.timeDate}
              onChange={(e: any) => updateForm({ timeDate: e.target.value })}
              disabled={form.relativeMinutes > 0}
            />
          </div>
        )}

        {form.triggerType === "Evento" && (
          <div className="space-y-3">
            <SelectField
              label="Dispositivo"
              value={form.deviceId}
              onChange={(e: any) => {
                const dev = DEVICE_OPTIONS.find((d) => d.id === e.target.value);
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
              label="Evento"
              value={form.deviceEvent}
              onChange={(e: any) => updateForm({ deviceEvent: e.target.value })}
              options={
                DEVICE_OPTIONS.find((d) => d.id === form.deviceId)?.events.map(
                  (ev) => ({ value: ev, label: ev })
                ) || []
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
                  { value: "", label: "—" },
                  { value: ">", label: ">" },
                  { value: "<", label: "<" },
                  { value: "=", label: "=" },
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
              />
            </div>
          </div>
        )}
      </div>

      <CollapsibleSection title="Acciones" defaultOpen={true}>
        <div className="space-y-3">
          <span className={`text-sm ${colors.mutedText}`}>Acciones IoT</span>
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
                  className={
                    active
                      ? `w-full justify-start rounded-2xl px-4 py-3 text-left ${colors.successChip}`
                      : `w-full justify-start rounded-2xl px-4 py-3 text-left ${colors.buttonInactive} ${colors.buttonHover}`
                  }
                >
                  {a.name}
                </SimpleButton>
              );
            })}
          </div>
          <div className="space-y-2">
            <span className={`text-sm ${colors.mutedText}`}>Acciones de voz</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className={`flex-1 rounded-lg ${colors.inputBg} border ${colors.inputBorder} px-3 py-2 ${colors.text}`}
                placeholder="Mensaje (ej. 'Buenos días')"
                value={form.ttsInput}
                onChange={(e: any) => updateForm({ ttsInput: e.target.value })}
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
                className={colors.successChip}
              >
                Añadir
              </SimpleButton>
            </div>
            {form.ttsMessages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.ttsMessages.map((msg, idx) => (
                  <span
                    key={`${msg}-${idx}`}
                    className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${colors.chipBg} border ${colors.border} ${colors.chipText}`}
                  >
                    {msg}
                    <button
                      type="button"
                      onClick={() =>
                        updateForm({
                          ttsMessages: form.ttsMessages.filter(
                            (m, i) => i !== idx
                          ),
                        })
                      }
                      className={`${colors.redIcon} hover:opacity-80`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );

  const RutinaCard = ({ r }: any) => {
    const colorMap: Record<string, string> = {
      NLP: colors.purpleGradient,
      Tiempo: colors.orangeGradient,
      Evento: colors.cyanGradient,
    };
    return (
      <SimpleCard
        className={`p-4 bg-gradient-to-br border transition-shadow hover:shadow-lg ${colors.glow} ${
          colorMap[r.trigger.type]
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h4 className={`text-lg font-semibold ${colors.text}`}>{r.name}</h4>
            <p className={`${colors.mutedText} text-sm`}>{r.description}</p>
          </div>
          <span
            className={`text-xs inline-block px-2 py-0.5 rounded ${
              r.confirmed
                ? colors.successChip
                : colors.warningChip
            }`}
          >
            {r.confirmed ? "Confirmada" : "Pendiente"}
          </span>
        </div>
        <div className="mt-3 text-sm">
          <div className={`flex items-center gap-2 ${colors.mutedText}`}>
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.chipBg} border ${colors.border}`}>
              {r.trigger.type === "NLP" ? "Voz" : r.trigger.type}
            </span>
            <span className={colors.mutedText}>
              {hook.describeTrigger(r.trigger)}
            </span>
          </div>
        </div>
        {r.actions.length > 0 && (
          <div className="mt-3">
            <div className={`flex items-center gap-2 text-xs ${colors.mutedText}`}>
              <Zap className="w-3 h-3" />
              <span>Acciones</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {r.actions.slice(0, 3).map((a: any) => (
                <span
                  key={a.id}
                  className={`text-xs px-2 py-1 rounded-full ${colors.chipBg} border ${colors.border} ${colors.chipText}`}
                >
                  {a.name}
                </span>
              ))}
              {r.actions.length > 3 && (
                <span className={`text-xs px-2 py-1 rounded-full ${colors.chipBg} border ${colors.border} ${colors.chipText}`}>
                  +{r.actions.length - 3} más
                </span>
              )}
            </div>
          </div>
        )}
        <div className={`my-3 border-t ${colors.border}`} />
        <div className="mt-3 flex items-center gap-2">
          <SimpleButton
            onClick={() => hook.toggleEnabled(r.id, !r.enabled)}
            className={`px-2 py-1.5 whitespace-nowrap w-auto text-center text-xs font-medium rounded-lg ${
              r.enabled
                ? colors.buttonActive
                : colors.buttonInactive
            }`}
          >
            {r.enabled ? "Habilitada" : "Deshabilitada"}
          </SimpleButton>
          <div className="ml-auto flex items-center justify-center gap-2">
            <SimpleButton
              onClick={() => startDetail(r.id)}
              className={`p-2 rounded-xl ${colors.buttonActive}`}
            >
              <Eye className="w-5 h-5" />
            </SimpleButton>
            <SimpleButton
              onClick={() => startEdit(r.id)}
              className={`p-2 rounded-xl bg-gradient-to-r ${colors.secondary} text-white border-transparent shadow-violet-500/20`}
            >
              <Pencil className="w-5 h-5" />
            </SimpleButton>
            <SimpleButton
              onClick={() => setDeleteId(r.id)}
              className={`p-2 rounded-xl ${colors.dangerChip}`}
            >
              <Trash2 className="w-5 h-5" />
            </SimpleButton>
          </div>
        </div>
      </SimpleCard>
    );
  };

  return (
    <div
      className={`p-2 md:p-4 pt-8 md:pt-3 space-y-4 md:space-y-6 lg:space-y-8 font-inter ${colors.background} ${colors.text}`}
    >
      <PageHeader
        title="Rutinas"
        icon={<ListTodo className={`w-8 md:w-10 h-8 md:h-10 ${colors.icon}`} />}
      />

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === "success" ? colors.notifySuccess : colors.notifyError
          }`}
        >
          {message.text}
        </div>
      )}

      {view === "list" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2 sm:mt-3">
            <SimpleButton
              active={activeTab === "list"}
              onClick={() => {
                setActiveTab("list");
                setView("list");
              }}
              className={`w-full sm:w-auto ${colors.buttonActive}`}
            >
              <span className="inline-flex items-center gap-2">
                <ClipboardList className="w-5 h-5" /> Rutinas
              </span>
            </SimpleButton>
            <SimpleButton
              active={activeTab === "suggestions"}
              onClick={openSuggestions}
              className={`w-full sm:w-auto bg-gradient-to-r ${colors.secondary} text-white border-transparent shadow-lg shadow-pink-500/20`}
            >
              <span className="inline-flex items-center gap-2">
                <Wand2 className="w-5 h-5" /> Sugerencias
              </span>
            </SimpleButton>
            <SimpleButton
              onClick={startCreate}
              className={`w-full sm:w-auto ${colors.successChip}`}
            >
              <span className="inline-flex items-center gap-2">
                <PlusCircle className="w-5 h-5" /> Crear Rutina
              </span>
            </SimpleButton>
            <div className="sm:ml-auto flex flex-wrap items-center gap-2">
              <SimpleButton
                active={showOnlyEnabled}
                onClick={() => setShowOnlyEnabled((v) => !v)}
                className={`${
                  showOnlyEnabled
                    ? colors.buttonActive
                    : colors.buttonInactive
                } ring-1 ring-white/10 w-full sm:w-auto`}
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Mostrar solo habilitadas
                </span>
              </SimpleButton>
              <SimpleButton
                active={showOnlyConfirmed}
                onClick={() => setShowOnlyConfirmed((v) => !v)}
                className={`${
                  showOnlyConfirmed
                    ? `bg-gradient-to-r ${colors.secondary} text-white border-transparent shadow-violet-500/20`
                    : colors.buttonInactive
                } ring-1 ring-white/10 w-full sm:w-auto`}
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Mostrar solo confirmadas
                </span>
              </SimpleButton>
            </div>
          </div>

          {hook.isLoadingList ? (
            <div className={colors.mutedText}>Cargando rutinas...</div>
          ) : filteredRutinas.length === 0 ? (
            <SimpleCard className={`p-6 bg-gradient-to-br ${colors.purpleGradient} border`}>
              <p className={colors.mutedText}>No hay rutinas registradas</p>
              <div className="mt-3">
                <SimpleButton
                  onClick={startCreate}
                  className={colors.successChip}
                >
                  Crear una rutina
                </SimpleButton>
              </div>
            </SimpleCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRutinas.map((r) => (
                <RutinaCard key={r.id} r={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {view === "edit" && selectedId && (
        <SimpleCard className={`p-4 ${colors.cardBg}`}>
          <h3 className={`text-xl md:text-2xl font-semibold ${colors.text} mb-4`}>
            Editar Rutina
          </h3>
          <Form />
          <div className="mt-4 flex flex-wrap gap-2">
            <SimpleButton
              onClick={handleUpdate}
              className={`bg-gradient-to-r ${colors.secondary} text-white border-transparent shadow-violet-500/20`}
            >
              Guardar cambios
            </SimpleButton>
            <SimpleButton
              onClick={() => setView("detail")}
              className={`${colors.buttonInactive} ${colors.buttonHover}`}
            >
              Volver
            </SimpleButton>
          </div>
        </SimpleCard>
      )}

      {view === "detail" &&
        selectedId &&
        (() => {
          const r = hook.getRoutineById(selectedId);
          return r ? (
            <SimpleCard className={`p-4 ${colors.cardBg}`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-xl md:text-2xl font-semibold ${colors.text}`}>
                      {r.name}
                    </h3>
                    <p className={colors.mutedText}>{r.description}</p>
                  </div>
                  <div className={`text-xs ${colors.mutedText} text-right space-y-1`}>
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded ${
                          r.confirmed
                            ? colors.successChip
                            : colors.warningChip
                        }`}
                      >
                        {r.confirmed ? "Confirmada" : "Pendiente"}
                      </span>
                    </div>
                    <div>
                      Tipo:{" "}
                      <span className={`font-bold ${colors.text}`}>
                        {r.trigger.type === "NLP" ? "Voz" : r.trigger.type}
                      </span>
                    </div>
                    <div>{hook.describeTrigger(r.trigger)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SimpleButton
                    onClick={() => hook.toggleEnabled(r.id, !r.enabled)}
                    className={`px-2 py-1.5 whitespace-nowrap w-auto text-center text-xs font-medium ${
                      r.enabled
                        ? colors.successChip
                        : colors.buttonInactive
                    }`}
                  >
                    {r.enabled ? "Habilitada" : "Deshabilitada"}
                  </SimpleButton>
                  {!r.confirmed && (
                    <>
                      <SimpleButton
                        onClick={async () => {
                          const res = await hook.confirmRutina(r.id);
                          if (res.success) showMessage("Rutina confirmada");
                          else showMessage("No se pudo confirmar", "error");
                        }}
                        className={`text-sm ${colors.successChip}`}
                      >
                        Confirmar rutina
                      </SimpleButton>
                      <SimpleButton
                        onClick={async () => {
                          const res = await hook.rejectRutina(r.id);
                          if (res.success) showMessage("Rutina eliminada");
                          else showMessage("No se pudo rechazar", "error");
                        }}
                        className={`text-sm ${colors.warningChip}`}
                      >
                        Rechazar rutina
                      </SimpleButton>
                    </>
                  )}
                </div>
                <div>
                  <h4 className={`${colors.text} font-semibold`}>
                    Comandos asociados
                  </h4>
                  <ul className={`list-disc list-inside ${colors.mutedText}`}>
                    {r.actions.map((a) => (
                      <li key={a.id}>{a.name}</li>
                    ))}
                  </ul>
                </div>
                <div className={`text-sm ${colors.mutedText}`}>
                  <div>
                    Ejecutada:{" "}
                    <span className={`${colors.text} font-bold`}>
                      {r.executionsCount}
                    </span>{" "}
                    veces
                  </div>
                  <div>
                    Última ejecución:{" "}
                    <span className={`${colors.text} font-bold`}>
                      {r.lastExecutedAt
                        ? new Date(r.lastExecutedAt).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SimpleButton
                    onClick={() => startEdit(r.id)}
                    className={`p-2 rounded-xl bg-gradient-to-r ${colors.secondary} text-white border-transparent shadow-violet-500/20`}
                  >
                    <Pencil className="w-5 h-5" />
                  </SimpleButton>
                  <SimpleButton
                    onClick={() => setDeleteId(r.id)}
                    className={`p-2 rounded-xl ${colors.dangerChip}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </SimpleButton>
                  <SimpleButton
                    onClick={() => {
                      setView("list");
                      setActiveTab("list");
                    }}
                    className={`text-sm ${colors.buttonInactive} ${colors.buttonHover}`}
                  >
                    Volver a lista
                  </SimpleButton>
                </div>
              </div>
            </SimpleCard>
          ) : null;
        })()}

      {view === "suggestions" && (
        <div className="space-y-4">
          <SimpleButton
            onClick={() => {
              setActiveTab("list");
              setView("list");
            }}
            className={`flex items-center gap-2 ${colors.buttonInactive} ${colors.buttonHover} mb-4`}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </SimpleButton>
          {hook.isLoadingSuggestions ? (
            <div className={colors.mutedText}>Cargando sugerencias...</div>
          ) : hook.suggestions.length === 0 ? (
            <SimpleCard className={`p-6 ${colors.cardBg}`}>
              <p className={colors.mutedText}>No hay sugerencias disponibles</p>
            </SimpleCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hook.suggestions.map((s) => (
                <SimpleCard
                  key={s.id}
                  className={`p-4 bg-gradient-to-br ${colors.cyanGradient} border`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`text-lg font-semibold ${colors.text}`}>
                        {s.name}
                      </h4>
                      <div className={`text-sm ${colors.mutedText}`}>
                        {s.trigger.type} — {hook.describeTrigger(s.trigger)}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${colors.chipBg} ${colors.chipText} border ${colors.border}`}>
                      Confianza: {s.confidence}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <h5 className={`${colors.text} font-semibold`}>
                      Comandos sugeridos
                    </h5>
                    <ul className={`list-disc list-inside ${colors.mutedText}`}>
                      {s.actions.map((a) => (
                        <li key={a.id}>{a.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SimpleButton
                      onClick={() => {
                        hook.acceptSuggestion(s);
                        showMessage(
                          "Sugerencia aceptada y convertida en rutina"
                        );
                      }}
                      className={`text-sm ${colors.successChip}`}
                    >
                      Aceptar
                    </SimpleButton>
                    <SimpleButton
                      onClick={() => {
                        hook.rejectSuggestion(s.id);
                        showMessage("Sugerencia rechazada");
                      }}
                      className={`text-sm ${colors.dangerChip}`}
                    >
                      Rechazar
                    </SimpleButton>
                  </div>
                </SimpleCard>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        title={isEditing ? "Editar Rutina" : "Crear Rutina"}
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setActiveTab("list");
        }}
        panelClassName="max-w-3xl md:max-w-4xl"
        backdropClassName={colors.backdropBg}
        className={`bg-transparent ${colors.modalBg} border ${colors.border} ring-1 ring-white/10 backdrop-blur-md`}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <Form />
          <div className="mt-4 flex flex-wrap gap-2">
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
              className={`${colors.successChip} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isEditing ? "Guardar cambios" : "Crear Rutina"}
            </SimpleButton>
            <SimpleButton
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              className={`${colors.buttonInactive} ${colors.buttonHover}`}
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
      >
        <p className={colors.mutedText}>
          Esta acción no se puede deshacer. ¿Deseas eliminar la rutina?
        </p>
        <div className="mt-4 flex gap-2">
          <SimpleButton
            onClick={handleDelete}
            className={colors.dangerChip}
          >
            Eliminar
          </SimpleButton>
          <SimpleButton
            onClick={() => setDeleteId(null)}
            className={`${colors.buttonInactive} ${colors.buttonHover}`}
          >
            Cancelar
          </SimpleButton>
        </div>
      </Modal>
    </div>
  );
}