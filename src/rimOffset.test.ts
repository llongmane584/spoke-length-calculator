import assert from 'node:assert/strict';
import test from 'node:test';
import { assessRimOffset, getEffectiveFlangeDistances } from './rimOffset.ts';

test('applies the offset toward the smaller flange-distance difference', () => {
  assert.deepEqual(
    getEffectiveFlangeDistances({
      flangeDistanceLeft: 35,
      flangeDistanceRight: 22.6,
      rimOffset: 3,
    }),
    { left: 32, right: 25.6 },
  );

  assert.deepEqual(
    getEffectiveFlangeDistances({
      flangeDistanceLeft: 25,
      flangeDistanceRight: 34,
      rimOffset: 3,
    }),
    { left: 28, right: 31 },
  );
});

test('does not apply an offset when both flange distances are equal', () => {
  assert.deepEqual(
    getEffectiveFlangeDistances({
      flangeDistanceLeft: 30,
      flangeDistanceRight: 30,
      rimOffset: 3,
    }),
    { left: 30, right: 30 },
  );
});

test('does not warn for zero offset or an offset that improves asymmetry', () => {
  assert.deepEqual(
    assessRimOffset({
      flangeDistanceLeft: 35,
      flangeDistanceRight: 22.6,
      rimOffset: 0,
    }),
    { kind: 'none' },
  );

  assert.deepEqual(
    assessRimOffset({
      flangeDistanceLeft: 35,
      flangeDistanceRight: 22.6,
      rimOffset: 3,
    }),
    { kind: 'none' },
  );
});

test('does not warn when the dominant side reverses but the asymmetry still improves', () => {
  assert.deepEqual(
    assessRimOffset({
      flangeDistanceLeft: 34,
      flangeDistanceRight: 30,
      rimOffset: 3,
    }),
    { kind: 'none' },
  );
});

test('does not warn at the boundary where the offset equals the original difference', () => {
  assert.deepEqual(
    assessRimOffset({
      flangeDistanceLeft: 35,
      flangeDistanceRight: 22.6,
      rimOffset: 12.4,
    }),
    { kind: 'none' },
  );
});

test('warns when the offset worsens asymmetry in either orientation', () => {
  assert.deepEqual(
    assessRimOffset({
      flangeDistanceLeft: 30,
      flangeDistanceRight: 29,
      rimOffset: 2,
    }),
    {
      kind: 'worsensAsymmetry',
      originalDifference: 1,
      effectiveDifference: 3,
    },
  );

  assert.deepEqual(
    assessRimOffset({
      flangeDistanceLeft: 29,
      flangeDistanceRight: 30,
      rimOffset: 2,
    }),
    {
      kind: 'worsensAsymmetry',
      originalDifference: 1,
      effectiveDifference: 3,
    },
  );
});

test('warns when equal flange distances make the direction indeterminate', () => {
  assert.deepEqual(
    assessRimOffset({
      flangeDistanceLeft: 30,
      flangeDistanceRight: 30,
      rimOffset: 2,
    }),
    { kind: 'directionIndeterminate' },
  );
});
