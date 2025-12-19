export interface VoiceOptions {
  lang?: string;
  pitch?: number;
  rate?: number;
}

export const SpeechSynthesisSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Reproduce texto usando TTS (Text To Speech)
 */
export function speakText(
  text: string,
  options: VoiceOptions = { lang: "es-PE", pitch: 1, rate: 1 }
) {
  if (!SpeechSynthesisSupported) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = options.lang || "es-PE";
  utter.pitch = options.pitch || 1;
  utter.rate = options.rate || 1;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => /es-PE|es-ES|spanish/i.test(v.lang) || /Google|Microsoft/i.test(v.name)
  );
  if (preferred) utter.voice = preferred;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

/**
 * Genera una respuesta básica de IA tipo "CasaIA"
 */
export function generateAIResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes("temperatura")) return "CasaIA: La temperatura actual es de 22°C.";
  if (lower.includes("luz") || lower.includes("luces"))
    return "CasaIA: He encendido las luces del salón.";
  if (lower.includes("puerta")) return "CasaIA: La puerta principal está cerrada.";
  if (lower.includes("alarma")) return "CasaIA: El sistema de alarma está activado.";

  return "CasaIA: He entendido tu solicitud.";
}
