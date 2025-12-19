import { useEffect, useState } from "react";
import { useGlobalWebSocket } from "../context/WebSocketContext";

export const useWebSocket = () => {
  const { isConnected, lastMessage, sendMessage, ws } = useGlobalWebSocket();
  const [message, setMessage] = useState<any>(null);

  useEffect(() => {
    if (lastMessage) {
      setMessage(lastMessage);
    }
  }, [lastMessage]);

  return { isConnected, message, sendMessage, ws };
};
