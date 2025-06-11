import { useState, useRef, useCallback, useEffect } from 'react';
import { WebSocketMessage } from '../types/interview';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connect: (url: string) => void;
  disconnect: () => void;
  sendMessage: (message: WebSocketMessage) => void;
  sendAudio: (audioData: ArrayBuffer) => void;
  error: string | null;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 3,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const urlRef = useRef<string>('');
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  };

  const handleConnect = useCallback(() => {
    setIsConnected(true);
    setError(null);
    reconnectCountRef.current = 0;
    onConnect?.();
  }, [onConnect]);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  const handleError = useCallback((event: Event) => {
    setError('WebSocket connection error');
    onError?.(event);
  }, [onError]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      if (typeof event.data === 'string') {
        // JSON message
        const message: WebSocketMessage = JSON.parse(event.data);
        onMessage?.(message);
      } else if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        // Binary audio data
        const audioMessage: WebSocketMessage = {
          type: 'audio',
          data: event.data,
          timestamp: Date.now(),
        };
        onMessage?.(audioMessage);
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
      setError('Error parsing message');
    }
  }, [onMessage]);

  const attemptReconnect = useCallback(() => {
    if (reconnectCountRef.current < reconnectAttempts && urlRef.current) {
      reconnectCountRef.current += 1;
      console.log(`Attempting to reconnect (${reconnectCountRef.current}/${reconnectAttempts})...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(urlRef.current);
      }, reconnectInterval);
    } else {
      setError('Connection failed after multiple attempts');
    }
  }, [reconnectAttempts, reconnectInterval]);

  const connect = useCallback((url: string) => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    urlRef.current = url;
    clearReconnectTimeout();

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = handleConnect;
      ws.onclose = (event) => {
        handleDisconnect();
        
        // Attempt reconnect if it wasn't a manual close
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          attemptReconnect();
        }
      };
      ws.onerror = handleError;
      ws.onmessage = handleMessage;

    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [handleConnect, handleDisconnect, handleError, handleMessage, attemptReconnect, reconnectAttempts]);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    reconnectCountRef.current = reconnectAttempts; // Prevent reconnection
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setError(null);
  }, [reconnectAttempts]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (err) {
        console.error('Error sending WebSocket message:', err);
        setError('Error sending message');
      }
    } else {
      console.warn('WebSocket is not connected');
      setError('WebSocket is not connected');
    }
  }, []);

  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(audioData);
      } catch (err) {
        console.error('Error sending audio data:', err);
        setError('Error sending audio data');
      }
    } else {
      console.warn('WebSocket is not connected');
      setError('WebSocket is not connected');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage,
    sendAudio,
    error,
  };
};