import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope, Role, StaffUser } from '../types';

export async function fetchUsers(): Promise<StaffUser[]> {
  const { data } = await api.get<{ success: boolean; items: StaffUser[] }>('/users');
  return data.items;
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: fetchUsers });
}

export interface UserInput {
  name: string;
  email: string;
  password?: string;
  role: Role;
  phone?: string;
  storeId?: string | null;
}

export async function createUser(input: UserInput): Promise<StaffUser> {
  const { data } = await api.post<ApiEnvelope<StaffUser>>('/users', input);
  return data.data;
}

export async function updateUser(id: string, input: Partial<UserInput> & { isActive?: boolean }): Promise<StaffUser> {
  const { data } = await api.patch<ApiEnvelope<StaffUser>>(`/users/${id}`, input);
  return data.data;
}
