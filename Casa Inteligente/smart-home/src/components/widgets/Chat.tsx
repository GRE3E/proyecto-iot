"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import SimpleCard from "../UI/SimpleCard";
import SimpleButton from "../UI/SimpleButton";

// Inline SVG icons to avoid adding react-icons dependency
const MicSolid = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-3.08A7 7 0 0 0 17 11Z" />
  </svg>
);

const FuturisticHomeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2 3 9v13h6v-6h6v6h6V9L12 2z" />
    <circle cx="12" cy="14" r="2.5" />
    <path d="M15 14h2v2h-2zm-8 0h2v2H7z" />
  </svg>
);

const XIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UserIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CasaIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SettingsIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19.4 15A1.65 1.65 0 0 0 20.5 13.4C20.9 12.6 20.7 11.6 20.1 10.9L18.6 9.4C18 8.8 17.2 8.6 16.4 9L15.1 9.5C14.5 9.8 13.9 9.5 13.6 8.9L12.9 7.2C12.6 6.6 12.1 6.3 11.5 6.5L9.9 7.1C9.3 7.3 8.6 7 8.2 6.4L7 4.6C6.3 3.6 5.2 3.6 4.4 4.6L3.1 6.9C2.6 7.7 2.8 8.8 3.4 9.4L4.6 10.6C5.1 11.1 5 11.9 4.6 12.5L4 13.8C3.6 14.6 3.9 15.4 4.7 15.8L6.9 16.8C7.7 17.2 8.4 17 8.9 16.5L10.1 15.3C10.6 14.8 11.4 14.9 12 15.3L13.4 16.1C14.2 16.6 15.3 16.5 16 15.9L17.6 15.1C18.4 14.6 19 15 19.4 15Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PaperAirplaneIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 24 24"
    className={className}
  >
    <path d="M3.4 20.6a1 1 0 0 0 1.3.3l16-8.5a1 1 0 0 0 0-1.8l-16-8.5a1 1 0 0 0-1.4 1.2l2.3 7a1 1 0 0 0 .6.6l7 2.3a.25.25 0 0 1 0 .5l-7 2.3a1 1 0 0 0-.6.6l-2.3 7a1 1 0 0 0 .1.8Z" />
  </svg>
);


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
    let responseText = "🤖 CasaIA: He entendido tu solicitud.";
    if (textLower.includes("temperatura")) responseText = "🌡️ CasaIA: La temperatura actual es 22°C.";
    else if (textLower.includes("luz") || textLower.includes("luces")) responseText = "💡 CasaIA: He encendido las luces del salón.";

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
          const utter = new SpeechSynthesisUtterance(responseText.replace(/^🤖\s?CasaIA:\s?/, ""));
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
    <div className="w-full h-[640px] flex flex-col relative">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-full grid place-items-center bg-gradient-to-tr from-cyan-400 to-blue-700 text-black shadow-inner">
              <FuturisticHomeIcon className="w-6 h-6" />
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">CasaIA</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <SimpleButton
            onClick={() => setMessages([])}
            active
            className="px-3 py-2 rounded-lg text-xs bg-slate-700/60 text-white hover:bg-slate-600"
          >
            Limpiar
          </SimpleButton>
        </div>
      </header>

      <SimpleCard className="flex-1 flex flex-col p-0 overflow-hidden relative bg-gradient-to-br from-slate-900/60 to-slate-900/30 border border-slate-700/40 shadow-lg">
        {/* Mensajes */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-700 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-transparent">
          {messages.map((msg, i) => {
            const isUser = msg.sender === 'Tú';
            return (
              <div key={i} className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                    <CasaIcon />
                  </div>
                )}

                <div className={`max-w-[72%] p-3 rounded-2xl break-words shadow-lg ${isUser ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white ml-auto' : 'bg-gradient-to-r from-[#0f766e] to-[#16a34a] text-white mr-auto'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="block font-semibold text-sm">{msg.sender}</span>
                    <span className="text-[10px] text-slate-200/80">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-1 text-sm leading-relaxed">{msg.text}</div>
                </div>

                {isUser && (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
                    <UserIcon />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Typing indicator */}
        {isTyping && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                <CasaIcon />
              </div>
              <div className="bg-slate-700/30 px-4 py-2 rounded-xl text-sm text-slate-200 shadow-inner">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium">CasaIA está escribiendo</span>
                  <span className="ml-2 inline-block w-3 h-3 bg-white rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barra de mensaje futurista */}
        <div className="p-4 bg-gradient-to-t from-slate-900/50 to-transparent border-t border-slate-700/30 flex items-center gap-3 relative">
          <div className="flex items-center gap-3 w-full">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white">
              <UserIcon />
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
              placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter nueva línea)"
              className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-gray-900/40 via-gray-800/40 to-gray-900/40 border border-purple-500/30 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-500 shadow-md backdrop-blur-sm transition-all duration-300 resize-none"
            />

            <SimpleButton
              onClick={() => sendMessage()}
              active
              className="h-12 rounded-xl flex items-center justify-center text-lg bg-gradient-to-tr from-cyan-400 to-blue-600 shadow-xl hover:scale-105 transition-transform text-white"
              aria-label="Enviar mensaje"
              title="Enviar"
            >
              <PaperAirplaneIcon className="w-6 h-6" />
            </SimpleButton>

            {!voiceActive && (
              <SimpleButton
                onClick={toggleVoiceActive}
                active
                className="h-12 rounded-xl flex items-center justify-center text-lg bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-lg hover:scale-105 transition-transform"
                aria-label="Activar voz"
                title="Hablar"
              >
                <MicSolid/>
              </SimpleButton>
            )}

            {voiceActive && (
              <SimpleButton
                onClick={toggleVoiceActive}
                active
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg bg-red-600 text-white shadow-lg hover:scale-105 transition-transform"
                aria-label="Detener voz"
                title="Detener"
              >
                <XIcon />
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
            className="fixed top-1/2 left-1/2 w-64 h-64 z-50 -translate-x-1/2 -translate-y-1/2"
            onClick={toggleVoiceActive}
          >
            {/* Bola principal */}
              <motion.div
                className="relative w-64 h-64 rounded-full bg-gradient-to-br from-purple-600 to-pink-500/80 shadow-2xl flex items-center justify-center ring-8 ring-purple-800/30"
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

              <div className="relative w-56 h-56 rounded-full bg-black/20 backdrop-blur-lg grid place-items-center border border-white/10">
                <p className="text-white font-bold text-center text-lg">
                  {listening ? "🎤 Escuchando…" : "IA Activa"}
                </p>
                <p className="text-white text-xs mt-1 text-center">
                  Haz click para {listening ? "detener" : "cerrar"}
                </p>
                <div className="absolute bottom-3 right-3 text-white text-xs opacity-80 flex items-center gap-2">
                  <SettingsIcon />
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
