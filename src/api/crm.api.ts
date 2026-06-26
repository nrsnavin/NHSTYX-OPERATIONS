import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type {
  Activity,
  ApiEnvelope,
  CrmDashboardData,
  FieldVisit,
  Lead,
  LeadStage,
  Pagination,
  SourceAnalyticsRow,
} from '../types';

export interface LeadsResponse {
  success: boolean;
  items: Lead[];
  pagination: Pagination;
  counts: Record<string, number>;
}

interface LeadQuery {
  page?: number;
  limit?: number;
  search?: string;
  stage?: LeadStage;
  assignedToId?: string;
  due?: boolean;
}

export async function fetchLeads(params: LeadQuery = {}): Promise<LeadsResponse> {
  const { data } = await api.get<LeadsResponse>('/crm/leads', { params });
  return data;
}

export function useLeads(params: LeadQuery = {}) {
  return useQuery({ queryKey: ['leads', params], queryFn: () => fetchLeads(params) });
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data } = await api.get<ApiEnvelope<Lead>>(`/crm/leads/${id}`);
  return data.data;
}

export function useLead(id: string | null) {
  return useQuery({ queryKey: ['lead', id], queryFn: () => fetchLead(id as string), enabled: Boolean(id) });
}

export interface LeadInput {
  shopName: string;
  contactName?: string;
  phone: string;
  email?: string;
  city?: string;
  estValuePaise?: number;
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const { data } = await api.post<ApiEnvelope<Lead>>('/crm/leads', input);
  return data.data;
}

export async function updateLead(
  id: string,
  input: Partial<LeadInput> & {
    stage?: LeadStage;
    lostReason?: string | null;
    nextFollowUpAt?: string | null;
    assignedToId?: string | null;
  },
): Promise<Lead> {
  const { data } = await api.patch<ApiEnvelope<Lead>>(`/crm/leads/${id}`, input);
  return data.data;
}

export async function fetchSourceAnalytics(): Promise<SourceAnalyticsRow[]> {
  const { data } = await api.get<{ success: boolean; items: SourceAnalyticsRow[] }>(
    '/crm/analytics/sources',
  );
  return data.items;
}

export function useSourceAnalytics(enabled = true) {
  return useQuery({ queryKey: ['lead-source-analytics'], queryFn: fetchSourceAnalytics, enabled });
}

export async function fetchCrmDashboard(): Promise<CrmDashboardData> {
  const { data } = await api.get<ApiEnvelope<CrmDashboardData>>('/crm/analytics/dashboard');
  return data.data;
}

export function useCrmDashboard(enabled = true) {
  return useQuery({ queryKey: ['crm-dashboard'], queryFn: fetchCrmDashboard, enabled });
}

export async function convertLead(id: string): Promise<Lead> {
  const { data } = await api.post<ApiEnvelope<Lead>>(`/crm/leads/${id}/convert`, {});
  return data.data;
}

export async function fetchActivities(params: { leadId?: string; customerId?: string }): Promise<Activity[]> {
  const { data } = await api.get<{ success: boolean; items: Activity[] }>('/crm/activities', { params });
  return data.items;
}

export async function addActivity(input: {
  type: Activity['type'];
  body: string;
  leadId?: string;
  customerId?: string;
  followUpAt?: string | null;
  latitude?: number;
  longitude?: number;
}): Promise<Activity> {
  const { data } = await api.post<ApiEnvelope<Activity>>('/crm/activities', input);
  return data.data;
}

export async function fetchVisits(days = 30): Promise<FieldVisit[]> {
  const { data } = await api.get<{ success: boolean; items: FieldVisit[] }>('/crm/visits', {
    params: { days },
  });
  return data.items;
}

export function useVisits(days = 30, enabled = true) {
  return useQuery({ queryKey: ['crm-visits', days], queryFn: () => fetchVisits(days), enabled });
}
