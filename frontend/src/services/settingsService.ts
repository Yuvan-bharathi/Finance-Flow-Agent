import api from './api';
import type { AxiosResponse } from 'axios';

interface SettingItem {
  key: string;
  value: unknown;
  scope: 'user' | 'system';
}

interface SettingsData {
  user: Record<string, unknown>;
  system: Record<string, unknown>;
  locked_policies: Record<string, unknown>;
}

/**
 * Service: Settings API Client
 */
export const fetchSettings = (): Promise<AxiosResponse<{ success: boolean; data: SettingsData }>> =>
  api.get('/settings');

export const saveSettings = (settings: SettingItem[]): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
  api.put('/settings', { settings });
