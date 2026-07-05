import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState({}); // machine_id -> sensor log object
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);

  const connectWebSocket = () => {
    if (!user) return;
    
    // Clear any existing reconnects
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const wsUrl = api.getWebSocketUrl();
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established.');
      setConnected(true);
      retryCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'telemetry') {
          setTelemetry((prev) => ({
            ...prev,
            [data.machine_id]: data,
          }));
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.reason || 'No reason provided'}`);
      setConnected(false);
      wsRef.current = null;
      
      // Retry with backoff if user is still logged in
      if (user) {
        const backoff = Math.min(1000 * Math.pow(2, retryCountRef.current), 16000);
        retryCountRef.current += 1;
        console.log(`Retrying WebSocket connection in ${backoff}ms...`);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, backoff);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket connection error:', error);
      ws.close();
    };
  };

  useEffect(() => {
    if (user) {
      connectWebSocket();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setTelemetry({});
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user]);

  const sendCommand = (cmd) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd);
      return true;
    }
    return false;
  };

  return (
    <SocketContext.Provider value={{ connected, telemetry, sendCommand }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
