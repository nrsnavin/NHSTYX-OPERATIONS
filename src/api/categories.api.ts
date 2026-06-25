import { useQuery } from '@tanstack/react-query';
import { api } from './axios';
import type { ApiEnvelope } from '../types';

export interface Category {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  children?: Category[];
}

export interface FlatCategory {
  id: string;
  name: string;
}

function flatten(cats: Category[], depth = 0, out: FlatCategory[] = []): FlatCategory[] {
  for (const c of cats) {
    out.push({ id: c.id, name: `${'— '.repeat(depth)}${c.name}` });
    if (c.children?.length) flatten(c.children, depth + 1, out);
  }
  return out;
}

export async function fetchCategoriesFlat(): Promise<FlatCategory[]> {
  const { data } = await api.get<ApiEnvelope<Category[]>>('/categories');
  return flatten(data.data ?? []);
}

export function useCategoriesFlat() {
  return useQuery({ queryKey: ['categories-flat'], queryFn: fetchCategoriesFlat });
}

export interface CategoryInput {
  name: string;
  parentId?: string;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await api.post<ApiEnvelope<Category>>('/categories', input);
  return data.data;
}
