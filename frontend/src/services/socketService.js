import { io } from 'socket.io-client';

/**
 * Frontend WebSocket Service (Phase 6 Real-Time Event Layer)
 *
 * Establishes a persistent bidirectional connection with automatic exponential
 * backoff reconnection to stream multi-agent pipeline progress, payment ingestion alerts,
 * and SLA escalation notices.
 */

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? 'https://finance-flow-agent.onrender.com' : 'http://localhost:5000');
    
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log('⚡ [Frontend Socket Connected] ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ [Frontend Socket Disconnected] Reason:', reason);
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 [Socket Reconnecting] Attempt #${attempt}...`);
    });

    socket.on('reconnect', (attempt) => {
      console.log(`✅ [Socket Reconnected] Successfully re-established after ${attempt} attempts.`);
    });

    socket.on('reconnect_error', (error) => {
      console.warn('⚠️ [Socket Reconnect Error]:', error.message);
    });
  }
  return socket;
};

export const getSocket = () => socket;

/**
 * Helper to subscribe to any socket event and return an unsubscribe cleanup function.
 */
export const subscribeToSocketEvent = (eventName, callback) => {
  const s = connectSocket();
  if (s) {
    s.on(eventName, callback);
    return () => s.off(eventName, callback);
  }
  return () => {};
};
