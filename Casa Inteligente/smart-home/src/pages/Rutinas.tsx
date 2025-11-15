"use client"

import PageHeader from "../components/UI/PageHeader"
import { ListTodo } from "lucide-react"
import { ClipboardList, PlusCircle, Wand2, Eye, Pencil, Trash2, Zap, CheckCircle, ShieldCheck } from "lucide-react"
import SimpleButton from "../components/UI/Button"
import SimpleCard from "../components/UI/Card"
import Modal from "../components/UI/Modal"
import { useState } from "react"
import { useRutinas } from "../hooks/useRutinas"
import type { TriggerType, RoutineAction, Trigger } from "../hooks/useRutinas"

export default function Rutinas() {
  const {
    rutinas,
    suggestions,
    availableActions,
    isLoadingList,
    isLoadingSuggestions,
    describeTrigger,
    createRutina,
    updateRutina,
    deleteRutina,
    toggleEnabled,
    confirmRutina,
    rejectRutina,
    acceptSuggestion,
    rejectSuggestion,
    getRoutineById,
  } = useRutinas()

  type View = "list" | "create" | "edit" | "detail" | "suggestions"
  const [view, setView] = useState<View>("list")
  const [activeTab, setActiveTab] = useState<"list" | "create" | "suggestions">("list")

  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false)
  const [showOnlyConfirmed, setShowOnlyConfirmed] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Mensajes simples
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null)

  // --- Formulario Crear/Editar ---
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formEnabled, setFormEnabled] = useState(true)
  const [formTriggerType, setFormTriggerType] = useState<TriggerType>("NLP")
  const [formActions, setFormActions] = useState<string[]>([])

  // NLP
  const [nlpPhrase, setNlpPhrase] = useState("")
  // Tiempo
  const [timeHour, setTimeHour] = useState("08:00")
  const [timeDays, setTimeDays] = useState<string[]>([])
  const [timeDate, setTimeDate] = useState<string>("")
  // Evento
  const deviceOptions = [
    { id: "sensor-sala", name: "Sensor de sala", events: ["movimiento", "temperatura", "humedad"] },
    { id: "sensor-puerta", name: "Sensor de puerta", events: ["apertura", "cierre"] },
    { id: "interruptor-salon", name: "Interruptor salón", events: ["encendido", "apagado"] },
  ]
  const [deviceId, setDeviceId] = useState(deviceOptions[0].id)
  const [deviceEvent, setDeviceEvent] = useState(deviceOptions[0].events[0])
  const [condOperator, setCondOperator] = useState<">" | "<" | "=" | "">("")
  const [condValue, setCondValue] = useState<number | "">("")

  function resetForm() {
    setFormName("")
    setFormDescription("")
    setFormEnabled(true)
    setFormTriggerType("NLP")
    setFormActions([])
    setNlpPhrase("")
    setTimeHour("08:00")
    setTimeDays([])
    setTimeDate("")
    setDeviceId(deviceOptions[0].id)
    setDeviceEvent(deviceOptions[0].events[0])
    setCondOperator("")
    setCondValue("")
  }

  function fillFormFromRoutine(id: string) {
    const r = getRoutineById(id)
    if (!r) return
    setFormName(r.name)
    setFormDescription(r.description)
    setFormEnabled(r.enabled)
    setFormActions(r.actions.map((a) => a.id))
    switch (r.trigger.type) {
      case "NLP":
        setFormTriggerType("NLP")
        setNlpPhrase(r.trigger.phrase)
        break
      case "Tiempo":
        setFormTriggerType("Tiempo")
        setTimeHour(r.trigger.hour)
        setTimeDays(r.trigger.days || [])
        setTimeDate(r.trigger.date || "")
        break
      case "Evento":
        setFormTriggerType("Evento")
        setDeviceId(r.trigger.deviceId)
        setDeviceEvent(r.trigger.event)
        setCondOperator(r.trigger.condition?.operator || "")
        setCondValue(r.trigger.condition?.value ?? "")
        break
    }
  }

  function buildTrigger(): Trigger {
    if (formTriggerType === "NLP") {
      return { type: "NLP", phrase: nlpPhrase }
    }
    if (formTriggerType === "Tiempo") {
      return { type: "Tiempo", hour: timeHour, days: timeDays, date: timeDate || undefined }
    }
    const dev = deviceOptions.find((d) => d.id === deviceId)!
    const cond = condOperator && condValue !== "" ? { operator: condOperator as any, value: Number(condValue) } : undefined
    return { type: "Evento", deviceId, deviceName: dev.name, event: deviceEvent, condition: cond }
  }

  function mapActions(ids: string[]): RoutineAction[] {
    return ids
      .map((id) => availableActions.find((a) => a.id === id))
      .filter(Boolean) as RoutineAction[]
  }

  function handleCreate() {
    if (!formName.trim()) {
      setMessageType("error")
      setMessage("El nombre es obligatorio")
      return
    }
    const trigger = buildTrigger()
    const actions = mapActions(formActions)
    createRutina({
      name: formName.trim(),
      description: formDescription.trim(),
      enabled: formEnabled,
      confirmed: false,
      trigger,
      actions,
    })
    setMessageType("success")
    setMessage("Rutina creada correctamente")
    resetForm()
    setActiveTab("list")
    setView("list")
    setIsCreateModalOpen(false)
  }

  function handleSaveEdit() {
    if (!selectedId) return
    const trigger = buildTrigger()
    const actions = mapActions(formActions)
    updateRutina(selectedId, {
      name: formName.trim(),
      description: formDescription.trim(),
      enabled: formEnabled,
      trigger,
      actions,
    })
    setMessageType("success")
    setMessage("Cambios guardados")
    setView("detail")
  }

  function startEdit(id: string) {
    setSelectedId(id)
    fillFormFromRoutine(id)
    setView("edit")
  }

  function startDetail(id: string) {
    setSelectedId(id)
    setView("detail")
  }

  function requestDelete(id: string) {
    setDeleteId(id)
  }

  function confirmDelete() {
    if (!deleteId) return
    deleteRutina(deleteId)
    setDeleteId(null)
    setMessageType("success")
    setMessage("Rutina eliminada")
    setView("list")
  }

  function cancelEdit() {
    setView("list")
  }

  // --- UI helpers ---
  const dayLabels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

  const filteredRutinas = rutinas.filter((r) => {
    if (showOnlyEnabled && !r.enabled) return false
    if (showOnlyConfirmed && !r.confirmed) return false
    return true
  })

  // --- Render ---
  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-4 md:space-y-6 lg:space-y-8 font-inter">
      <PageHeader
        title="Rutinas"
        icon={<ListTodo className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      {/* Mensajes */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${messageType === "success" ? "bg-green-900/30 text-green-300 border border-green-600/30" : "bg-rose-900/30 text-rose-300 border border-rose-600/30"}`}>
          {message}
        </div>
      )}

      {/* Contenido según vista */}
      {view === "list" && (
        <div className="space-y-4">
          {/* Fila de acciones: Rutinas, Sugerencias, Crear (izquierda) y filtros (derecha), responsivo y más visibles */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2 sm:mt-3">
            <SimpleButton
              active={activeTab === "list"}
              onClick={() => {
                setActiveTab("list"); setView("list")
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/20"
            >
              <span className="inline-flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Rutinas</span>
            </SimpleButton>
            <SimpleButton
              active={activeTab === "suggestions"}
              onClick={() => {
                setActiveTab("suggestions"); setView("suggestions")
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white border-transparent shadow-lg shadow-pink-500/20"
            >
              <span className="inline-flex items-center gap-2"><Wand2 className="w-5 h-5" /> Sugerencias</span>
            </SimpleButton>
            <SimpleButton
              onClick={() => { resetForm(); setIsCreateModalOpen(true) }}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-500/20"
            >
              <span className="inline-flex items-center gap-2"><PlusCircle className="w-5 h-5" /> Crear Rutina</span>
            </SimpleButton>
            <div className="sm:ml-auto flex flex-wrap items-center gap-2">
              <SimpleButton
                active={showOnlyEnabled}
                onClick={() => setShowOnlyEnabled((v) => !v)}
                className={`${showOnlyEnabled ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-indigo-500/20" : "bg-gradient-to-r from-slate-700 to-slate-600 text-slate-200 border border-slate-500/40"} ring-1 ring-white/10 w-full sm:w-auto`}
              >
                <span className="inline-flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Mostrar solo habilitadas</span>
              </SimpleButton>
              <SimpleButton
                active={showOnlyConfirmed}
                onClick={() => setShowOnlyConfirmed((v) => !v)}
                className={`${showOnlyConfirmed ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent shadow-violet-500/20" : "bg-gradient-to-r from-slate-700 to-slate-600 text-slate-200 border border-slate-500/40"} ring-1 ring-white/10 w-full sm:w-auto`}
              >
                <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Mostrar solo confirmadas</span>
              </SimpleButton>
            </div>
          </div>

          {/* Lista */}
          {isLoadingList ? (
            <div className="text-slate-400">Cargando rutinas...</div>
          ) : filteredRutinas.length === 0 ? (
            <SimpleCard className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-400/30">
              <p className="text-slate-300">No hay rutinas registradas</p>
              <div className="mt-3">
                <SimpleButton onClick={() => { setActiveTab("create"); resetForm(); setIsCreateModalOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-500/20">
                  Crear una rutina
                </SimpleButton>
              </div>
            </SimpleCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRutinas.map((r) => (
                <SimpleCard
                  key={r.id}
                  className={`p-4 bg-gradient-to-br border transition-shadow hover:shadow-lg hover:shadow-black/20 ${
                    r.trigger.type === "NLP"
                      ? "from-purple-500/10 to-pink-500/10 border-purple-400/30"
                      : r.trigger.type === "Tiempo"
                        ? "from-orange-500/10 to-red-500/10 border-orange-400/30"
                        : "from-cyan-500/10 to-blue-500/10 border-cyan-400/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-white">{r.name}</h4>
                      <p className="text-slate-400 text-sm">{r.description}</p>
                    </div>
                    <div className="text-xs text-slate-400 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded ${r.confirmed ? "bg-emerald-900/30 text-emerald-300 border border-emerald-400/30" : "bg-amber-900/30 text-amber-300 border border-amber-400/30"}`}>
                        {r.confirmed ? "Confirmada" : "No confirmada"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-sm space-y-1">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-600/40 text-slate-200">{r.trigger.type}</span>
                      <span className="text-slate-400">{describeTrigger(r.trigger)}</span>
                    </div>
                  </div>

                  {r.actions.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Zap className="w-3 h-3" />
                        <span>Acciones</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.actions.slice(0, 3).map((a) => (
                          <span key={a.id} className="text-xs px-2 py-1 rounded-full bg-slate-800/60 border border-slate-600/40 text-slate-200">
                            {a.name}
                          </span>
                        ))}
                        {r.actions.length > 3 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-800/60 border border-slate-600/40 text-slate-200">+{r.actions.length - 3} más</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="my-3 border-t border-slate-700/40" />

                  <div className="mt-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                    <SimpleButton
                      onClick={() => toggleEnabled(r.id, !r.enabled)}
                      className={`text-xs ${r.enabled ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20" : "bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 text-slate-200"}`}
                    >
                      {r.enabled ? "Habilitada" : "Deshabilitada"}
                    </SimpleButton>
                    <div className="ml-auto flex items-center gap-2">
                      <SimpleButton
                        onClick={() => startDetail(r.id)}
                        aria-label="Ver detalles"
                        title="Ver detalles"
                        className="p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-indigo-500/20"
                      >
                        <Eye className="w-5 h-5" />
                      </SimpleButton>
                      <SimpleButton
                        onClick={() => startEdit(r.id)}
                        aria-label="Editar"
                        title="Editar"
                        className="p-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-violet-500/20"
                      >
                        <Pencil className="w-5 h-5" />
                      </SimpleButton>
                      <SimpleButton
                        onClick={() => requestDelete(r.id)}
                        aria-label="Eliminar"
                        title="Eliminar"
                        className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-rose-500/20"
                      >
                        <Trash2 className="w-5 h-5" />
                      </SimpleButton>
                    </div>
                  </div>

                  
                </SimpleCard>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "create" && null}

      {view === "edit" && (
        <SimpleCard className="p-4">
          <h3 className="text-xl md:text-2xl font-semibold text-slate-200 mb-4">Editar Rutina</h3>
          {/* Reutilizamos el mismo formulario de Crear */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Columna 1 */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-slate-300">Nombre</span>
                <input className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Descripción</span>
                <textarea className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} />
                <span>Habilitada</span>
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Tipo de trigger</span>
                <select className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={formTriggerType} onChange={(e) => setFormTriggerType(e.target.value as TriggerType)}>
                  <option value="NLP">NLP</option>
                  <option value="Tiempo">Tiempo</option>
                  <option value="Evento">Evento de dispositivo</option>
                </select>
              </label>
              {formTriggerType === "NLP" && (
                <label className="block">
                  <span className="text-sm text-slate-300">Frase activadora</span>
                  <input className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={nlpPhrase} onChange={(e) => setNlpPhrase(e.target.value)} />
                </label>
              )}
              {formTriggerType === "Tiempo" && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-slate-300">Hora</span>
                    <input type="time" className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={timeHour} onChange={(e) => setTimeHour(e.target.value)} />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {dayLabels.map((d) => (
                      <label key={d} className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={timeDays.includes(d)} onChange={(e) => {
                          setTimeDays((prev) => e.target.checked ? [...prev, d] : prev.filter((x) => x !== d))
                        }} />
                        <span>{d}</span>
                      </label>
                    ))}
                  </div>
                  <label className="block">
                    <span className="text-sm text-slate-300">Fecha específica (opcional)</span>
                    <input type="date" className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={timeDate} onChange={(e) => setTimeDate(e.target.value)} />
                  </label>
                </div>
              )}
              {formTriggerType === "Evento" && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-slate-300">Dispositivo</span>
                    <select className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={deviceId} onChange={(e) => {
                      const v = e.target.value; setDeviceId(v); const dev = deviceOptions.find((d) => d.id === v)!; setDeviceEvent(dev.events[0])
                    }}>
                      {deviceOptions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-300">Evento</span>
                    <select className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={deviceEvent} onChange={(e) => setDeviceEvent(e.target.value)}>
                      {deviceOptions.find((d) => d.id === deviceId)!.events.map((ev) => (
                        <option key={ev} value={ev}>{ev}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm text-slate-300">Operador (opcional)</span>
                      <select className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={condOperator} onChange={(e) => setCondOperator(e.target.value as any)}>
                        <option value="">—</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="=">=</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-300">Valor (opcional)</span>
                      <input type="number" className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={condValue} onChange={(e) => setCondValue(e.target.value === "" ? "" : Number(e.target.value))} />
                    </label>
                  </div>
                </div>
              )}
            </div>
            {/* Columna 2: Acciones */}
            <div className="space-y-3">
              <span className="text-sm text-slate-300">Acciones IoT</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableActions.map((a) => (
                  <label key={a.id} className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={formActions.includes(a.id)} onChange={(e) => {
                      setFormActions((prev) => e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id))
                    }} />
                    <span>{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <SimpleButton onClick={handleSaveEdit} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-violet-500/20">Guardar cambios</SimpleButton>
            <SimpleButton onClick={cancelEdit} className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40">Volver</SimpleButton>
          </div>
        </SimpleCard>
      )}

      {view === "detail" && selectedId && (
        <SimpleCard className="p-4">
          {(() => { const r = getRoutineById(selectedId); if (!r) return null; return (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl md:text-2xl font-semibold text-slate-200">{r.name}</h3>
                  <p className="text-slate-400">{r.description}</p>
                </div>
                <div className="text-xs text-slate-400 text-right space-y-1">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded ${r.confirmed ? "bg-emerald-900/30 text-emerald-300 border border-emerald-400/30" : "bg-amber-900/30 text-amber-300 border border-amber-400/30"}`}>
                      {r.confirmed ? "Confirmada" : "Pendiente"}
                    </span>
                  </div>
                  <div>Tipo: <span className="font-bold text-slate-200">{r.trigger.type}</span></div>
                  <div>{describeTrigger(r.trigger)}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <SimpleButton
                  onClick={() => toggleEnabled(r.id, !r.enabled)}
                  className={`text-xs ${r.enabled ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20" : "bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 text-slate-200"}`}
                >
                  {r.enabled ? "Habilitada" : "Deshabilitada"}
                </SimpleButton>
                {/* Estado movido al encabezado para evitar confusión */}
                {!r.confirmed ? (
                  <>
                    <SimpleButton className="text-sm bg-gradient-to-r from-emerald-600 to-green-600 text-white border-transparent shadow-emerald-500/20" onClick={() => { confirmRutina(r.id); setMessageType("success"); setMessage("Rutina confirmada") }}>Confirmar rutina</SimpleButton>
                    <SimpleButton className="text-sm bg-gradient-to-r from-amber-600 to-orange-600 text-white border-transparent shadow-amber-500/20" onClick={() => { rejectRutina(r.id); setMessageType("success"); setMessage("Rutina marcada como no confirmada") }}>Rechazar rutina</SimpleButton>
                  </>
                ) : null}
              </div>

              <div>
                <h4 className="text-slate-200 font-semibold">Comandos asociados</h4>
                <ul className="list-disc list-inside text-slate-300">
                  {r.actions.map((a) => (
                    <li key={a.id}>{a.name}</li>
                  ))}
                </ul>
              </div>

              <div className="text-sm text-slate-400">
                <div>Ejecutada: <span className="text-slate-200 font-bold">{r.executionsCount}</span> veces</div>
                <div>Última ejecución: <span className="text-slate-200 font-bold">{r.lastExecutedAt ? new Date(r.lastExecutedAt).toLocaleString() : "—"}</span></div>
              </div>

              <div className="flex flex-wrap gap-2">
                <SimpleButton
                  className="p-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-violet-500/20"
                  aria-label="Editar"
                  title="Editar"
                  onClick={() => startEdit(r.id)}
                >
                  <Pencil className="w-5 h-5" />
                </SimpleButton>
                <SimpleButton
                  className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-rose-500/20"
                  aria-label="Eliminar"
                  title="Eliminar"
                  onClick={() => requestDelete(r.id)}
                >
                  <Trash2 className="w-5 h-5" />
                </SimpleButton>
                <SimpleButton className="text-sm bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40" onClick={() => { setView("list"); setActiveTab("list") }}>Volver a lista</SimpleButton>
              </div>
            </div>
          ) })()}
        </SimpleCard>
      )}

      {view === "suggestions" && (
        <div className="space-y-4">
          {isLoadingSuggestions ? (
            <div className="text-slate-400">Cargando sugerencias...</div>
          ) : suggestions.length === 0 ? (
            <SimpleCard className="p-6">
              <p className="text-slate-300">No hay sugerencias disponibles</p>
            </SimpleCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.map((s) => (
                <SimpleCard key={s.id} className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-white">{s.name}</h4>
                      <div className="text-sm text-slate-300">{s.trigger.type} — {describeTrigger(s.trigger)}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-cyan-900/30 text-cyan-300 border border-cyan-400/30">Confianza: {s.confidence}%</span>
                  </div>
                  <div className="mt-2">
                    <h5 className="text-slate-200 font-semibold">Comandos sugeridos</h5>
                    <ul className="list-disc list-inside text-slate-300">
                      {s.actions.map((a) => (
                        <li key={a.id}>{a.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SimpleButton className="text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20" onClick={() => { acceptSuggestion(s); setMessageType("success"); setMessage("Sugerencia aceptada y convertida en rutina") }}>Aceptar</SimpleButton>
                    <SimpleButton className="text-sm bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-rose-500/20" onClick={() => { rejectSuggestion(s.id); setMessageType("success"); setMessage("Sugerencia rechazada") }}>Rechazar</SimpleButton>
                  </div>
                </SimpleCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal crear rutina */}
      <Modal
        title="Crear Rutina"
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setActiveTab("list") }}
        panelClassName="max-w-3xl md:max-w-4xl"
        backdropClassName="bg-black/50 backdrop-blur-sm"
        className="bg-transparent bg-gradient-to-br from-sky-950/70 to-indigo-900/50 border border-sky-500/30 ring-1 ring-white/10 backdrop-blur-md"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-slate-300">Nombre</span>
                <input className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Descripción</span>
                <textarea className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </label>
              <div className="flex items-center gap-2">
                <SimpleButton
                  active={formEnabled}
                  aria-pressed={formEnabled}
                  onClick={() => setFormEnabled((v) => !v)}
                  className={formEnabled ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20" : "bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 text-slate-200"}
                >
                  {formEnabled ? "Habilitada" : "Deshabilitada"}
                </SimpleButton>
              </div>
              <label className="block">
                <span className="text-sm text-slate-300">Tipo de trigger</span>
                <select className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={formTriggerType} onChange={(e) => setFormTriggerType(e.target.value as TriggerType)}>
                  <option value="NLP">NLP</option>
                  <option value="Tiempo">Tiempo</option>
                  <option value="Evento">Evento de dispositivo</option>
                </select>
              </label>
              {formTriggerType === "NLP" && (
                <label className="block">
                  <span className="text-sm text-slate-300">Frase activadora</span>
                  <input className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={nlpPhrase} onChange={(e) => setNlpPhrase(e.target.value)} />
                </label>
              )}
              {formTriggerType === "Tiempo" && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-slate-300">Hora</span>
                    <input type="time" className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={timeHour} onChange={(e) => setTimeHour(e.target.value)} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dayLabels.map((d) => {
                      const active = timeDays.includes(d)
                      return (
                        <SimpleButton
                          key={d}
                          active={active}
                          aria-pressed={active}
                          onClick={() => {
                            setTimeDays((prev) => active ? prev.filter((x) => x !== d) : [...prev, d])
                          }}
                          className={active ? "text-xs rounded-full px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-indigo-500/20 ring-1 ring-white/10" : "text-xs rounded-full px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 text-slate-200"}
                        >
                          {d}
                        </SimpleButton>
                      )
                    })}
                  </div>
                  <label className="block">
                    <span className="text-sm text-slate-300">Fecha específica (opcional)</span>
                    <input type="date" className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={timeDate} onChange={(e) => setTimeDate(e.target.value)} />
                  </label>
                </div>
              )}
              {formTriggerType === "Evento" && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-slate-300">Dispositivo</span>
                    <select className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={deviceId} onChange={(e) => {
                      const v = e.target.value; setDeviceId(v); const dev = deviceOptions.find((d) => d.id === v)!; setDeviceEvent(dev.events[0])
                    }}>
                      {deviceOptions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-300">Evento</span>
                    <select className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={deviceEvent} onChange={(e) => setDeviceEvent(e.target.value)}>
                      {deviceOptions.find((d) => d.id === deviceId)!.events.map((ev) => (
                        <option key={ev} value={ev}>{ev}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm text-slate-300">Operador (opcional)</span>
                      <select className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={condOperator} onChange={(e) => setCondOperator(e.target.value as any)}>
                        <option value="">—</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="=">=</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-300">Valor (opcional)</span>
                      <input type="number" className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" value={condValue} onChange={(e) => setCondValue(e.target.value === "" ? "" : Number(e.target.value))} />
                    </label>
                  </div>
                </div>
              )}
            </div>
            {/* Acciones IoT */}
            <div className="space-y-3">
              <span className="text-sm text-slate-300">Acciones IoT</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableActions.map((a) => {
                  const active = formActions.includes(a.id)
                  return (
                    <SimpleButton
                      key={a.id}
                      active={active}
                      aria-pressed={active}
                      onClick={() => {
                        setFormActions((prev) => active ? prev.filter((x) => x !== a.id) : [...prev, a.id])
                      }}
                      className={active ? "w-full justify-start rounded-2xl px-4 py-3 leading-tight text-left bg-gradient-to-br from-teal-600 to-emerald-600 text-white border-transparent shadow-emerald-500/20 ring-1 ring-white/10" : "w-full justify-start rounded-2xl px-4 py-3 leading-tight text-left bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 text-slate-200"}
                    >
                      {a.name}
                    </SimpleButton>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <SimpleButton onClick={handleCreate} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20">Crear Rutina</SimpleButton>
            <SimpleButton onClick={() => { setIsCreateModalOpen(false); setActiveTab("list") }} className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40">Cancelar</SimpleButton>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal title="Confirmar eliminación" isOpen={!!deleteId} onClose={() => setDeleteId(null)}>
        <p className="text-slate-300">Esta acción no se puede deshacer. ¿Deseas eliminar la rutina?</p>
        <div className="mt-4 flex gap-2">
          <SimpleButton onClick={confirmDelete} className="bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-rose-500/20">Eliminar</SimpleButton>
          <SimpleButton onClick={() => setDeleteId(null)} className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40">Cancelar</SimpleButton>
        </div>
      </Modal>
    </div>
  )
}