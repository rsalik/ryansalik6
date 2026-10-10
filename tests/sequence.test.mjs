import assert from 'node:assert/strict';
import test from 'node:test';
import { shuffled } from '../src/lib/photography/sequence.ts';

test('display shuffle changes order without changing or losing catalog records', () => {
  const catalog = Object.freeze(['a', 'b', 'c', 'd']);
  const sequence = shuffled(catalog, () => 0);
  assert.deepEqual(catalog, ['a', 'b', 'c', 'd']);
  assert.deepEqual(sequence, ['b', 'c', 'd', 'a']);
  assert.deepEqual([...sequence].sort(), [...catalog].sort());
  assert.deepEqual(shuffled([]), []);
  assert.deepEqual(shuffled(['only']), ['only']);
});
