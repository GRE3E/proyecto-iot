"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import SimpleCard from "../UI/SimpleCard";
import SimpleButton from "../UI/SimpleButton";

interface Message {
  sender: string;
  text: string;
  timestamp: Date;
  type: "text";
}

const SpeechRecognition =
  (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) ||
  undefined;

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [listening, setListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const waveControls = useAnimation();

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voiceActive]);

  // Inicializar SpeechRecognition
  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "es-PE";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      startWaveAnimation();
    };

    recognition.onend = () => {
      setListening(false);
      stopWaveAnimation();
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setText(transcript);
    };

    recognitionRef.current = recognition;
  }, []);

  const startWaveAnimation = () => {
    waveControls.start({
      scale: [1, 1.3, 1],
      opacity: [0.5, 1, 0.5],
      transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
    });
  };
  const stopWaveAnimation = () => {
    waveControls.stop();
  };

  const sendMessage = (msgText?: string) => {
    const finalText = msgText ?? text;
    if (!finalText.trim()) return;
    const userMessage: Message = {
      sender: "Usuario",
      text: finalText,
      timestamp: new Date(),
      type: "text",
    };
    setMessages((prev) => [...prev, userMessage]);
    setText("");
    respondAI(userMessage);
  };

  const respondAI = (msg: Message) => {
    const responseText =
      msg.text.toLowerCase().includes("temperatura")
        ? "🌡️ La temperatura actual es 22°C"
        : "🤖 Smart Home ha recibido tu mensaje.";
    setTimeout(() => {
      const aiMessage: Message = {
        sender: "Smart Home",
        text: responseText,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 800);
  };

  const toggleVoiceActive = () => {
    setVoiceActive(!voiceActive);
    if (!voiceActive && recognitionRef.current) {
      recognitionRef.current.start();
    } else if (voiceActive && listening) {
      recognitionRef.current.stop();
    }
  };

  useEffect(() => {
    if (!listening && text.trim() && voiceActive) {
      sendMessage(text);
      setVoiceActive(false);
    }
  }, [listening]);

  return (
    <div className="w-full h-[600px] flex flex-col relative">
      <h2 className="text-4xl font-bold mb-4 text-center bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
        💬 Chat con Smart Home
      </h2>

      <SimpleCard className="flex-1 flex flex-col p-0 overflow-hidden relative">
        {/* Mensajes */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/20">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[70%] p-3 rounded-2xl break-words shadow ${
                msg.sender === "Usuario"
                  ? "ml-auto bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
                  : "mr-auto bg-gradient-to-r from-green-600 to-green-400 text-white"
              }`}
            >
              <span className="block font-semibold">{msg.sender}</span>
              <span>{msg.text}</span>
              <span className="text-xs text-slate-200 block mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Barra de mensaje futurista */}
        <div className="p-4 bg-slate-800/30 border-t border-slate-600/30 flex items-center gap-3 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-5 py-3 rounded-full bg-gradient-to-r from-gray-900/50 via-gray-800/50 to-gray-900/50 border border-purple-500/40 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-500 shadow-md backdrop-blur-sm transition-all duration-300"
          />

          <SimpleButton
            onClick={() => sendMessage()}
            active
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-gradient-to-tr from-purple-500 to-pink-500 shadow-lg hover:scale-110 transition-transform"
          >
            ➤
          </SimpleButton>

          {!voiceActive && (
            <SimpleButton
              onClick={toggleVoiceActive}
              active
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl bg-purple-600 text-white shadow-lg hover:scale-110 transition-transform"
            >
              🤖
            </SimpleButton>
          )}
        </div>
      </SimpleCard>

      {/* Bola IA animada futurista */}
      <AnimatePresence>
        {voiceActive && (
          <motion.div
            key="iaBall"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed top-1/2 left-1/2 w-64 h-64 z-50 -translate-x-1/2 -translate-y-1/2"
            onClick={toggleVoiceActive}
          >
            {/* Bola principal */}
            <motion.div
              className="relative w-64 h-64 rounded-full bg-purple-500/70 shadow-lg flex items-center justify-center"
              animate={waveControls}
            >
              {/* Ondas holográficas */}
              <motion.div
                className="absolute w-64 h-64 rounded-full border-4 border-purple-300/50"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0.1, 0.5],
                  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                }}
              />
              <motion.div
                className="absolute w-56 h-56 rounded-full border-2 border-purple-400/40"
                animate={{
                  scale: [1, 1.7, 1],
                  opacity: [0.3, 0.05, 0.3],
                  transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                }}
              />

              <div className="relative w-56 h-56 rounded-full bg-purple-400/30 backdrop-blur-lg grid place-items-center">
                <p className="text-white font-bold text-center">
                  {listening ? "🎤 Escuchando..." : "IA Activa"}
                </p>
                <p className="text-white text-xs mt-1 text-center">
                  Haz click para {listening ? "detener" : "cerrar"}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
