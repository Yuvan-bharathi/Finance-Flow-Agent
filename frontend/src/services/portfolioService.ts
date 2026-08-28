import api from './api';
import type { PortfolioSnapshot } from '../types/portfolio';
import type { AxiosResponse } from 'axios';

/**
 * Service: Portfolio Analytics API Client (Agent 5)
 */

export const triggerPortfolioAnalysis = (): Promise<AxiosResponse<{ success: boolean; data: PortfolioSnapshot }>> =>
  api.post('/portfolio/analyze');

export const getPortfolioSnapshots = (limit = 10): Promise<AxiosResponse<{ success: boolean; data: PortfolioSnapshot[] }>> =>
  api.get(`/portfolio/snapshots?limit=${limit}`);

export const getLatestPortfolioSnapshot = (): Promise<AxiosResponse<{ success: boolean; data: PortfolioSnapshot | null }>> =>
  api.get('/portfolio/latest');
