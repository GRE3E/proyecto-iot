"use client"
import SimpleCard from "../UI/SimpleCard"
import SimpleButton from "../UI/SimpleButton"

interface Props {
  ownerName: string
  setOwnerName: (v: string) => void
  language: string
  setLanguage: (v: string) => void
  notifications: boolean
  setNotifications: (v: boolean) => void
  devices: { on: boolean }[]
}

export default function Configuracion({
  ownerName,
  setOwnerName,
  language,
  setLanguage,
  notifications,
  setNotifications,
  devices,
}: Props) {
  return (
    <div>
      <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        ⚙️ Configuración del Sistema
      </h2>

      <div className="space-y-6 max-w-2xl">
        {/* Nombre del dueño */}
        <SimpleCard className="p-6">
          <label className="block font-bold mb-3 text-cyan-400">Nombre del dueño:</label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-cyan-500/30 text-white focus:border-cyan-500 focus:outline-none"
          />
        </SimpleCard>

        {/* Idioma */}
        <SimpleCard className="p-6">
          <label className="block font-bold mb-3 text-purple-400">Idioma:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-purple-500/30 text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
        </SimpleCard>

        {/* Notificaciones */}
        <SimpleCard className="p-6">
          <div className="flex justify-between items-center">
            <span className="font-bold text-pink-400">Notificaciones</span>
            <SimpleButton
              onClick={() => setNotifications(!notifications)}
              active={notifications}
              className={notifications ? "bg-green-500" : "bg-red-500"}
            >
              {notifications ? "Activadas" : "Desactivadas"}
            </SimpleButton>
          </div>
        </SimpleCard>

        {/* Info sistema */}
        <SimpleCard className="p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-400">ℹ️ Información del Sistema</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Versión del firmware:</span>
              <span className="text-blue-400">v2.1.4</span>
            </div>
            <div className="flex justify-between">
              <span>Última actualización:</span>
              <span className="text-blue-400">15/01/2024</span>
            </div>
            <div className="flex justify-between">
              <span>Tiempo de actividad:</span>
              <span className="text-green-400">24 días, 15 horas</span>
            </div>
            <div className="flex justify-between">
              <span>Dispositivos conectados:</span>
              <span className="text-blue-400">{devices.length}</span>
            </div>
          </div>
        </SimpleCard>
      </div>
    </div>
  )
}
