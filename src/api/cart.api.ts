import { useMutation } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope } from '../types';

/** ADMIN maintenance: empties every customer's cart. Returns lines removed. */
export function useClearAllCarts() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<ApiEnvelope<unknown> & { removed: number }>('/cart/all');
      return data.removed ?? 0;
    },
  });
}
