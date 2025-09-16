"use client"
import SimpleCard from "../UI/SimpleCard"

export default function SimpleSecurityCamera({ cameraOn, location }: { cameraOn: boolean; location: string }) {
  return (
    <SimpleCard className="p-4">
      <div className="flex flex-col items-center">
        <div className="w-full h-40 bg-slate-900/60 rounded-lg flex items-center justify-center">
          {cameraOn ? (
            <span className="text-green-400">📡 Transmitiendo...</span>
          ) : (
            <span className="text-red-400">❌ Cámara apagada</span>
          )}
        </div>
        <p className="mt-2 text-slate-300">{location}</p>
      </div>
    </SimpleCard>
  )
}
