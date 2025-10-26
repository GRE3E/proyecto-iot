import { useState, useRef, useEffect } from "react";

interface UseVoiceRecognitionProps {
  lang?: string;
  onResult?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useVoiceRecognition({
  lang = "es-PE",
  onResult,
  onStart,
  onEnd,
}: UseVoiceRecognitionProps = {}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      onStart?.();
    };

    recognition.onend = () => {
      setListening(false);
      onEnd?.();
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      onResult?.(transcript);
    };

    recognitionRef.current = recognition;
  }, [lang]);

  const startListening = () => {
    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.warn("SpeechRecognition start error:", err);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch (err) {
      console.warn("SpeechRecognition stop error:", err);
    }
  };

  return { listening, startListening, stopListening };
}
