"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Bot} from "lucide-react";
import ProfileNotifications from "../components/UI/ProfileNotifications";
import { useVoiceChat } from "../hooks/useVoiceChat";

export default function Chat() {
  const {
    messages,
    text,
    setText,
    listening,
    isTyping,
    toggleVoiceActive,
    sendMessage,
    messagesEndRef,
  } = useVoiceChat();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && text.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  const canSend = text.trim() !== "";

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter">
      {/* 🔹 HEADER PRINCIPAL — igual que las otras secciones */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 -mt-1 md:-mt-2 relative">
        {/* Título con ícono */}
        <div className="flex items-center gap-4 -mt-6 md:-mt-7">
          <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20">
            <Bot className="w-8 md:w-10 h-8 md:h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight translate-y-[0px] md:translate-y-[-4px]">
            CHAT
          </h2>
        </div>

        {/* PERFIL + NOTIFICACIONES */}
        <ProfileNotifications />
      </div>

      {/* 🔹 ÁREA DEL CHAT */}
      <div className="flex flex-col w-full h-[78vh] bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 shadow-xl overflow-hidden">

        {/* Sub-header dentro del chat */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-2 text-gray-200 font-medium text-lg">
            <Bot className="w-5 h-5 text-blue-400" />
            <span>MURPHY</span>
          </div>
        </div>

        {/* 💬 Mensajes */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.sender === "Tú" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${
                    msg.sender === "Tú"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-800/70 text-gray-100 rounded-bl-none border border-slate-700/60"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-500 italic text-xs px-2"
            >
              CasaIA está escribiendo...
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 🔹 INPUT BAR */}
        <div className="flex items-center gap-2 md:gap-3 px-3 py-2 md:px-6 md:py-3 border-t border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          {/* Mic */}
          <button
            onClick={toggleVoiceActive}
            className={`h-10 w-10 md:h-11 md:w-11 flex items-center justify-center rounded-full transition-all ${
              listening
                ? "bg-red-600 text-white animate-pulse"
                : "bg-slate-800 text-gray-400 hover:text-blue-400"
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Campo de texto */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={listening ? "Escuchando..." : "Escribe tu mensaje..."}
            className="flex-1 bg-slate-800/60 text-white placeholder-gray-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Enviar */}
          <button
            onClick={() => canSend && sendMessage()}
            disabled={!canSend}
            className={`h-10 w-10 md:h-11 md:w-11 flex items-center justify-center rounded-full transition ${
              canSend
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
