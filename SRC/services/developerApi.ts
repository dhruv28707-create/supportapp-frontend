import { apiFetch } from '../api/client';

/**
 * Read-only client for the server-granted developer/admin endpoints.
 *
 * Every request goes through apiFetch, so the normal Firebase ID-token and
 * 401 sign-out behaviour is preserved. This module never touches Firestore
 * directly and never sends developer/plan/role fields to the backend.
 */

export class DeveloperApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, body: any) {
    super(body?.error || body?.message || `Request failed (${status})`);
    this.name = 'DeveloperApiError';
    this.status = status;
    this.body = body;
  }

  /** Machine-readable code, e.g. 'developer_only'. */
  get code(): string | undefined {
    return this.body?.code;
  }
}

async function developerGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new DeveloperApiError(res.status, body);
  return body as T;
}

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== null && value !== undefined && String(value).trim() !== '',
  );
  if (entries.length === 0) return '';
  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')}`;
}

function pickArray(data: any, keys: string[]): any[] {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function pickCursor(data: any, keys: string[]): string | null {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === 'string' && value) return value;
  }
  return null;
}

export interface PageResult<T> {
  items: T[];
  nextPageToken: string | null;
}

/** GET /api/developer/overview */
export function fetchDeveloperOverview(): Promise<any> {
  return developerGet<any>('/api/developer/overview');
}

/**
 * GET /api/developer/users?limit=25&pageToken=<token>
 * Tolerates the common response shapes (array or `{ users: [...] }`).
 */
export async function fetchDeveloperUsers(
  limit = 25,
  pageToken?: string | null,
): Promise<PageResult<any>> {
  const data = await developerGet<any>(
    `/api/developer/users${buildQuery({ limit, pageToken })}`,
  );
  return {
    items: pickArray(data, ['users', 'items', 'results', 'data']),
    nextPageToken: pickCursor(data, ['nextPageToken', 'next_page_token']),
  };
}

/** GET /api/developer/users/:uid */
export function fetchDeveloperUser(uid: string): Promise<any> {
  return developerGet<any>(`/api/developer/users/${encodeURIComponent(uid)}`);
}

export interface DeveloperCollection {
  name: string;
  count?: number;
}

/**
 * GET /api/developer/collections
 * Accepts `["users"]`, `{ collections: ["users"] }` or
 * `{ collections: [{ name, count }] }`.
 */
export async function fetchDeveloperCollections(): Promise<DeveloperCollection[]> {
  const data = await developerGet<any>('/api/developer/collections');
  const raw = pickArray(data, ['collections', 'items', 'results', 'data']);

  const collections: DeveloperCollection[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      if (item) collections.push({ name: item });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const name = item.name ?? item.id ?? item.collection ?? item.path;
    if (typeof name !== 'string' || !name) continue;
    const count =
      typeof item.count === 'number'
        ? item.count
        : typeof item.size === 'number'
          ? item.size
          : undefined;
    collections.push({ name, count });
  }
  return collections;
}

export interface CollectionDocsParams {
  limit?: number;
  uid?: string;
  cursor?: string | null;
}

/**
 * GET /api/developer/collections/:name?limit=25&uid=&cursor=<lastDocId>
 */
export async function fetchDeveloperCollectionDocs(
  name: string,
  params: CollectionDocsParams = {},
): Promise<PageResult<any>> {
  const { limit = 25, uid, cursor } = params;
  const data = await developerGet<any>(
    `/api/developer/collections/${encodeURIComponent(name)}${buildQuery({ limit, uid, cursor })}`,
  );
  return {
    items: pickArray(data, ['documents', 'docs', 'items', 'results', 'data']),
    nextPageToken: pickCursor(data, ['nextCursor', 'next_cursor']),
  };
}

/** GET /api/developer/provider-usage */
export function fetchDeveloperProviderUsage(): Promise<any> {
  return developerGet<any>('/api/developer/provider-usage');
}

export interface DeveloperLogsParams {
  limit?: number;
  level?: 'info' | 'warn' | 'error' | null;
  event?: string | null;
  uid?: string | null;
  cursor?: string | number | null;
}

/** GET /api/developer/logs?limit=50&level=&event=&uid=&cursor=<numeric> */
export async function fetchDeveloperLogs(
  params: DeveloperLogsParams = {},
): Promise<PageResult<any> & { total: number | null }> {
  const { limit = 50, level, event, uid, cursor } = params;
  const data = await developerGet<any>(
    `/api/developer/logs${buildQuery({ limit, level, event, uid, cursor })}`,
  );
  const items = pickArray(data, ['logs', 'items', 'results', 'data']);
  const total = typeof data?.count === 'number' ? data.count : null;
  const nextCursor = data?.nextCursor ?? data?.next_cursor ?? data?.cursor ?? null;
  return {
    items,
    nextPageToken: nextCursor === null || nextCursor === undefined ? null : String(nextCursor),
    total,
  };
}
