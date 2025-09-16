"use client"
import { useState } from "react"
import SimpleCard from "../UI/SimpleCard"
import SimpleButton from "../UI/SimpleButton"
import SimpleSecurityCamera from "../widgets/SecurityCamera"

export default function Seguridad() {
  const [securityOn, setSecurityOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)

  return (
    <div>
      <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        🔐 Sistema de Seguridad
      </h2>

      {/* Botones principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SimpleCard className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🛡️</div>
            <h3 className="text-xl font-bold mb-2 text-green-400">Sistema Armado</h3>
            <SimpleButton
              onClick={() => setSecurityOn(!securityOn)}
              active={securityOn}
              className={securityOn ? "bg-green-500" : "bg-red-500"}
            >
              {securityOn ? "ACTIVADO" : "DESACTIVADO"}
            </SimpleButton>
          </div>
        </SimpleCard>

        <SimpleCard className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">📹</div>
            <h3 className="text-xl font-bold mb-2 text-blue-400">Cámaras</h3>
            <SimpleButton
              onClick={() => setCameraOn(!cameraOn)}
              active={cameraOn}
              className={cameraOn ? "bg-green-500" : "bg-red-500"}
            >
              {cameraOn ? "ACTIVAS" : "INACTIVAS"}
            </SimpleButton>
          </div>
        </SimpleCard>

        <SimpleCard className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🚨</div>
            <h3 className="text-xl font-bold mb-2 text-yellow-400">Alertas</h3>
            <p className="text-2xl font-bold text-green-400">0 Activas</p>
          </div>
        </SimpleCard>
      </div>

      {/* Cámaras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <SimpleSecurityCamera cameraOn={cameraOn} location="Entrada Principal" />
        <SimpleSecurityCamera cameraOn={cameraOn} location="Sala de Estar" />
        <SimpleSecurityCamera cameraOn={cameraOn} location="Jardín Trasero" />
        <SimpleSecurityCamera cameraOn={cameraOn} location="Garaje" />
        <SimpleSecurityCamera cameraOn={cameraOn} location="Cocina" />
        <SimpleSecurityCamera cameraOn={cameraOn} location="Pasillo" />
      </div>
    </div>
  )
}
