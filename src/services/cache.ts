import { CACHE_TTL_SECONDS, SETTINGS_CACHE_TTL_SECONDS } from "../lib/constants";

export async function getCachedJson<T>(namespace: KVNamespace, key: string): Promise<T | null> {
  return namespace.get<T>(key, "json");
}

export async function setCachedJson(
  namespace: KVNamespace,
  key: string,
  value: unknown,
  ttl = CACHE_TTL_SECONDS,
): Promise<void> {
  await namespace.put(key, JSON.stringify(value), { expirationTtl: ttl });
}

export async function setSettingsCache(namespace: KVNamespace, key: string, value: unknown): Promise<void> {
  await setCachedJson(namespace, key, value, SETTINGS_CACHE_TTL_SECONDS);
}

export async function deleteCacheKey(namespace: KVNamespace, key: string): Promise<void> {
  await namespace.delete(key);
}

export async function deleteByPrefix(namespace: KVNamespace, prefix: string): Promise<void> {
  let cursor: string | undefined;

  do {
    const page = await namespace.list({ prefix, cursor });
    await Promise.all(page.keys.map((key) => namespace.delete(key.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}
