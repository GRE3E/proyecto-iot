"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import SimpleCard from "../UI/SimpleCard";
import SimpleButton from "../UI/SimpleButton";
import { 
  Mic, 
  Home, 
  X, 
  User, 
  Settings, 
  Send,
  Bot,
  Trash2
} from "lucide-react";

interface Message {
  sender: string; // 'Tú' or 'CasaIA'
  text: string;
  timestamp: Date;
  type: "text";
}

const SpeechRecognition =
  (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) ||
  undefined;

const SpeechSynthesisSupported = typeof window !== "undefined" && 'speechSynthesis' in window;

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [ttsEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

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
      sender: "Tú",
      text: finalText,
      timestamp: new Date(),
      type: "text",
    };
    setMessages((prev) => [...prev, userMessage]);
    setText("");
    respondAI(userMessage);
  };

  const respondAI = (msg: Message) => {
    // small rule-based responses
    const textLower = msg.text.toLowerCase();
    let responseText = "CasaIA: He entendido tu solicitud.";
    if (textLower.includes("temperatura")) responseText = "CasaIA: La temperatura actual es 22°C.";
    else if (textLower.includes("luz") || textLower.includes("luces")) responseText = "CasaIA: He encendido las luces del salón.";

    // Simulate typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const aiMessage: Message = {
        sender: "CasaIA",
        text: responseText,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Reproducir voz de la IA si está habilitado
      if (SpeechSynthesisSupported && ttsEnabled) {
        try {
          const utter = new SpeechSynthesisUtterance(responseText.replace(/^CasaIA:\s?/, ""));
          // Spanish voice preference heuristics
          const voices = window.speechSynthesis.getVoices();
          const priority = [/(es-)|(spanish)|Google/i, /Microsoft/i, /Amazon/i];
          let chosen: SpeechSynthesisVoice | undefined = undefined;
          for (const p of priority) {
            chosen = voices.find((v) => p.test(v.name || "") || p.test(v.lang || ""));
            if (chosen) break;
          }
          if (!chosen) chosen = voices.find((v) => /es|spanish/i.test(v.lang || v.name));
          if (chosen) utter.voice = chosen;
          utter.lang = chosen ? chosen.lang : 'es-ES';
          utter.pitch = 1;
          utter.rate = 1;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        } catch (e) {
          console.warn('TTS failed', e);
        }
      }
    }, 900 + Math.min(1600, msg.text.length * 30));
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
    <div className="w-full h-[540px] md:h-[640px] flex flex-col relative font-inter">
      <header className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="w-8 md:w-10 h-8 md:h-10 rounded-full grid place-items-center bg-gradient-to-tr from-cyan-400 to-blue-700 text-black shadow-inner">
              <Home className="w-4 md:w-6 h-4 md:h-6" />
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">CasaIA</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <SimpleButton
            onClick={() => setMessages([])}
            active
            className="px-3 py-2 rounded-lg text-xs bg-slate-700/60 text-white hover:bg-slate-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Limpiar</span>
          </SimpleButton>
        </div>
      </header>

      <SimpleCard className="flex-1 flex flex-col p-0 overflow-hidden relative bg-gradient-to-br from-slate-900/60 to-slate-900/30 border border-slate-700/40 shadow-lg">
        {/* Mensajes */}
        <div className="flex-1 p-3 md:p-4 overflow-y-auto space-y-3 md:space-y-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-700 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-transparent">
          {messages.map((msg, i) => {
            const isUser = msg.sender === 'Tú';
            return (
              <div key={i} className={`flex items-end gap-2 md:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 md:w-12 h-8 md:h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                    <Bot className="w-4 md:w-5 h-4 md:h-5" />
                  </div>
                )}

                <div className={`max-w-[85%] md:max-w-[72%] p-3 rounded-2xl break-words shadow-lg ${isUser ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white ml-auto' : 'bg-gradient-to-r from-[#0f766e] to-[#16a34a] text-white mr-auto'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="block font-semibold text-xs md:text-sm">{msg.sender}</span>
                    <span className="text-[10px] text-slate-200/80">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-1 text-xs md:text-sm leading-relaxed">{msg.text}</div>
                </div>

                {isUser && (
                  <div className="w-8 md:w-10 h-8 md:h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
                    <User className="w-4 md:w-5 h-4 md:h-5" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Typing indicator */}
        {isTyping && (
          <div className="px-3 md:px-4 pb-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 md:w-12 h-8 md:h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                <Bot className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <div className="bg-slate-700/30 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm text-slate-200 shadow-inner">
                <div className="flex items-center gap-1">
                  <span className="font-medium">CasaIA está escribiendo</span>
                  <span className="ml-2 inline-block w-2 md:w-3 h-2 md:h-3 bg-white rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barra de mensaje futurista */}
        <div className="p-3 md:p-4 bg-gradient-to-t from-slate-900/50 to-transparent border-t border-slate-700/30 flex items-center gap-2 md:gap-3 relative">
          <div className="flex items-center gap-2 md:gap-3 w-full">
            <div className="w-8 md:w-12 h-8 md:h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
              <User className="w-4 md:w-5 h-4 md:h-5" />
            </div>
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Escribe tu mensaje..."
              className="flex-1 px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl bg-gradient-to-r from-gray-900/40 via-gray-800/40 to-gray-900/40 border border-purple-500/30 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-500 shadow-md backdrop-blur-sm transition-all duration-300 resize-none text-sm md:text-base"
            />

            <SimpleButton
              onClick={() => sendMessage()}
              active
              className="h-8 md:h-12 w-8 md:w-12 rounded-xl flex items-center justify-center text-lg bg-gradient-to-tr from-cyan-400 to-blue-600 shadow-xl hover:scale-105 transition-transform text-white flex-shrink-0"
              aria-label="Enviar mensaje"
              title="Enviar"
            >
              <Send className="w-4 md:w-6 h-4 md:h-6" />
            </SimpleButton>

            {!voiceActive && (
              <SimpleButton
                onClick={toggleVoiceActive}
                active
                className="h-8 md:h-12 w-8 md:w-12 rounded-xl flex items-center justify-center text-lg bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-lg hover:scale-105 transition-transform flex-shrink-0"
                aria-label="Activar voz"
                title="Hablar"
              >
                <Mic className="w-4 md:w-6 h-4 md:h-6" />
              </SimpleButton>
            )}

            {voiceActive && (
              <SimpleButton
                onClick={toggleVoiceActive}
                active
                className="w-8 md:w-12 h-8 md:h-12 rounded-xl flex items-center justify-center text-lg bg-red-600 text-white shadow-lg hover:scale-105 transition-transform flex-shrink-0"
                aria-label="Detener voz"
                title="Detener"
              >
                <X className="w-4 md:w-5 h-4 md:h-5" />
              </SimpleButton>
            )}
          </div>
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
            className="fixed top-1/2 left-1/2 w-48 md:w-64 h-48 md:h-64 z-50 -translate-x-1/2 -translate-y-1/2"
            onClick={toggleVoiceActive}
          >
            {/* Bola principal */}
            <motion.div
              className="relative w-48 md:w-64 h-48 md:h-64 rounded-full bg-gradient-to-br from-purple-600 to-pink-500/80 shadow-2xl flex items-center justify-center ring-4 md:ring-8 ring-purple-800/30"
              animate={waveControls}
            >
              {/* Ondas holográficas */}
              <motion.div
                className="absolute w-48 md:w-64 h-48 md:h-64 rounded-full border-2 md:border-4 border-purple-300/50"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0.1, 0.5],
                  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                }}
              />
              <motion.div
                className="absolute w-40 md:w-56 h-40 md:h-56 rounded-full border-2 border-purple-400/40"
                animate={{
                  scale: [1, 1.7, 1],
                  opacity: [0.3, 0.05, 0.3],
                  transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                }}
              />

              <div className="relative w-40 md:w-56 h-40 md:h-56 rounded-full bg-black/20 backdrop-blur-lg grid place-items-center border border-white/10">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Mic className="w-6 md:w-8 h-6 md:h-8 text-white" />
                  </div>
                  <p className="text-white font-bold text-center text-sm md:text-lg font-inter">
                    {listening ? "Escuchando..." : "IA Activa"}
                  </p>
                  <p className="text-white text-xs mt-1 text-center">
                    Haz click para {listening ? "detener" : "cerrar"}
                  </p>
                </div>
                <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 text-white text-xs opacity-80 flex items-center gap-2">
                  <Settings className="w-3 md:w-4 h-3 md:h-4" />
                  <span>Voz: {SpeechSynthesisSupported ? 'On' : 'No disponible'}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}