import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope, AppNotification, CustomerStatus } from '../types';

export async function fetchStaffNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<{ items: AppNotification[] }>('/notifications');
  return data.items;
}

/** Staff activity stream. Polled so the bell stays roughly live. */
export function useStaffNotifications() {
  return useQuery({
    queryKey: ['notifications', 'staff'],
    queryFn: fetchStaffNotifications,
    refetchInterval: 60_000,
  });
}

export interface BroadcastInput {
  title: string;
  body: string;
  status?: CustomerStatus;
  storeId?: string;
}

/** Broadcasts an in-app message to a segment of customers. */
export function useBroadcast() {
  return useMutation({
    mutationFn: async (input: BroadcastInput) => {
      const { data } = await api.post<ApiEnvelope<{ sent: number }>>(
        '/notifications/broadcast',
        input,
      );
      return data.data;
    },
  });
}
