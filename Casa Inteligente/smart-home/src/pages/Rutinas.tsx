"use client"

import PageHeader from "../components/UI/PageHeader"
import { ListTodo, ClipboardList, PlusCircle, Wand2, Eye, Pencil, Trash2, Zap, CheckCircle, ShieldCheck, ArrowLeft } from "lucide-react"
import SimpleButton from "../components/UI/Button"
import SimpleCard from "../components/UI/Card"
import Modal from "../components/UI/Modal"
import { useState } from "react"
import type { FormState } from "../hooks/useRutinas"
import { useRutinas, INITIAL_FORM, DEVICE_OPTIONS, DAY_LABELS } from "../hooks/useRutinas"

type View = "list" | "edit" | "detail" | "suggestions"

export default function Rutinas() {
  const hook = useRutinas()
  const [view, setView] = useState<View>("list")
  const [activeTab, setActiveTab] = useState<"list" | "suggestions">("list")
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false)
  const [showOnlyConfirmed, setShowOnlyConfirmed] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [isEditing, setIsEditing] = useState(false)

  const filteredRutinas = hook.rutinas.filter(r => {
    if (showOnlyEnabled && !r.enabled) return false
    if (showOnlyConfirmed && !r.confirmed) return false
    return true
  })

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const updateForm = (changes: Partial<FormState>) => setForm(prev => ({ ...prev, ...changes }))
  const resetForm = () => setForm(INITIAL_FORM)

  const fillFormFromRoutine = (id: string) => {
    const r = hook.getRoutineById(id)
    if (!r) return
    setForm(prev => ({
      ...prev,
      name: r.name,
      description: r.description,
      enabled: r.enabled,
      actionIds: r.actions.map(a => a.id),
      triggerType: r.trigger.type,
      ...(r.trigger.type === "NLP" && { nlpPhrase: r.trigger.phrase }),
      ...(r.trigger.type === "Tiempo" && { timeHour: r.trigger.hour, timeDays: r.trigger.days || [], timeDate: r.trigger.date || "" }),
      ...(r.trigger.type === "Evento" && { deviceId: r.trigger.deviceId, deviceEvent: r.trigger.event, condOperator: r.trigger.condition?.operator || "", condValue: r.trigger.condition?.value ?? "" }),
    }))
  }

  const handleCreate = () => {
    if (hook.createRutina(form)) {
      showMessage("Rutina creada correctamente")
      resetForm()
      setActiveTab("list")
      setView("list")
      setIsCreateModalOpen(false)
    } else showMessage("El nombre es obligatorio", "error")
  }

  const handleUpdate = () => {
    if (selectedId && hook.updateRutina(selectedId, form)) {
      showMessage("Cambios guardados")
      setView("detail")
    }
  }

  const handleDelete = () => {
    if (deleteId) {
      hook.deleteRutina(deleteId)
      showMessage("Rutina eliminada")
      setDeleteId(null)
      setView("list")
    }
  }

  const startCreate = () => { resetForm(); setIsEditing(false); setIsCreateModalOpen(true) }
  const startEdit = (id: string) => { setSelectedId(id); fillFormFromRoutine(id); setIsEditing(true); setIsCreateModalOpen(true) }
  const startDetail = (id: string) => { setSelectedId(id); setView("detail") }
  const openSuggestions = () => { setActiveTab("suggestions"); setView("suggestions"); hook.generateSuggestions() }

  const FormField = ({ label, type = "text", value, onChange, ...props }: any) => (
    <label className="block">
      <span className="text-sm text-slate-300">{label}</span>
      {type === "textarea" ? (
        <textarea className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" value={value} onChange={onChange} {...props} />
      ) : (
        <input type={type} className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" value={value} onChange={onChange} {...props} />
      )}
    </label>
  )

  const SelectField = ({ label, value, onChange, options }: any) => (
    <label className="block">
      <span className="text-sm text-slate-300">{label}</span>
      <select className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" value={value} onChange={onChange}>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  )

  const Form = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      <div className="space-y-3">
        <FormField label="Nombre" value={form.name} onChange={(e: any) => updateForm({ name: e.target.value })} />
        <FormField label="Descripción" type="textarea" rows={3} value={form.description} onChange={(e: any) => updateForm({ description: e.target.value })} />
        
        <div className="flex items-center gap-2">
          <SimpleButton active={form.enabled} onClick={() => updateForm({ enabled: !form.enabled })} className={form.enabled ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20" : "bg-slate-800/60 border border-slate-600/40 text-slate-200"}>
            {form.enabled ? "Habilitada" : "Deshabilitada"}
          </SimpleButton>
        </div>

        <SelectField label="Tipo de trigger" value={form.triggerType} onChange={(e: any) => updateForm({ triggerType: e.target.value })} options={[{ value: "NLP", label: "NLP" }, { value: "Tiempo", label: "Tiempo" }, { value: "Evento", label: "Evento de dispositivo" }]} />

        {form.triggerType === "NLP" && <FormField label="Frase activadora" value={form.nlpPhrase} onChange={(e: any) => updateForm({ nlpPhrase: e.target.value })} />}

        {form.triggerType === "Tiempo" && (
          <div className="space-y-3">
            <FormField label="Hora" type="time" value={form.timeHour} onChange={(e: any) => updateForm({ timeHour: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map(day => (
                <SimpleButton key={day} active={form.timeDays.includes(day)} onClick={() => updateForm({ timeDays: form.timeDays.includes(day) ? form.timeDays.filter(d => d !== day) : [...form.timeDays, day] })} className={form.timeDays.includes(day) ? "text-xs rounded-full px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-indigo-500/20" : "text-xs rounded-full px-3 py-1.5 bg-slate-800/60 border border-slate-600/40 text-slate-200"}>
                  {day}
                </SimpleButton>
              ))}
            </div>
            <FormField label="Fecha específica (opcional)" type="date" value={form.timeDate} onChange={(e: any) => updateForm({ timeDate: e.target.value })} />
          </div>
        )}

        {form.triggerType === "Evento" && (
          <div className="space-y-3">
            <SelectField label="Dispositivo" value={form.deviceId} onChange={(e: any) => { const dev = DEVICE_OPTIONS.find(d => d.id === e.target.value); updateForm({ deviceId: e.target.value, deviceEvent: dev?.events[0] || "" }) }} options={DEVICE_OPTIONS.map(d => ({ value: d.id, label: d.name }))} />
            <SelectField label="Evento" value={form.deviceEvent} onChange={(e: any) => updateForm({ deviceEvent: e.target.value })} options={DEVICE_OPTIONS.find(d => d.id === form.deviceId)?.events.map(ev => ({ value: ev, label: ev })) || []} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Operador (opcional)" value={form.condOperator} onChange={(e: any) => updateForm({ condOperator: e.target.value })} options={[{ value: "", label: "—" }, { value: ">", label: ">" }, { value: "<", label: "<" }, { value: "=", label: "=" }]} />
              <FormField label="Valor (opcional)" type="number" value={form.condValue} onChange={(e: any) => updateForm({ condValue: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <span className="text-sm text-slate-300">Acciones IoT</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hook.availableActions.map(a => {
            const active = form.actionIds.includes(a.id)
            return (
              <SimpleButton key={a.id} active={active} onClick={() => updateForm({ actionIds: active ? form.actionIds.filter(id => id !== a.id) : [...form.actionIds, a.id] })} className={active ? "w-full justify-start rounded-2xl px-4 py-3 text-left bg-gradient-to-br from-teal-600 to-emerald-600 text-white border-transparent shadow-emerald-500/20" : "w-full justify-start rounded-2xl px-4 py-3 text-left bg-slate-800/60 border border-slate-600/40 text-slate-200 hover:bg-slate-700/60"}>
                {a.name}
              </SimpleButton>
            )
          })}
        </div>
      </div>
    </div>
  )

  const RutinaCard = ({ r }: any) => {
    const colorMap: Record<string, string> = { NLP: "from-purple-500/10 to-pink-500/10 border-purple-400/30", Tiempo: "from-orange-500/10 to-red-500/10 border-orange-400/30", Evento: "from-cyan-500/10 to-blue-500/10 border-cyan-400/30" }
    return (
      <SimpleCard className={`p-4 bg-gradient-to-br border transition-shadow hover:shadow-lg hover:shadow-black/20 ${colorMap[r.trigger.type]}`}>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">{r.name}</h4>
            <p className="text-slate-400 text-sm">{r.description}</p>
          </div>
          <span className={`text-xs inline-block px-2 py-0.5 rounded ${r.enabled ? "bg-emerald-900/30 text-emerald-300 border border-emerald-400/30" : "bg-amber-900/30 text-amber-300 border border-amber-400/30"}`}>
            {r.enabled ? "Confirmada" : "No confirmada"}
          </span>
        </div>
        <div className="mt-3 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-600/40">{r.trigger.type}</span>
            <span className="text-slate-400">{hook.describeTrigger(r.trigger)}</span>
          </div>
        </div>
        {r.actions.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Zap className="w-3 h-3" />
              <span>Acciones</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {r.actions.slice(0, 3).map((a: any) => <span key={a.id} className="text-xs px-2 py-1 rounded-full bg-slate-800/60 border border-slate-600/40 text-slate-200">{a.name}</span>)}
              {r.actions.length > 3 && <span className="text-xs px-2 py-1 rounded-full bg-slate-800/60 border border-slate-600/40 text-slate-200">+{r.actions.length - 3} más</span>}
            </div>
          </div>
        )}
        <div className="my-3 border-t border-slate-700/40" />
        <div className="mt-3 flex items-center gap-2">
          <SimpleButton onClick={() => hook.toggleEnabled(r.id, !r.enabled)} className={`px-2 py-1.5 whitespace-nowrap w-auto text-center text-xs font-medium rounded-lg ${r.enabled ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20" : "bg-slate-800/60 border border-slate-600/40 text-slate-200"}`}>
            {r.enabled ? "Confirmada" : "No confirmada"}
          </SimpleButton>
          <div className="ml-auto flex items-center justify-center gap-2">
            <SimpleButton onClick={() => startDetail(r.id)} className="p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-indigo-500/20"><Eye className="w-5 h-5" /></SimpleButton>
            <SimpleButton onClick={() => startEdit(r.id)} className="p-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-violet-500/20"><Pencil className="w-5 h-5" /></SimpleButton>
            <SimpleButton onClick={() => setDeleteId(r.id)} className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-rose-500/20"><Trash2 className="w-5 h-5" /></SimpleButton>
          </div>
        </div>
      </SimpleCard>
    )
  }

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-4 md:space-y-6 lg:space-y-8 font-inter">
      <PageHeader title="Rutinas" icon={<ListTodo className="w-8 md:w-10 h-8 md:h-10 text-white" />} />

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-green-900/30 text-green-300 border border-green-600/30" : "bg-rose-900/30 text-rose-300 border border-rose-600/30"}`}>
          {message.text}
        </div>
      )}

      {view === "list" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2 sm:mt-3">
            <SimpleButton
              active={activeTab === "list"}
              onClick={() => { setActiveTab("list"); setView("list") }}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/20"
            >
              <span className="inline-flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Rutinas</span>
            </SimpleButton>
            <SimpleButton
              active={activeTab === "suggestions"}
              onClick={openSuggestions}
              className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white border-transparent shadow-lg shadow-pink-500/20"
            >
              <span className="inline-flex items-center gap-2"><Wand2 className="w-5 h-5" /> Sugerencias</span>
            </SimpleButton>
            <SimpleButton
              onClick={startCreate}
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

          {hook.isLoadingList ? (
            <div className="text-slate-400">Cargando rutinas...</div>
          ) : filteredRutinas.length === 0 ? (
            <SimpleCard className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-400/30">
              <p className="text-slate-300">No hay rutinas registradas</p>
              <div className="mt-3">
                <SimpleButton onClick={startCreate} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-500/20">
                  Crear una rutina
                </SimpleButton>
              </div>
            </SimpleCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRutinas.map(r => <RutinaCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}

      {view === "edit" && selectedId && (
        <SimpleCard className="p-4">
          <h3 className="text-xl md:text-2xl font-semibold text-slate-200 mb-4">Editar Rutina</h3>
          <Form />
          <div className="mt-4 flex flex-wrap gap-2">
            <SimpleButton onClick={handleUpdate} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-violet-500/20">Guardar cambios</SimpleButton>
            <SimpleButton onClick={() => setView("detail")} className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40">Volver</SimpleButton>
          </div>
        </SimpleCard>
      )}

      {view === "detail" && selectedId && (() => {
        const r = hook.getRoutineById(selectedId)
        return r ? (
          <SimpleCard className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl md:text-2xl font-semibold text-slate-200">{r.name}</h3>
                  <p className="text-slate-400">{r.description}</p>
                </div>
                <div className="text-xs text-slate-400 text-right space-y-1">
                  <div><span className={`inline-block px-2 py-0.5 rounded ${r.confirmed ? "bg-emerald-900/30 text-emerald-300 border border-emerald-400/30" : "bg-amber-900/30 text-amber-300 border border-amber-400/30"}`}>{r.confirmed ? "Confirmada" : "Pendiente"}</span></div>
                  <div>Tipo: <span className="font-bold text-slate-200">{r.trigger.type}</span></div>
                  <div>{hook.describeTrigger(r.trigger)}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SimpleButton onClick={() => hook.toggleEnabled(r.id, !r.enabled)} className={`px-2 py-1.5 whitespace-nowrap w-auto text-center text-xs font-medium ${r.enabled ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20" : "bg-slate-800/60 border border-slate-600/40 text-slate-200"}`}>
                  {r.enabled ? "Confirmada" : "No confirmada"}
                </SimpleButton>
                {!r.confirmed && (
                  <>
                    <SimpleButton onClick={() => { hook.confirmRutina(r.id); showMessage("Rutina confirmada") }} className="text-sm bg-gradient-to-r from-emerald-600 to-green-600 text-white border-transparent shadow-emerald-500/20">Confirmar rutina</SimpleButton>
                    <SimpleButton onClick={() => { hook.rejectRutina(r.id); showMessage("Rutina marcada como no confirmada") }} className="text-sm bg-gradient-to-r from-amber-600 to-orange-600 text-white border-transparent shadow-amber-500/20">Rechazar rutina</SimpleButton>
                  </>
                )}
              </div>
              <div>
                <h4 className="text-slate-200 font-semibold">Comandos asociados</h4>
                <ul className="list-disc list-inside text-slate-300">
                  {r.actions.map(a => <li key={a.id}>{a.name}</li>)}
                </ul>
              </div>
              <div className="text-sm text-slate-400">
                <div>Ejecutada: <span className="text-slate-200 font-bold">{r.executionsCount}</span> veces</div>
                <div>Última ejecución: <span className="text-slate-200 font-bold">{r.lastExecutedAt ? new Date(r.lastExecutedAt).toLocaleString() : "—"}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SimpleButton onClick={() => startEdit(r.id)} className="p-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-violet-500/20"><Pencil className="w-5 h-5" /></SimpleButton>
                <SimpleButton onClick={() => setDeleteId(r.id)} className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-rose-500/20"><Trash2 className="w-5 h-5" /></SimpleButton>
                <SimpleButton onClick={() => { setView("list"); setActiveTab("list") }} className="text-sm bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40">Volver a lista</SimpleButton>
              </div>
            </div>
          </SimpleCard>
        ) : null
      })()}

      {view === "suggestions" && (
        <div className="space-y-4">
          <SimpleButton onClick={() => { setActiveTab("list"); setView("list") }} className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40 text-slate-200 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </SimpleButton>
          {hook.isLoadingSuggestions ? (
            <div className="text-slate-400">Cargando sugerencias...</div>
          ) : hook.suggestions.length === 0 ? (
            <SimpleCard className="p-6"><p className="text-slate-300">No hay sugerencias disponibles</p></SimpleCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hook.suggestions.map(s => (
                <SimpleCard key={s.id} className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-white">{s.name}</h4>
                      <div className="text-sm text-slate-300">{s.trigger.type} — {hook.describeTrigger(s.trigger)}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-cyan-900/30 text-cyan-300 border border-cyan-400/30">Confianza: {s.confidence}%</span>
                  </div>
                  <div className="mt-2">
                    <h5 className="text-slate-200 font-semibold">Comandos sugeridos</h5>
                    <ul className="list-disc list-inside text-slate-300">
                      {s.actions.map(a => <li key={a.id}>{a.name}</li>)}
                    </ul>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SimpleButton onClick={() => { hook.acceptSuggestion(s); showMessage("Sugerencia aceptada y convertida en rutina") }} className="text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20">Aceptar</SimpleButton>
                    <SimpleButton onClick={() => { hook.rejectSuggestion(s.id); showMessage("Sugerencia rechazada") }} className="text-sm bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-rose-500/20">Rechazar</SimpleButton>
                  </div>
                </SimpleCard>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal title={isEditing ? "Editar Rutina" : "Crear Rutina"} isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setActiveTab("list") }} panelClassName="max-w-3xl md:max-w-4xl" backdropClassName="bg-black/50 backdrop-blur-sm" className="bg-transparent bg-gradient-to-br from-sky-950/70 to-indigo-900/50 border border-sky-500/30 ring-1 ring-white/10 backdrop-blur-md">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <Form />
          <div className="mt-4 flex flex-wrap gap-2">
            <SimpleButton onClick={isEditing ? handleUpdate : handleCreate} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-emerald-500/20">
              {isEditing ? "Guardar cambios" : "Crear Rutina"}
            </SimpleButton>
            <SimpleButton onClick={() => { setIsCreateModalOpen(false); resetForm() }} className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40">Cancelar</SimpleButton>
          </div>
        </div>
      </Modal>

      <Modal title="Confirmar eliminación" isOpen={!!deleteId} onClose={() => setDeleteId(null)}>
        <p className="text-slate-300">Esta acción no se puede deshacer. ¿Deseas eliminar la rutina?</p>
        <div className="mt-4 flex gap-2">
          <SimpleButton onClick={handleDelete} className="bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-rose-500/20">Eliminar</SimpleButton>
          <SimpleButton onClick={() => setDeleteId(null)} className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-600/40">Cancelar</SimpleButton>
        </div>
      </Modal>
    </div>
  )
}