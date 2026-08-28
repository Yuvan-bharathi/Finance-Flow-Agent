import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import agentControlReducer from './slices/agentControlSlice';
import reconciliationReducer from './slices/reconciliationSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    agentControl: agentControlReducer,
    reconciliation: reconciliationReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
