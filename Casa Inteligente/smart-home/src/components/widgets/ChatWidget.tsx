import { Mic, Send } from "lucide-react";

interface ChatWidgetProps {
  text: string;
  setText: (value: string) => void;
  sendMessage: (msgText?: string) => void;
  voiceActive: boolean;
  toggleVoiceActive: () => void;
}

export default function ChatWidget({
  text,
  setText,
  sendMessage,
  voiceActive,
  toggleVoiceActive,
}: ChatWidgetProps) {
  return (
    <div className="flex items-center gap-2 p-3 border-t border-slate-700/40 bg-slate-900/60">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        placeholder="Escribe un mensaje..."
        className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 px-3 py-2 rounded-lg border border-slate-700 focus:border-blue-500 transition"
      />
      
      <button
        onClick={() => sendMessage()}
        disabled={!text.trim()}
        className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-white transition flex items-center justify-center"
        title="Enviar mensaje"
      >
        <Send className="w-5 h-5" />
      </button>

      <button
        onClick={toggleVoiceActive}
        className={`p-2 rounded-full ${
          voiceActive ? "bg-red-600" : "bg-slate-700"
        } text-white transition`}
        title={voiceActive ? "Detener grabación" : "Grabar voz"}
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );
}