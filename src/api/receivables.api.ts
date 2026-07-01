import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope } from '../types';

export interface ReceivableRow {
  customerId: string;
  shopName: string;
  phone: string;
  creditLimitPaise: number;
  creditApproved: boolean;
  outstandingPaise: number;
  overduePaise: number;
  oldestDueDate: string | null;
  ordersWithDue: number;
  utilizationPct: number | null;
  overLimit: boolean;
}

export interface Receivables {
  summary: {
    totalOutstandingPaise: number;
    totalOverduePaise: number;
    customersWithDues: number;
    overLimitCount: number;
  };
  customers: ReceivableRow[];
}

export function useReceivables() {
  return useQuery({
    queryKey: ['receivables'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Receivables>>('/stats/receivables');
      return data.data;
    },
  });
}
