import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { NotificationAlert, EnrichedAlert } from '../../types/notification';
import { getAlerts, batchDismissAlerts } from '../../services/notificationService';

export interface LiveToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}

interface NotificationState {
  alerts: NotificationAlert[];
  unreadCount: number;
  liveToasts: LiveToastItem[];
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  alerts: [],
  unreadCount: 0,
  liveToasts: [],
  loading: false,
  error: null,
};

export const fetchAlertsThunk = createAsyncThunk(
  'notifications/fetchAlerts',
  async (params: { status?: string; limit?: number } | undefined, { rejectWithValue }) => {
    try {
      const res = await getAlerts(params);
      const data = res?.data?.data || res?.data || [];
      return Array.isArray(data) ? (data as NotificationAlert[]) : [];
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to fetch alerts';
      return rejectWithValue(message);
    }
  }
);

export const dismissAlertsThunk = createAsyncThunk(
  'notifications/dismissAlerts',
  async (alertIds: number[], { rejectWithValue }) => {
    try {
      await batchDismissAlerts(alertIds);
      return alertIds;
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to dismiss alerts';
      return rejectWithValue(message);
    }
  }
);

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addLiveToast: (state, action: PayloadAction<Omit<LiveToastItem, 'id' | 'timestamp'> & { id?: string }>) => {
      const toast: LiveToastItem = {
        id: action.payload.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: action.payload.title,
        message: action.payload.message,
        type: action.payload.type,
        timestamp: Date.now(),
      };
      state.liveToasts.unshift(toast);
      if (state.liveToasts.length > 5) {
        state.liveToasts = state.liveToasts.slice(0, 5);
      }
    },
    removeLiveToast: (state, action: PayloadAction<string>) => {
      state.liveToasts = state.liveToasts.filter(t => t.id !== action.payload);
    },
    pushAlert: (state, action: PayloadAction<NotificationAlert | EnrichedAlert>) => {
      state.alerts.unshift(action.payload as NotificationAlert);
      state.unreadCount += 1;
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    decrementUnreadCount: (state) => {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlertsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAlertsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload;
        const unread = action.payload.filter(
          (a: NotificationAlert) => a.status === 'pending' || a.status === 'unread' || a.status === 'NEW'
        ).length;
        state.unreadCount = unread;
      })
      .addCase(fetchAlertsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch alerts';
      })
      .addCase(dismissAlertsThunk.fulfilled, (state, action) => {
        const markedIds = new Set(action.payload);
        state.alerts = state.alerts.map(a => markedIds.has(a.id) ? { ...a, status: 'dismissed' } : a);
        state.unreadCount = Math.max(0, state.unreadCount - markedIds.size);
      });
  },
});

export const {
  addLiveToast,
  removeLiveToast,
  pushAlert,
  setUnreadCount,
  incrementUnreadCount,
  decrementUnreadCount,
} = notificationSlice.actions;

export default notificationSlice.reducer;
