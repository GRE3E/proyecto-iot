//chat flotante rapido
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import ChatWidget from "../widgets/ChatWidget";
import { useVoiceChat } from "../../hooks/useVoiceChat";
import { Bot, Maximize2, X } from "lucide-react";

export default function MiniChat() {
  const [open, setOpen] = useState(false);
  const {
    text,
    setText,
    sendMessage,
    voiceActive,
    toggleVoiceActive,
  } = useVoiceChat();

  // 👉 Redirige al chat completo
  const handleExpand = () => {
    window.location.href = "../../pages/Chat";
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Botón flotante */}
      {!open && (
        <motion.button
          onClick={() => setOpen(true)}
          whileTap={{ scale: 0.9 }}
          className="p-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-lg hover:shadow-purple-400/30 transition flex items-center justify-center"
        >
          <Bot className="w-6 h-6" />
        </motion.button>
      )}

      {/* Ventana del minichat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-20 right-0 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/60">
              <h3 className="text-sm font-semibold text-white">CasaIA</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExpand}
                  className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1 text-xs"
                >
                  <Maximize2 className="w-4 h-4" />
                  Pantalla completa
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cuerpo del chat */}
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex-1 text-gray-400 text-sm p-3 overflow-y-auto">
                <p>👋 Hola, soy CasaIA. ¿En qué puedo ayudarte hoy?</p>
              </div>

              {/* ChatWidget (ya con props del hook) */}
              <ChatWidget
                text={text}
                setText={setText}
                sendMessage={sendMessage}
                voiceActive={voiceActive}
                toggleVoiceActive={toggleVoiceActive}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
