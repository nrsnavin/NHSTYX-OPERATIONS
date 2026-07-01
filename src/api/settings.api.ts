import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope } from '../types';

export interface BusinessSettings {
  businessName: string;
  gstin: string;
  addressLine: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  supportPhone: string;
  supportEmail: string;
  invoiceFooter: string;
  invoiceTerms: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  bankUpi: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<BusinessSettings>>('/settings');
      return data.data;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<BusinessSettings>) => {
      const { data } = await api.put<ApiEnvelope<BusinessSettings>>('/settings', patch);
      return data.data;
    },
    onSuccess: (data) => qc.setQueryData(['settings'], data),
  });
}
