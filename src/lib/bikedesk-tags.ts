import { getBikedeskAuthHeaders, getBikedeskBaseUrl } from './bikedesk-config';

export async function getTags(): Promise<{ id: number; label: string }[]> {
  const BASE_URL = getBikedeskBaseUrl();
  const res = await fetch(`${BASE_URL}/tickettags`, {
    headers: getBikedeskAuthHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const tags = Array.isArray(data) ? data : (data?.content ?? []);
  return tags as { id: number; label: string }[];
}
