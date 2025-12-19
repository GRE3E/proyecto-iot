import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: any | null;
  sendMessage: (message: string) => void;
  ws: WebSocket | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      return;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const wsUrl = baseUrl.replace(/^http/, "ws");
    const clientId = "global_client";
    ws.current = new WebSocket(`${wsUrl}/ws/${clientId}`);

    ws.current.onopen = () => {
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastMessage(data);
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 3000);
    };

    ws.current.onerror = () => {
      setIsConnected(false);
      ws.current?.close();
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      ws.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    }
  }, []);

  return (
    <WebSocketContext.Provider
      value={{ isConnected, lastMessage, sendMessage, ws: ws.current }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useGlobalWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error(
      "useGlobalWebSocket must be used within a WebSocketProvider"
    );
  }
  return context;
};
