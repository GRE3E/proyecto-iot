"use client"
import SimpleCard from "../UI/SimpleCard"
import { Camera, MapPin, Wifi, WifiOff } from "lucide-react"

export default function SimpleSecurityCamera({ cameraOn, location }: { cameraOn: boolean; location: string }) {
  return (
    <SimpleCard className="p-4 font-inter">
      <div className="flex flex-col items-center">
        <div className="w-full h-32 md:h-40 bg-slate-900/60 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
          {cameraOn ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5 animate-pulse" />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Camera className="w-4 md:w-5 h-4 md:h-5 text-green-400" />
                </div>
                <div className="flex items-center gap-2 text-green-400">
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs md:text-sm font-medium">Transmitiendo...</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-rose-500/5" />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Camera className="w-4 md:w-5 h-4 md:h-5 text-red-400" />
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs md:text-sm font-medium">Cámara apagada</span>
                </div>
              </div>
            </>
          )}
          
          {/* Status indicator */}
          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${cameraOn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        </div>
        
        <div className="mt-3 flex items-center gap-2 text-slate-300">
          <MapPin className="w-4 h-4 text-slate-400" />
          <p className="text-sm md:text-base font-medium">{location}</p>
        </div>
      </div>
    </SimpleCard>
  )
}