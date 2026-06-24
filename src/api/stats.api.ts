import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope } from '../types';

export interface DashboardStats {
  sales: { totalPaise: number; orderCount: number; thisMonthPaise: number; thisMonthOrders: number };
  ordersByStatus: Record<string, number>;
  pendingApprovals: number;
  creditOutstandingPaise: number;
  lowStockCount: number;
  leadsByStage: Record<string, number>;
  customers: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<DashboardStats>>('/stats/dashboard');
      return data.data;
    },
  });
}

export interface LowStockItem {
  productId: string;
  storeId: string;
  name: string;
  unit: string;
  storeName: string;
  storeCity: string;
  stockQty: number;
}

export function useLowStock(threshold = 10) {
  return useQuery({
    queryKey: ['low-stock', threshold],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; items: LowStockItem[] }>('/stats/low-stock', {
        params: { threshold },
      });
      return data.items;
    },
  });
}
