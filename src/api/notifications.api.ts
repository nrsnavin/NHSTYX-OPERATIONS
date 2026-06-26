import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { AppNotification } from '../types';

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
