export function asVecPrimaryKey(id: number | bigint | string): bigint {
  if (typeof id === 'bigint')
    return id;
  const n = typeof id === 'number' ? id : Number(id);
  if (!Number.isInteger(n) || n <= 0)
    throw new Error(`Invalid post_chunk_vec primary key: ${String(id)}`);
  return BigInt(n);
}