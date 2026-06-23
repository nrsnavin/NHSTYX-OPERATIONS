import { api } from './axios';
import type { ApiEnvelope, AuthUser, LoginResponse } from '../types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<ApiEnvelope<LoginResponse>>('/auth/staff/login', {
    email,
    password,
  });
  return data.data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<ApiEnvelope<AuthUser>>('/auth/staff/me');
  return data.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
