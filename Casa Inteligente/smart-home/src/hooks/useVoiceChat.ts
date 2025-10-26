import { useState, useRef, useEffect } from "react";
import { useVoiceRecognition } from "./useVoiceRecognition";
import { speakText, generateAIResponse, SpeechSynthesisSupported } from "../utils/voiceUtils";
import { useAnimation } from "framer-motion";

export interface Message {
  sender: "Tú" | "CasaIA";
  text: string;
  timestamp: Date;
  type: "text";
}

export function useVoiceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const waveControls = useAnimation();

  // Reconocimiento de voz
  const { listening, startListening, stopListening } = useVoiceRecognition({
    onResult: (transcript) => setText(transcript),
    onStart: () => startWaveAnimation(),
    onEnd: () => stopWaveAnimation(),
  });

  // Auto scroll de mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voiceActive]);

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
    const responseText = generateAIResponse(msg.text);
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

      // Reproducir voz
      if (SpeechSynthesisSupported) speakText(responseText.replace(/^CasaIA:\s?/, ""));
    }, 900 + Math.min(1600, msg.text.length * 30));
  };

  const toggleVoiceActive = () => {
    setVoiceActive((prev) => !prev);
    if (!voiceActive) startListening();
    else stopListening();
  };

  useEffect(() => {
    if (!listening && text.trim() && voiceActive) {
      sendMessage(text);
      setVoiceActive(false);
    }
  }, [listening]);

  const clearMessages = () => setMessages([]);

  return {
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
    waveControls,
    SpeechSynthesisSupported: "speechSynthesis" in window,
  };
}
