import { describe, expect, it } from 'vitest';
import { moveItem } from './ordering';

describe('moveItem', () => {
  it('moves up and down', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('ignores out-of-range moves and does not mutate the input', () => {
    const input = ['a', 'b'];
    expect(moveItem(input, 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(input, 1, 2)).toEqual(['a', 'b']);
    expect(input).toEqual(['a', 'b']);
  });
});
