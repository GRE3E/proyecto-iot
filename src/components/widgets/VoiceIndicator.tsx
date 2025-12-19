//Animacion de microfono activado/desactivado
"use client";
import { motion } from "framer-motion";

interface VoiceIndicatorProps {
  listening: boolean;
  waveControls: any;
}

export default function VoiceIndicator({ listening, waveControls }: VoiceIndicatorProps) {
  return (
    <motion.div
      animate={waveControls}
      className="flex justify-start pl-4 py-2"
    >
      <div className="text-sm text-gray-400 italic">
        {listening ? "Escuchando..." : "CasaIA está escribiendo..."}
      </div>
    </motion.div>
  );
}
