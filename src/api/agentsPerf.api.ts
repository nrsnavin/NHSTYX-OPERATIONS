import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope } from '../types';

export interface AgentPerformanceRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  store: { name: string; city: string } | null;
  customersManaged: number;
  storeRevenuePaise: number;
  leads: {
    total: number;
    won: number;
    lost: number;
    open: number;
    winRatePct: number;
    pipelinePaise: number;
  };
  quotations: {
    total: number;
    converted: number;
    valuePaise: number;
    conversionPct: number;
  };
  visits: number;
  calls: number;
  activities: number;
}

export interface AgentPerformance {
  agents: AgentPerformanceRow[];
  generatedAt: string;
}

export function useAgentPerformance() {
  return useQuery({
    queryKey: ['agent-performance'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<AgentPerformance>>('/stats/agent-performance');
      return data.data;
    },
  });
}
