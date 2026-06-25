import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';

export interface Variant {
  id: string;
  name: string;
  sku?: string | null;
  attributes?: Record<string, string> | null;
  mrpPaise?: number | null;
  isActive: boolean;
}

export interface StoreVariantRow extends Variant {
  storeVariant: {
    pricePaise: number;
    mrpPaise?: number | null;
    stockQty: number;
    isActive: boolean;
  } | null;
}

export interface VariantInput {
  name: string;
  sku?: string;
  attributes?: Record<string, string>;
  mrpPaise?: number | null;
  isActive?: boolean;
}

export interface StoreVariantInput {
  pricePaise: number;
  mrpPaise?: number | null;
  stockQty?: number;
  isActive?: boolean;
}

/** Catalog variants for a product. */
export function useVariants(productId?: string) {
  return useQuery({
    queryKey: ['variants', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data } = await api.get<{ data: Variant[] }>(`/variants/product/${productId}`);
      return data.data;
    },
  });
}

/** Variants with a given store's price/stock. */
export function useStoreVariants(storeId?: string, productId?: string) {
  return useQuery({
    queryKey: ['store-variants', storeId, productId],
    enabled: !!storeId && !!productId,
    queryFn: async () => {
      const { data } = await api.get<{ data: StoreVariantRow[] }>(
        `/variants/store/${storeId}`,
        { params: { productId } },
      );
      return data.data;
    },
  });
}

export function useCreateVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VariantInput) => {
      const { data } = await api.post<{ data: Variant }>(`/variants/product/${productId}`, input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', productId] });
      qc.invalidateQueries({ queryKey: ['store-variants'] });
    },
  });
}

export function useUpdateVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<VariantInput> }) => {
      const { data } = await api.patch<{ data: Variant }>(`/variants/${id}`, input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', productId] });
      qc.invalidateQueries({ queryKey: ['store-variants'] });
    },
  });
}

export function useDeleteVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/variants/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', productId] });
      qc.invalidateQueries({ queryKey: ['store-variants'] });
    },
  });
}

export function useUpsertStoreVariant(storeId: string, productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variantId, input }: { variantId: string; input: StoreVariantInput }) => {
      const { data } = await api.put(`/variants/store/${storeId}/${variantId}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-variants', storeId, productId] }),
  });
}
