"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Bot } from "lucide-react";
import PageHeader from "../components/UI/PageHeader";
import { useThemeByTime } from "../hooks/useThemeByTime";
import { useVoiceChat } from "../hooks/useVoiceChat";

export default function Chat() {
  const { colors } = useThemeByTime();
  const {
    messages,
    text,
    setText,
    listening,
    isTyping,
    toggleVoiceActive,
    sendMessage,
    messagesEndRef,
  } = useVoiceChat({ prefetchHistory: true });

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
    <div
      className={`p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full ${colors.background} ${colors.text}`}
    >
      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-md bg-black/50"
            onClick={toggleVoiceActive} // Permite detener la escucha haciendo clic en cualquier parte del popup
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`p-8 rounded-3xl shadow-lg flex flex-col items-center justify-center space-y-4 ${colors.cardBg} ${colors.text}`}
            >
              <Mic className="w-16 h-16 text-green-500 animate-pulse" />
              <p className="text-lg font-medium">Escuchando...</p>
              <p className="text-base text-gray-300">Haz clic para detener</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <PageHeader
        title="CHAT"
        icon={<Bot className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      {/* ÁREA DEL CHAT */}
      <div
        className={`flex flex-col w-full h-[78vh] backdrop-blur-md rounded-3xl border shadow-xl overflow-hidden ${colors.cardBg} ${colors.cardBorder}`}
      >
        {/* Sub-header dentro del chat */}
        <div
          className={`flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b ${colors.border}`}
        >
          <div className="flex items-center gap-2 font-medium text-lg">
            <Bot className="w-5 h-5" />
            <span>MURPHY</span>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${
                  msg.sender === "Tú" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${
                    msg.sender === "Tú"
                      ? `bg-gradient-to-r ${colors.primary} text-white rounded-br-none`
                      : `${colors.cardBg} ${colors.text} rounded-bl-none border ${colors.border}`
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
              className={`${colors.mutedText} italic text-xs px-2`}
            >
              MURPHY está escribiendo...
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR */}
        <div
          className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-6 md:py-3 border-t ${colors.border} backdrop-blur-sm`}
        >
          {/* Mic */}
          <button
            onClick={toggleVoiceActive}
            className={`h-10 w-10 md:h-11 md:w-11 flex items-center justify-center rounded-full transition-all ${
              listening
                ? "bg-green-500 text-white animate-pulse"
                : `${colors.cardBg} hover:shadow-md border ${colors.border}`
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
            className={`flex-1 rounded-xl px-4 py-2 text-sm focus:outline-none ${colors.inputBg} ${colors.inputBorder} border ${colors.text}`}
          />

          {/* Enviar */}
          <button
            onClick={() => canSend && sendMessage()}
            disabled={!canSend}
            className={`h-10 w-10 md:h-11 md:w-11 flex items-center justify-center rounded-full transition ${
              canSend
                ? `bg-gradient-to-r ${colors.primary} text-white`
                : `${colors.cardBg} cursor-not-allowed opacity-50`
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
