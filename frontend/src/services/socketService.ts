import { io, type Socket } from 'socket.io-client';
import { clientCache } from './cacheService';
import { store } from '../store';
import { paymentIngested, caseAnomaliesUpdated, fetchDashboardStatsThunk, fetchCasesThunk } from '../store/slices/reconciliationSlice';
import { setAgentStatus, updateQueueMetrics, setPipelineExecution, fetchAgentStatusThunk } from '../store/slices/agentControlSlice';
import { addLiveToast, pushAlert, incrementUnreadCount } from '../store/slices/notificationSlice';
import type { Payment } from '../types/reconciliation';
import type { PipelineExecution, QueueMetrics } from '../types/agent';
import type { NotificationAlert } from '../types/notification';

/**
 * Frontend WebSocket Service (Phase 6 Real-Time Event Layer)
 *
 * Establishes a persistent bidirectional connection with automatic exponential
 * backoff reconnection to stream multi-agent pipeline progress, payment ingestion alerts,
 * and SLA escalation notices into the Redux store and cache layer.
 */

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (!socket) {
    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.PROD
        ? 'https://finance-flow-agent.onrender.com'
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

    // Real-Time Event Listeners & Redux Store Dispatchers
    socket.on('PAYMENT_INGESTED', (data: unknown) => {
      clientCache.invalidateByTag('payments');
      clientCache.invalidateByTag('loans');
      clientCache.invalidateByTag('reports');
      clientCache.invalidateByTag('reconciliations');

      if (data && typeof data === 'object') {
        const payment = data as Payment;
        store.dispatch(paymentIngested(payment));
        store.dispatch(addLiveToast({
          title: 'Payment Ingested',
          message: `₹${Number(payment.amount || 0).toLocaleString('en-IN')} received from ${payment.sender_name || 'Bank'}`,
          type: 'info',
        }));
      }
      void store.dispatch(fetchDashboardStatsThunk());
      void store.dispatch(fetchCasesThunk());
    });

    socket.on('AGENT_STATUS', (data: unknown) => {
      if (data && typeof data === 'object') {
        const payload = data as { agentId: string; status: string; latency?: string };
        if (payload.agentId && payload.status) {
          store.dispatch(setAgentStatus(payload));
        }
      }
    });

    socket.on('PIPELINE_UPDATE', (data: unknown) => {
      if (data && typeof data === 'object') {
        store.dispatch(setPipelineExecution(data as PipelineExecution));
      }
      void store.dispatch(fetchAgentStatusThunk());
    });

    socket.on('QUEUE_METRICS', (data: unknown) => {
      if (data && typeof data === 'object') {
        store.dispatch(updateQueueMetrics(data as QueueMetrics));
      }
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

    socket.on('RECONCILIATION_COMPLETED', (data: unknown) => {
      clientCache.invalidateByTag('reconciliations');
      clientCache.invalidateByTag('payments');
      clientCache.invalidateByTag('reports');

      store.dispatch(addLiveToast({
        title: 'Reconciliation Resolved',
        message: (data as { message?: string })?.message || 'Reconciliation case completed successfully.',
        type: 'success',
      }));
      void store.dispatch(fetchDashboardStatsThunk());
      void store.dispatch(fetchCasesThunk());
    });

    socket.on('ANOMALY_DETECTED', (data: unknown) => {
      clientCache.invalidateByTag('anomalies');
      clientCache.invalidateByTag('payments');

      if (data && typeof data === 'object') {
        const payload = data as { caseId?: number; anomalyTypes?: string[]; severity?: string; message?: string };
        if (payload.caseId) {
          store.dispatch(caseAnomaliesUpdated({
            caseId: payload.caseId,
            anomalyTypes: payload.anomalyTypes || ['ANOMALY'],
            severity: payload.severity || 'HIGH',
          }));
        }
        store.dispatch(incrementUnreadCount());
        store.dispatch(addLiveToast({
          title: 'Agent 7 Anomaly Flagged',
          message: payload.message || `Case #${payload.caseId || ''} flagged for review`,
          type: 'warning',
        }));
      }
      void store.dispatch(fetchDashboardStatsThunk());
    });

    socket.on('NOTIFICATION_ALERT', (data: unknown) => {
      if (data && typeof data === 'object') {
        store.dispatch(pushAlert(data as NotificationAlert));
        store.dispatch(addLiveToast({
          title: 'Escalation Alert',
          message: (data as { title?: string; message?: string }).message || 'New operational notice received',
          type: 'warning',
        }));
      }
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
