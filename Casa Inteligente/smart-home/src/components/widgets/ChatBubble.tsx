//Burbuja de conversación (IA/usuario)
"use client";

interface ChatBubbleProps {
    msg: {
        sender: "Tú" | "CasaIA"; 
        text: string;
    };
}

export default function ChatBubble({ msg }: ChatBubbleProps) {
  const isUser = msg.sender === "Tú";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}
    >
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-md ${
          isUser
            ? "bg-gradient-to-r from-blue-600 to-cyan-400 text-white"
            : "bg-slate-800 text-gray-200 border border-slate-700/50"
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}
