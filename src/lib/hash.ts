export function stableHash(value: unknown): string {
  const source = JSON.stringify(value);
  let hash = 5381;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}
