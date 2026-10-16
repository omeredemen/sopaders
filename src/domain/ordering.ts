/**
 * Returns a copy of `items` with the element at `from` moved to `to`.
 * Out-of-range indexes return an unchanged copy.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return result;
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item as T);
  return result;
}
