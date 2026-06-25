import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { PaginatedResponse } from '../types';

export interface AuditEntry {
  id: string;
  actorType: 'STAFF' | 'CUSTOMER' | 'SYSTEM';
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditQuery {
  page?: number;
  limit?: number;
  entity?: string;
  action?: string;
}

export async function fetchAuditLog(params: AuditQuery = {}): Promise<PaginatedResponse<AuditEntry>> {
  const { data } = await api.get<PaginatedResponse<AuditEntry>>('/audit', { params });
  return data;
}

export function useAuditLog(params: AuditQuery = {}) {
  return useQuery({ queryKey: ['audit', params], queryFn: () => fetchAuditLog(params) });
}
