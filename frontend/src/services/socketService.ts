import { io, type Socket } from 'socket.io-client';
import { clientCache } from './cacheService';

/**
 * Frontend WebSocket Service (Phase 6 Real-Time Event Layer)
 *
 * Establishes a persistent bidirectional connection with automatic exponential
 * backoff reconnection to stream multi-agent pipeline progress, payment ingestion alerts,
 * and SLA escalation notices.
 */

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (!socket) {
    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.PROD
        ? 'https://finance-flow-agent-1.onrender.com'
        : 'http://localhost:5000');

    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Frontend Socket Connected] ID:', socket?.id);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('⚡ [Frontend Socket Disconnected] Reason:', reason);
    });

    socket.on('reconnect_attempt', (attempt: number) => {
      console.log(`🔄 [Socket Reconnecting] Attempt #${attempt}...`);
    });

    socket.on('reconnect', (attempt: number) => {
      console.log(`✅ [Socket Reconnected] Successfully re-established after ${attempt} attempts.`);
    });

    socket.on('reconnect_error', (error: Error) => {
      console.warn('⚠️ [Socket Reconnect Error]:', error.message);
    });

    // Real-Time Local Cache Invalidation Listeners
    socket.on('PAYMENT_INGESTED', () => {
      clientCache.invalidateByTag('payments');
      clientCache.invalidateByTag('loans');
      clientCache.invalidateByTag('reports');
      clientCache.invalidateByTag('reconciliations');
    });

    socket.on('COMPANY_CREATED', () => {
      clientCache.invalidateByTag('companies');
      clientCache.invalidateByTag('reports');
    });

    socket.on('COMPANY_UPDATED', () => {
      clientCache.invalidateByTag('companies');
      clientCache.invalidateByTag('reports');
    });

    socket.on('COMPANY_DELETED', () => {
      clientCache.invalidateByTag('companies');
      clientCache.invalidateByTag('reports');
    });

    socket.on('ALERT_RESOLVED', () => {
      clientCache.invalidateByTag('notifications');
      clientCache.invalidateByTag('reports');
    });

    socket.on('RECONCILIATION_COMPLETED', () => {
      clientCache.invalidateByTag('reconciliations');
      clientCache.invalidateByTag('payments');
      clientCache.invalidateByTag('reports');
    });

    socket.on('ANOMALY_DETECTED', () => {
      clientCache.invalidateByTag('anomalies');
      clientCache.invalidateByTag('payments');
    });
  }
  return socket;
};

export const getSocket = (): Socket | null => socket;

/**
 * Subscribe to any socket event and return an unsubscribe cleanup function.
 */
export const subscribeToSocketEvent = (
  eventName: string,
  callback: (...args: unknown[]) => void
): (() => void) => {
  const s = connectSocket();
  if (s) {
    s.on(eventName, callback);
    return () => s.off(eventName, callback);
  }
  return () => {};
};
