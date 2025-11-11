import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from './useAuth';
import { useVoiceRecognition } from "./useVoiceRecognition";
import { speakText, SpeechSynthesisSupported } from "../utils/voiceUtils";
import { useAnimation } from "framer-motion";
import { axiosInstance } from "../services/authService";

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

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axiosInstance.get(`/nlp/nlp/history?limit=50`);
        const data = response.data;
        const formattedMessages: Message[] = data.history.flatMap((item: any) => {
          const msgs: Message[] = [];
          if (item.user_message) {
            msgs.push({ sender: "Tú", text: item.user_message, timestamp: new Date(), type: "text" });
          }
          if (item.assistant_message) {
            msgs.push({ sender: "CasaIA", text: item.assistant_message, timestamp: new Date(), type: "text" });
          }
          return msgs;
        });
        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchHistory();
  }, []);

  // Reconocimiento de voz
  const { listening, startListening, stopListening } = useVoiceRecognition({
    onResult: (transcript) => {
      setText(transcript);
    },
    onStart: () => startWaveAnimation(),
    onEnd: () => stopWaveAnimation(),
    onAudioProcessed: (apiResponse: any) => {
      if (apiResponse) {
        // Añadir el mensaje del usuario al chat
        if (apiResponse.transcribed_text) {
          const userMessage: Message = {
            sender: "Tú",
            text: apiResponse.transcribed_text,
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => [...prev, userMessage]);
        }

        // Añadir la respuesta de la IA al chat
        if (apiResponse.nlp_response) {
          const aiMessage: Message = {
            sender: "CasaIA",
            text: apiResponse.nlp_response,
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => [...prev, aiMessage]);
        }
      } else {
        console.error("Respuesta de API inesperada de useVoiceRecognition:", apiResponse);
      }
    },
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

  const respondAI = async (msg: Message) => {
    setIsTyping(true);

    try {
      const response = await axiosInstance.post(`/nlp/nlp/query`, { prompt: msg.text });

      const data = response.data;
      console.log("API Response Data:", data); // Agregado para depuración
      const aiResponseText = data.response || "Lo siento, no pude obtener una respuesta.";

      setIsTyping(false);
      const aiMessage: Message = {
        sender: "CasaIA",
        text: aiResponseText,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (SpeechSynthesisSupported) speakText(aiResponseText);
    } catch (error) {
      console.error("Error sending message to AI:", error);
      setIsTyping(false);
      const errorMessage: Message = {
        sender: "CasaIA",
        text: "Lo siento, hubo un error al comunicarse con la IA.",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
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
