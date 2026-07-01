import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope, OrderStatus } from '../types';

export interface GlobalSearchResult {
  orders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalPaise: number;
    createdAt: string;
    customer: { shopName: string } | null;
  }[];
  customers: { id: string; shopName: string; phone: string; status: string }[];
  products: { id: string; name: string; brand: string | null; imageUrl: string | null }[];
  leads: { id: string; shopName: string; phone: string; stage: string }[];
}

export function useGlobalSearch(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ['global-search', q],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<GlobalSearchResult>>('/search/global', {
        params: { q },
      });
      return data.data;
    },
    enabled: q.length >= 2,
    placeholderData: (prev) => prev,
  });
}
