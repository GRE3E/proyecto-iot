"use client";

import { useEffect} from "react";
import { motion, AnimatePresence } from "framer-motion";
import SimpleCard from "../components/UI/Card";
import SimpleButton from "../components/UI/Button";
import {
  Mic,
  Send,
  Trash2,
  Bot,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useVoiceChat } from "../hooks/useVoiceChat";

export default function Chat() {
  const {
    messages,
    text,
    setText,
    listening,
    isTyping,
    voiceActive,
    toggleVoiceActive,
    sendMessage,
    clearMessages,
    messagesEndRef,
  } = useVoiceChat();

  // Scroll automático al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Enviar mensaje con Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && text.trim() !== "") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <SimpleCard className="relative flex flex-col w-full max-w-3xl h-[85vh] bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Bot className="w-5 h-5 text-blue-400" />
            <span>CasaIA Chat</span>
          </div>
          <button
            onClick={clearMessages}
            className="text-red-400 hover:text-red-500 transition"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm text-gray-300">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${
                  msg.sender === "Tú" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    msg.sender === "Tú"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-700/70 text-gray-100 rounded-bl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <div className="text-gray-500 italic text-xs px-2">
              CasaIA está escribiendo...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 p-4 border-t border-slate-700 bg-slate-900/60">
          {/* Micrófono */}
          <button
            onClick={toggleVoiceActive}
            className={`p-2 rounded-full transition ${
              listening
                ? "bg-red-600 text-white animate-pulse"
                : "bg-slate-800 text-gray-300 hover:bg-slate-700"
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Input de texto */}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              listening
                ? "Escuchando... habla ahora 🎤"
                : "Escribe tu mensaje..."
            }
            className="flex-1 bg-slate-800 text-white placeholder-gray-500 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Botón enviar */}
          <SimpleButton
            onClick={() => text.trim() && sendMessage()}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition"
          >
            <Send className="w-5 h-5" />
          </SimpleButton>

          {/* Control de voz */}
          <button
            onClick={toggleVoiceActive}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-gray-300"
          >
            {voiceActive ? (
              <Volume2 className="w-5 h-5 text-blue-400" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>
      </SimpleCard>
    </div>
  );
}
