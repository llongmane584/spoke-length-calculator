import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canStepNumericText,
  formatNumericText,
  sanitizeNumericText,
  stepNumericText,
} from './numberInput.ts';

const INTEGER = { step: 1, min: 1, max: 1000 };
const DECIMAL = { step: 0.1, min: 1, max: 3 };

test('keeps digits and a single decimal point', () => {
  assert.equal(sanitizeNumericText('600'), '600');
  assert.equal(sanitizeNumericText('2.5'), '2.5');
  // 入力途中の形。ここで弾くと小数を打ち切れない
  assert.equal(sanitizeNumericText('.'), '.');
  assert.equal(sanitizeNumericText('2.'), '2.');
});

test('drops characters that cannot be part of a non-negative decimal', () => {
  assert.equal(sanitizeNumericText('abc'), '');
  assert.equal(sanitizeNumericText('1e5'), '15');
  assert.equal(sanitizeNumericText('-3'), '3');
  assert.equal(sanitizeNumericText('1,000'), '1000');
  // 2 つ目以降の小数点だけを落とす
  assert.equal(sanitizeNumericText('1.2.3'), '1.23');
});

test('folds full-width digits and separators typed through an IME', () => {
  assert.equal(sanitizeNumericText('２．５'), '2.5');
  assert.equal(sanitizeNumericText('２。５'), '2.5');
  assert.equal(sanitizeNumericText('６００'), '600');
});

test('steps without letting floating point noise through', () => {
  assert.equal(stepNumericText('600', 1, INTEGER), '601');
  assert.equal(stepNumericText('600', -1, INTEGER), '599');
  // 2.4 + 0.1 は 2.5000000000000004 になる
  assert.equal(stepNumericText('2.4', 1, DECIMAL), '2.5');
  assert.equal(stepNumericText('2.5', 1, DECIMAL), '2.6');
  assert.equal(stepNumericText('2.5', -1, DECIMAL), '2.4');
});

test('keeps the decimals of a value the step grid would have swallowed', () => {
  // フランジ距離は 1 刻みだが 22.6 のような値を普通に取る。格子へ丸めてはいけない
  assert.equal(stepNumericText('22.6', 1, INTEGER), '23.6');
  assert.equal(stepNumericText('22.6', -1, INTEGER), '21.6');
});

test('returns to the original value after stepping up then down', () => {
  const there = stepNumericText('22.6', 1, INTEGER);
  assert.equal(stepNumericText(there, -1, INTEGER), '22.6');
});

test('clamps to the range instead of running past it', () => {
  assert.equal(stepNumericText('1000', 1, INTEGER), '1000');
  assert.equal(stepNumericText('1', -1, INTEGER), '1');
  assert.equal(stepNumericText('3', 1, DECIMAL), '3.0');
});

test('lands on the lower bound when the field holds no number yet', () => {
  assert.equal(stepNumericText('', 1, INTEGER), '1');
  assert.equal(stepNumericText('', -1, INTEGER), '1');
  assert.equal(stepNumericText('.', 1, DECIMAL), '1.0');
  assert.equal(stepNumericText('', 1, { step: 0.1, max: 100 }), '0.0');
  assert.equal(stepNumericText('abc', 1, INTEGER), '1');
});

test('reports whether a step is still available', () => {
  assert.equal(canStepNumericText('999', 1, INTEGER), true);
  assert.equal(canStepNumericText('1000', 1, INTEGER), false);
  assert.equal(canStepNumericText('1', -1, INTEGER), false);
  // 空欄は下限へ着地させたいので、どちらの向きにも動かせる
  assert.equal(canStepNumericText('', 1, INTEGER), true);
  assert.equal(canStepNumericText('', -1, INTEGER), true);
});

test('lines up the decimals of a value in a fractional-step field', () => {
  assert.equal(formatNumericText('2', 0.1), '2.0');
  assert.equal(formatNumericText('2.', 0.1), '2.0');
  assert.equal(formatNumericText('2.64', 0.1), '2.6');
  assert.equal(formatNumericText('2.66', 0.1), '2.7');
});

test('never rounds a value in a whole-step field', () => {
  // 1 刻みでも小数は入る。ここで丸めると欄を離れるたびに精度が落ちる
  assert.equal(formatNumericText('22.6', 1), '22.6');
  assert.equal(formatNumericText('600.', 1), '600.');
});

test('leaves a value that is not a number alone', () => {
  // 空欄は空欄のまま「未入力」としてバリデーションへ渡す
  assert.equal(formatNumericText('', 1), '');
  assert.equal(formatNumericText('', 0.1), '');
  assert.equal(formatNumericText('.', 0.1), '.');
});
