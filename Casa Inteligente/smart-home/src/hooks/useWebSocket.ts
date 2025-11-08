import { useEffect, useRef, useState, useCallback } from "react";

export const useWebSocket = (clientId: string) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<any>(null);

  const connect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const wsUrl = baseUrl.replace(/^http/, "ws");
    ws.current = new WebSocket(`${wsUrl}/ws/${clientId}`);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessage(data);
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      // Implement reconnection logic here if needed
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };
  }, [clientId]);

  useEffect(() => {
    connect();

    return () => {
      ws.current?.close();
    };
  }, [connect]);

  return { isConnected, message };
};
