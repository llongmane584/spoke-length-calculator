import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  Circle,
  FileJson,
  FileUp,
  Moon,
  Save,
  SlidersHorizontal,
  Sun,
  Tag,
  Trash2,
  TriangleAlert,
  Waypoints,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { useDockMorph } from './hooks/useDockMorph';
import { ConfirmDialog } from './components/ConfirmDialog';
import { HelpButton } from './components/HelpButton';
import { HelpModal, type HelpTopic } from './components/HelpModal';
import { MtbHubIcon } from './components/icons/MtbHubIcon';
import CompareWheels, { type WheelOption } from './components/CompareWheels';
import { SegmentedControl, type SegmentedOption } from './components/SegmentedControl';
import { btnPrimary, btnSecondary, btnGhost, nativeSelect, selectChevron } from './styles';
import { assessRimOffset, getEffectiveFlangeDistances, type RimOffsetAssessment } from './rimOffset';

// Dynamic import of preset data
const presetModules = import.meta.glob('./presets/*.json', { eager: true });

// Type definitions
interface Inputs {
  erd: string;
  rimOffset: string;
  pitchCircleLeft: string;
  pitchCircleRight: string;
  flangeDistanceLeft: string;
  flangeDistanceRight: string;
  spokeHoleDiameter: string;
  numberOfSpokes: string;
  crossingsLeft: string;
  crossingsRight: string;
}

interface Results {
  left: number;
  right: number;
}

interface SavedCalculation {
  id: number;
  name: string;
  inputs: Inputs;
  results: Results;
  timestamp: string;
}

interface PresetData {
  inputs: Inputs;
  results: Results;
  timestamp: string;
  metadata: {
    calculator: string;
    version: string;
  };
  displayName?: string;
  category?: string;
  description?: string;
}

interface PresetOption {
  id: string;
  name: string;
  data: PresetData;
}

type InitialDataLoadStatus = 'ok' | 'warning' | 'error';

interface PresetLoadResult {
  options: PresetOption[];
  errors: string[];
}

interface SavedCalculationsLoadResult {
  calculations: SavedCalculation[];
  status: InitialDataLoadStatus;
  details: string[];
}

type InputField = keyof Inputs;
type NumericInputField = Exclude<InputField, 'numberOfSpokes' | 'crossingsLeft' | 'crossingsRight'>;
type FieldErrors = Partial<Record<InputField, string>>;
type TouchedFields = Partial<Record<InputField, boolean>>;

interface ParsedInputs {
  erd: number;
  rimOffset: number;
  pitchCircleLeft: number;
  pitchCircleRight: number;
  flangeDistanceLeft: number;
  flangeDistanceRight: number;
  spokeHoleDiameter: number;
  numberOfSpokes: number;
  crossingsLeft: number;
  crossingsRight: number;
}

interface CalculationState {
  fieldErrors: FieldErrors;
  results: Results | null;
}

const inputFields = [
  'erd',
  'rimOffset',
  'pitchCircleLeft',
  'pitchCircleRight',
  'flangeDistanceLeft',
  'flangeDistanceRight',
  'spokeHoleDiameter',
  'numberOfSpokes',
  'crossingsLeft',
  'crossingsRight',
] as const satisfies readonly InputField[];

// Tailwind の `sm:` 直下を指す。v4 のブレークポイントは rem (--breakpoint-sm: 40rem)
// なので px で書くとルートフォントサイズを変えたときに CSS と JS がずれる —
// CSS はコンパイルレイアウトなのに JS は長い翻訳文字列を選ぶ、という食い違いになる。
const COMPACT_VIEWPORT_QUERY = '(max-width: 39.9375rem)';

const getIsCompactViewport = () =>
  typeof window !== 'undefined' && window.matchMedia(COMPACT_VIEWPORT_QUERY).matches;

const numericFieldRules: Record<NumericInputField, { min: number; max: number; rangeError: string }> = {
  erd: { min: 1, max: 1000, rangeError: 'validation.rangeErd' },
  rimOffset: { min: 0, max: 100, rangeError: 'validation.rangeRimOffset' },
  pitchCircleLeft: { min: 1, max: 100, rangeError: 'validation.rangeStandard' },
  pitchCircleRight: { min: 1, max: 100, rangeError: 'validation.rangeStandard' },
  flangeDistanceLeft: { min: 1, max: 100, rangeError: 'validation.rangeStandard' },
  flangeDistanceRight: { min: 1, max: 100, rangeError: 'validation.rangeStandard' },
  spokeHoleDiameter: { min: 1, max: 3, rangeError: 'validation.rangeSpokeHole' },
};

const decimalPattern = /^(?:\d+|\d+\.\d*|\.\d+)$/;
const spokeCountOptions = ['24', '28', '32', '36'];
const crossingOptions = ['0', '1', '2', '3', '4'];

const createTouchedFields = (value: boolean): TouchedFields => (
  inputFields.reduce<TouchedFields>((acc, field) => {
    acc[field] = value;
    return acc;
  }, {})
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const normalizeInputValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const normalizeInputs = (value: unknown): Inputs | null => {
  if (!isRecord(value)) {
    return null;
  }

  const normalized: Partial<Inputs> = {};

  for (const field of inputFields) {
    const normalizedValue = field === 'rimOffset' && value[field] === undefined
      ? '0'
      : normalizeInputValue(value[field]);

    if (normalizedValue === null) {
      return null;
    }

    normalized[field] = normalizedValue;
  }

  return normalized as Inputs;
};

const normalizeResults = (value: unknown): Results | null => {
  if (!isRecord(value)) {
    return null;
  }

  const { left, right } = value;

  if (typeof left !== 'number' || typeof right !== 'number') {
    return null;
  }

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return null;
  }

  return { left, right };
};

const parseNumericField = (field: NumericInputField, rawValue: string): { value: number | null; error?: string } => {
  const trimmedValue = rawValue.trim();
  const rule = numericFieldRules[field];

  if (trimmedValue === '') {
    return { value: null, error: 'validation.required' };
  }

  if (!decimalPattern.test(trimmedValue)) {
    return { value: null, error: 'validation.invalidNumber' };
  }

  const value = Number(trimmedValue);

  if (!Number.isFinite(value)) {
    return { value: null, error: 'validation.invalidNumber' };
  }

  if (value < rule.min || value > rule.max) {
    return { value: null, error: rule.rangeError };
  }

  return { value };
};

const parseSelectField = (
  rawValue: string,
  options: readonly string[],
  invalidError: string,
): { value: number | null; error?: string } => {
  const trimmedValue = rawValue.trim();

  if (trimmedValue === '') {
    return { value: null, error: 'validation.selectRequired' };
  }

  if (!options.includes(trimmedValue)) {
    return { value: null, error: invalidError };
  }

  const value = Number(trimmedValue);

  if (!Number.isInteger(value) || !Number.isFinite(value)) {
    return { value: null, error: invalidError };
  }

  return { value };
};

const validateInputs = (inputs: Inputs): { parsed: ParsedInputs | null; fieldErrors: FieldErrors } => {
  const fieldErrors: FieldErrors = {};
  const parsed: Partial<ParsedInputs> = {};

  for (const field of Object.keys(numericFieldRules) as NumericInputField[]) {
    const result = parseNumericField(field, inputs[field]);

    if (result.error !== undefined || result.value === null) {
      fieldErrors[field] = result.error || 'validation.invalidNumber';
      continue;
    }

    parsed[field] = result.value;
  }

  const spokeCount = parseSelectField(inputs.numberOfSpokes, spokeCountOptions, 'validation.selectSpokeCount');
  if (spokeCount.error !== undefined || spokeCount.value === null) {
    fieldErrors.numberOfSpokes = spokeCount.error || 'validation.selectSpokeCount';
  } else {
    parsed.numberOfSpokes = spokeCount.value;
  }

  const crossingsLeft = parseSelectField(inputs.crossingsLeft, crossingOptions, 'validation.selectCrossings');
  if (crossingsLeft.error !== undefined || crossingsLeft.value === null) {
    fieldErrors.crossingsLeft = crossingsLeft.error || 'validation.selectCrossings';
  } else {
    parsed.crossingsLeft = crossingsLeft.value;
  }

  const crossingsRight = parseSelectField(inputs.crossingsRight, crossingOptions, 'validation.selectCrossings');
  if (crossingsRight.error !== undefined || crossingsRight.value === null) {
    fieldErrors.crossingsRight = crossingsRight.error || 'validation.selectCrossings';
  } else {
    parsed.crossingsRight = crossingsRight.value;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { parsed: null, fieldErrors };
  }

  const completeParsed = parsed as ParsedInputs;

  if (completeParsed.numberOfSpokes <= 0 || completeParsed.numberOfSpokes % 2 !== 0) {
    return {
      parsed: null,
      fieldErrors: {
        numberOfSpokes: 'validation.selectSpokeCount',
      },
    };
  }

  const effectiveFlangeDistances = getEffectiveFlangeDistances(completeParsed);

  if (effectiveFlangeDistances.left <= 0 || effectiveFlangeDistances.right <= 0) {
    return {
      parsed: null,
      fieldErrors: {
        rimOffset: 'validation.rimOffsetTooLarge',
      },
    };
  }

  return { parsed: completeParsed, fieldErrors };
};

const getRimOffsetAssessment = (inputs: Inputs): RimOffsetAssessment => {
  const rimOffset = parseNumericField('rimOffset', inputs.rimOffset);
  const flangeDistanceLeft = parseNumericField('flangeDistanceLeft', inputs.flangeDistanceLeft);
  const flangeDistanceRight = parseNumericField('flangeDistanceRight', inputs.flangeDistanceRight);

  if (
    rimOffset.value === null
    || rimOffset.error !== undefined
    || flangeDistanceLeft.value === null
    || flangeDistanceLeft.error !== undefined
    || flangeDistanceRight.value === null
    || flangeDistanceRight.error !== undefined
  ) {
    return { kind: 'none' };
  }

  return assessRimOffset({
    rimOffset: rimOffset.value,
    flangeDistanceLeft: flangeDistanceLeft.value,
    flangeDistanceRight: flangeDistanceRight.value,
  });
};

const calculateSpokeResults = (inputs: ParsedInputs): Results | null => {
  const spokesPerSide = inputs.numberOfSpokes / 2;
  const effectiveFlangeDistances = getEffectiveFlangeDistances(inputs);

  if (!Number.isFinite(spokesPerSide) || spokesPerSide <= 0) {
    return null;
  }

  const calculateLength = (pitchCircle: number, flangeDistance: number, crossings: number): number | null => {
    const flangeRadius = pitchCircle / 2;
    const rimRadius = inputs.erd / 2;
    const theta = (2 * Math.PI * crossings) / spokesPerSide;

    if (!Number.isFinite(theta)) {
      return null;
    }

    const projectedLengthSquared = (
      flangeRadius * flangeRadius
      + rimRadius * rimRadius
      - 2 * flangeRadius * rimRadius * Math.cos(theta)
    );

    if (!Number.isFinite(projectedLengthSquared) || projectedLengthSquared < -1e-9) {
      return null;
    }

    const projectedLength = Math.sqrt(Math.max(0, projectedLengthSquared));
    const length = Math.sqrt(projectedLength * projectedLength + flangeDistance * flangeDistance)
      - inputs.spokeHoleDiameter / 2;
    const roundedLength = Math.floor(length * 10) / 10;

    if (!Number.isFinite(roundedLength) || roundedLength <= 0) {
      return null;
    }

    return roundedLength;
  };

  const left = calculateLength(inputs.pitchCircleLeft, effectiveFlangeDistances.left, inputs.crossingsLeft);
  const right = calculateLength(inputs.pitchCircleRight, effectiveFlangeDistances.right, inputs.crossingsRight);

  if (left === null || right === null) {
    return null;
  }

  return { left, right };
};

const getCalculationState = (inputs: Inputs): CalculationState => {
  const validation = validateInputs(inputs);

  if (validation.parsed === null) {
    return {
      fieldErrors: validation.fieldErrors,
      results: null,
    };
  }

  const results = calculateSpokeResults(validation.parsed);

  if (results === null) {
    return {
      fieldErrors: {
        erd: 'validation.calculationUnavailable',
      },
      results: null,
    };
  }

  return {
    fieldErrors: {},
    results,
  };
};

const normalizeSavedCalculation = (value: unknown): SavedCalculation | null => {
  if (!isRecord(value)) {
    return null;
  }

  const { id, name, inputs, timestamp } = value;
  const normalizedInputs = normalizeInputs(inputs);

  if (
    typeof id !== 'number'
    || !Number.isFinite(id)
    || typeof name !== 'string'
    || typeof timestamp !== 'string'
    || normalizedInputs === null
  ) {
    return null;
  }

  const calculation = getCalculationState(normalizedInputs);

  if (calculation.results === null) {
    return null;
  }

  return {
    id,
    name,
    inputs: normalizedInputs,
    results: calculation.results,
    timestamp,
  };
};

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
);

const loadPresetOptions = (): PresetLoadResult => {
  const options: PresetOption[] = [];
  const errors: string[] = [];

  for (const [path, module] of Object.entries(presetModules)) {
    try {
      const data = module as PresetData;
      const normalizedInputs = normalizeInputs(data.inputs);
      const normalizedResults = normalizeResults(data.results);

      if (normalizedInputs === null || normalizedResults === null) {
        errors.push(`Invalid preset format in ${path}: missing or invalid required fields`);
        continue;
      }

      const presetCalculation = getCalculationState(normalizedInputs);

      if (presetCalculation.results === null) {
        errors.push(`Invalid preset format in ${path}: preset inputs cannot be calculated`);
        continue;
      }

      const fileName = path.split('/').pop()?.replace('.json', '') || '';
      const displayName = data.displayName || fileName
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());

      options.push({
        id: fileName,
        name: displayName,
        data: {
          ...data,
          inputs: normalizedInputs,
          results: presetCalculation.results,
        },
      });
    } catch (error) {
      errors.push(`Failed to load preset from ${path}: ${getErrorMessage(error)}`);
    }
  }

  return { options, errors };
};

const loadSavedCalculations = (): SavedCalculationsLoadResult => {
  try {
    const saved = localStorage.getItem('spokeCalculations');

    if (saved === null) {
      return { calculations: [], status: 'ok', details: [] };
    }

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      throw new Error('Saved calculations must be an array');
    }

    const calculations = parsed
      .map(normalizeSavedCalculation)
      .filter((calculation): calculation is SavedCalculation => calculation !== null);
    const invalidCount = parsed.length - calculations.length;

    if (invalidCount > 0) {
      return {
        calculations,
        status: 'warning',
        details: [`Discarded ${invalidCount} invalid saved calculation(s)`],
      };
    }

    return { calculations, status: 'ok', details: [] };
  } catch (error) {
    return {
      calculations: [],
      status: 'error',
      details: [getErrorMessage(error)],
    };
  }
};

const PRESET_LOAD_RESULT = loadPresetOptions();
const INITIAL_SAVED_CALCULATIONS = loadSavedCalculations();

for (const error of PRESET_LOAD_RESULT.errors) {
  console.error(error);
}

if (INITIAL_SAVED_CALCULATIONS.status !== 'ok') {
  console.warn(
    'Failed to load all saved calculations:',
    ...INITIAL_SAVED_CALCULATIONS.details,
  );
}

const getControlClassName = (hasError: boolean, className?: string): string => (
  [
    'w-full px-3 py-2 border rounded-md bg-surface text-fg tabular-nums placeholder:text-fg-subtle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
    hasError
      ? 'border-danger-line bg-danger-soft focus-visible:outline-danger'
      : 'border-line-strong focus-visible:outline-focus',
    className || '',
  ].join(' ')
);

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) => {
  const hasMessage = message !== undefined;

  return (
    <p
      id={id}
      aria-hidden={!hasMessage}
      aria-live="polite"
      className={[
        'mt-1 h-5 overflow-hidden whitespace-nowrap text-xs leading-5 text-danger-ink sm:text-sm',
        hasMessage ? '' : 'invisible',
      ].join(' ')}
    >
      {message}
    </p>
  );
};

const FieldWarning: React.FC<{ id: string; message: string }> = ({ id, message }) => (
  <p
    id={id}
    aria-live="polite"
    className="flex min-h-5 items-start gap-1.5 mt-1 text-xs leading-5 text-warn-ink sm:text-sm"
  >
    <TriangleAlert aria-hidden="true" className="shrink-0 mt-0.5 h-4 w-4" />
    <span>{message}</span>
  </p>
);

interface InitialDataAlertProps {
  message: string;
  severity: Exclude<InitialDataLoadStatus, 'ok'>;
}

const InitialDataAlert: React.FC<InitialDataAlertProps> = ({ message, severity }) => (
  <div
    role="alert"
    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
      severity === 'error'
        ? 'border-danger-line bg-danger-soft text-danger-ink'
        : 'border-warn-line bg-warn-soft text-warn-ink'
    }`}
  >
    <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
    <span>{message}</span>
  </div>
);

// 結果帯の 2 つの姿。--dock 0 が本来の姿、1 が簡易表示で、間はすべて線形補間。
// 数値は現行の Tailwind クラスの実寸をそのまま px にしたもの:
//   pad        … p-5 / p-6
//   headingLine… 見出し (text-sm) の行高
//   headingGap … 見出しの mb-4
//   gridMin    … 数値グリッドの min-h-24 / sm:min-h-20
//   label      … text-sm / sm:text-base
//   value      … text-2xl / sm:text-3xl
// クラスではなくインラインの数値で持つのは、中間値がユーティリティの
// スケール上に存在しないため。補間する以上リテラルにするしかない。
const BAND_FULL_NARROW = { pad: 20, headingLine: 20, headingGap: 16, gridMin: 96, label: 14, value: 24 };
const BAND_FULL_WIDE = { pad: 24, headingLine: 20, headingGap: 16, gridMin: 80, label: 16, value: 30 };

// 簡易表示。画面下端に貼り付くので、見出しもラベルも畳んで数値だけを残す。
// 横の余白 (pad) は畳まない —— 数値の x 座標が動くと「同じものが縮んだ」
// ではなく「別のものに入れ替わった」に見えてしまう。
//
// gridMin を 0 ではなく実値で持つのは、これが簡易表示の高さを決めているから。
// 数値だけの行の実寸 (value 18px × leading-tight = 22.5px) を上回る値にして、
// 高さが全区間で gridMin 側で決まるようにしてある。こうすると帯の高さが --dock の
// 一次関数になり、DOCK_ABSORB で変形距離を詰めても不変条件を保てる。
// 逆にここが 0 のままだと高さは折れ線になり、着地直前の変化率が跳ね上がる。
//
// 見出しとラベルの畳み方は下の ResultBand / ResultBandValue を参照。
// どちらも「見えている間は切り落とさない」ことを守る。
const BAND_COMPACT = { pad: 10, headingLine: 0, headingGap: 0, gridMin: 26, label: 12, value: 18 };

// 見出しの文字サイズ (#59 の text-sm と同じ)。行高は headingLine / これ の比で持つので、
// 箱の高さは文字サイズに比例して縮む —— 切り落とさずに畳めるのはこの比のおかげ。
const BAND_HEADING_FONT = 14;

// ラベルの行高。#59 はここを指定せず preflight の 1.5 を継承していたので、
// 明示しても本来の姿の見た目は変わらない。文字サイズに比例することが要点で、
// 箱が font-size と一緒に縮むので、こちらも切り落とす必要がない。
const LABEL_LINE_RATIO = 1.5;

// ラベルを畳む 2 段階。区間はどちらも --dock の値。
//   FADE     … 完全不透明から透明へ。ここでは箱を触らない (文字は完全サイズのまま)
//   COLLAPSE … 透明になった後で箱を 0 へ。目に見えないので切り落としが問題にならない
// つまり --dock <= LABEL_FADE[0] では常に完全なラベルが出る。
//
// COLLAPSE の終わりが 0.54 なのは幾何の制約。ラベルの箱は gridMin がセル実寸を
// 上回っている間だけ帯の高さに寄与しないが、wide ではセル実寸 (61.5 - 21d) と
// gridMin (80 - 54d) が d = 0.56 で交差する。その手前で箱を 0 にしておかないと
// 帯の高さが --dock の一次関数でなくなり、下の不変条件の余裕を食う。
const LABEL_FADE = [0.3, 0.45] as const;
const LABEL_COLLAPSE = [0.45, 0.54] as const;

// ラベルの箱の上限として使う値。自然な箱 (1.5 × 16px = 24px) より大きいので、
// COLLAPSE 区間に入るまで max-height は何も拘束しない
const LABEL_BOX_MAX = 30;

// 簡易表示の高さ。border-t の 1px は両方の姿に共通なので変形量には入らない
const BAND_COMPACT_HEIGHT =
  BAND_COMPACT.pad * 2 + BAND_COMPACT.headingLine + BAND_COMPACT.headingGap + BAND_COMPACT.gridMin;

// 帯がスクロールを吸収する割合。1 未満でなければならない ——
// 1 では帯が縮む速さと隙間が広がる速さが釣り合い、変形中ずっと「本来の下端が
// 画面下端にぴったり」の境界に乗る。1 を超えると帯のほうが速く縮み、変形の途中で
// sticky から解放されて画面下端を離れてしまう (簡易表示が本文と一緒に浮き上がる)。
// 小さくすると変形はゆっくりになり、ドック中に入力欄を覆う量が増える。
const DOCK_ABSORB = 0.9;

// --dock を 0..1 の補間係数として使う calc()。スクロール中に動くのは --dock だけなので、
// React はこの文字列を初回に置くだけでよく、再描画は起きない。
//
// フォールバックは 0 = 本来の姿。1 (簡易表示) にしてはならない —— --dock が何かの理由で
// 書かれなかったとき、1 だと帯は見出しもラベルも畳んだ 47px のまま固まり、計算結果が
// 名前のない 2 つの数字になる。実際に #62 でこれが起きた。0 なら最悪でも「ドックしない
// 普通の結果領域」に留まり、内容は失われない。
const DOCK_FALLBACK = 0;

const dockVar = `var(--dock, ${DOCK_FALLBACK})`;

const dockPx = (from: number, to: number): string => {
  const delta = to - from;

  return `calc(${from}px ${delta < 0 ? '-' : '+'} ${Math.abs(delta)}px * ${dockVar})`;
};

const dockFadeIn = `calc(1 - ${dockVar})`;

// --dock の [start, end] 区間だけで 0 → 1 に進む係数。区間の外は端点に張り付く。
// 「見えている間は畳まない」を表現するための道具で、フェードと箱の畳みを別の区間に
// 分けるために使う。フックは --dock を書くだけで、区間の切り出しは CSS 側で行う。
const dockRange = ([start, end]: readonly [number, number]): string =>
  `clamp(0, (${dockVar} - ${start}) / ${end - start}, 1)`;

// 上の係数で from → to を補間した px 値
const dockPxIn = (from: number, to: number, range: readonly [number, number]): string => {
  const delta = to - from;

  return `calc(${from}px ${delta < 0 ? '-' : '+'} ${Math.abs(delta)}px * ${dockRange(range)})`;
};

// 上の係数で 1 → 0 に落ちる不透明度
const dockFadeOutIn = (range: readonly [number, number]): string => `calc(1 - ${dockRange(range)})`;

// 帯の姿の寸法と、ドック度合いを測るための 2 つの距離。
const bandMetrics = (isCompactViewport: boolean) => {
  const full = isCompactViewport ? BAND_FULL_NARROW : BAND_FULL_WIDE;
  // 本来の姿での高さ。これを基準に食み出し量を測ることで、姿が戻りきる瞬間と
  // sticky がドックを解除する瞬間が一致する
  const fullHeight = full.pad * 2 + full.headingLine + full.headingGap + full.gridMin;
  // 帯が縮むことで吸収する量
  const travel = fullHeight - BAND_COMPACT_HEIGHT;

  return { full, fullHeight, travel, morphSpan: travel / DOCK_ABSORB };
};

// 計算結果の帯。シート内の 1 区画でありながら、まだそこまでスクロールして
// いない間は画面下端にドックして簡易表示になる。
//
// 重ねた別要素ではなく「帯そのものが変形する」ことが要点。position: sticky で
// 帯自身を画面下端に留め、見出し・ラベル・余白・文字サイズを --dock で線形補間して
// 縮める。だから利用者が見ているものは常に 1 つで、簡易表示と本来の姿の間に
// 乗り換えの瞬間が無い。控えを重ねる実装 (#58 初版) はこれを満たさなかった:
// 別々の 2 つがクロスフェードすると「上に何か出てきた」としか読めない。
// 横の余白と 2 分割グリッドは畳まないので、数値の x 座標は変形中も動かない。
//
// 補間は React ではなく CSS の calc() が行う (#60)。値はシート div の --dock に
// フックが直接書き込むので、この style 文字列はビューポート幅にしか依存せず、
// スクロール中の再描画は 0 回になる。連続値をそのまま使えるので、量子化と
// それを均すための transition が要らない = スクロールに 1:1 で追従する。
//
// useDockMorph をここではなく App で呼ぶのは、シート div の ref を持つのが App だから。
// この帯 (子) の useLayoutEffect の時点では祖先の ref はまだ null で、フックは何もせずに
// 抜け、deps も変わらないので二度と走らない —— #62 の「本来の姿でもラベルが出ない」は
// これが原因だった。観測対象の DOM を所有しているところでフックを呼ぶ。
//
// sticky が効くのはシート div から overflow-hidden を外したため。あれが付いて
// いるとシート自身がスクロールコンテナ扱いになり、中の sticky は「決して
// スクロールしない箱」に対して貼り付こうとして何も起きない。
//
// z-10 —— ドック中は上の入力欄に重なるので、その上に出す。トースト (z-50) や
// モーダル (z-50) より下。
// pointer-events はドック中だけ切る。入力欄の上に浮いている間はタップを
// 塞がないため。本来の位置に着地したら通常どおり選択できる。ドック中かどうかは
// シートの data-docked で伝わる (数値の --dock では pointer-events を表せない)。
//
// transition は色だけに残す。結果が出た瞬間の面の色替えとテーマ切替はここが担うが、
// 寸法に効かせるとスクロールへの追従が遅れる。
//
// aria-hidden は付けない —— 控えを重ねていた頃は二重読み上げを避けるために
// 必要だったが、今は要素が 1 つしかない。見出しは文字サイズ、ラベルは文字サイズと
// 不透明度、そして透明になった後の max-height で畳む。どれも display:none ではないので、
// 簡易表示のときも支援技術からは読める。
//
// 色は accent-soft / sunken ではなく overlay 系トークン。ドック中は本文の上に
// 浮くので、ダークの accent-soft (accent 14%) だと下の入力欄が透けて数値と
// 衝突する (#52)。ライトでは元の値へのエイリアスなので見た目は変わらない。
const ResultBand: React.FC<{
  results: Results | null;
  heading: string;
  placeholder: string;
  leftLabel: string;
  rightLabel: string;
  isCompactViewport: boolean;
}> = ({ results, heading, placeholder, leftLabel, rightLabel, isCompactViewport }) => {
  const { full, travel } = bandMetrics(isCompactViewport);

  return (
    <>
      <div
        style={{
          paddingTop: dockPx(full.pad, BAND_COMPACT.pad),
          // 下端にドックしている間はホームインジケータを避ける。畳んだ余白より
          // セーフエリアのほうが大きい端末では、そちらが下限になる
          paddingBottom: `max(${dockPx(full.pad, BAND_COMPACT.pad)}, env(safe-area-inset-bottom, 0px))`,
          paddingLeft: `${full.pad}px`,
          paddingRight: `${full.pad}px`,
        }}
        className={[
          'sticky bottom-0 z-10 border-t transition-colors',
          'group-data-[docked]:pointer-events-none',
          results !== null
            ? 'bg-overlay-accent border-overlay-accent-line'
            : 'bg-overlay border-overlay-line',
        ].join(' ')}
      >
        {/* 見出しは畳むだけで消さない (max-height ではなく文字サイズを縮めるので
            読み上げ順からも外れない)。
            切り落とし (max-height) ではなく font-size を縮めるのが要点 —— 見出しの箱は
            帯の高さそのものなので全区間に線形で分散させる必要があり、そこで切り落としを
            使うと文字が見えている間ずっと刻まれてしまう (#62)。行高を headingLine /
            BAND_HEADING_FONT の比で持てば、箱は文字サイズに比例して縮むので高さの
            一次性は保たれ、しかもどの瞬間も文字は切れない。
            overflow-hidden は保険 —— 翻訳が伸びて 2 行になると箱が headingLine の想定を
            超え、fullHeight がずれて着地位置が狂う。現行の 2 言語では起きない。 */}
        <h2
          style={{
            fontSize: dockPx(BAND_HEADING_FONT, 0),
            lineHeight: full.headingLine / BAND_HEADING_FONT,
            marginBottom: dockPx(full.headingGap, BAND_COMPACT.headingGap),
            opacity: dockFadeIn,
          }}
          className="overflow-hidden font-medium text-fg-muted"
        >
          {heading}
        </h2>
        <div
          style={{ minHeight: dockPx(full.gridMin, BAND_COMPACT.gridMin) }}
          className="grid w-full grid-cols-2 items-center gap-3 text-center sm:gap-4"
        >
          {results !== null ? (
            <>
              <ResultBandValue label={leftLabel} value={results.left} full={full} />
              <ResultBandValue label={rightLabel} value={results.right} full={full} />
            </>
          ) : (
            <p
              style={{ fontSize: dockPx(full.label, BAND_COMPACT.label) }}
              className="col-span-2 text-fg-subtle"
            >
              {placeholder}
            </p>
          )}
        </div>
      </div>
      {/* 帯が縮んだぶんを埋める。帯 + ここの合計が常に fullHeight になるので、変形中も
          シート以下・文書全体・スクロール可能範囲の高さが変わらない。再レイアウトは帯の
          内部に閉じ、保存欄や比較パネルの再配置とスクロール範囲の再計算が消える。
          ドック中は帯の本来の下端が必ず画面下端より下にあるので、ここが見えることはない */}
      <div aria-hidden="true" style={{ height: dockPx(0, travel) }} />
    </>
  );
};

// 帯の 1 セル。ラベルと数値の積み方は変えない —— 縦積みと横並びを切り替えると、
// その瞬間だけ別のレイアウトが割り込んで「変形」に見えなくなる。
//
// ラベルは 3 段構えで畳む (#62)。--dock 0.3 までは完全サイズ・完全不透明、そこから
// 0.45 で透明になり、透明になってから 0.54 までに箱を 0 へ畳む。**見えている間は
// 縮小も切り落としも起きない** —— 本来の姿とその近傍で常に完全なラベルが出ることを
// この順序が保証する。ラベルが無くて良いのは簡易表示だけ。
//
// この遅延が幾何的に無料なのは、ラベルの箱が gridMin がセル実寸を上回っている間は
// 帯の高さに寄与しないため。逆に区間の終わりを遅らせすぎると wide で交差してしまう
// (LABEL_COLLAPSE のコメント参照)。
const ResultBandValue: React.FC<{
  label: string;
  value: number;
  full: typeof BAND_FULL_NARROW;
}> = ({ label, value, full }) => (
  <div>
    <h3
      style={{
        // 数値と同率で縮める (#59 と同じ補間)。行高は比で持つので箱も一緒に縮み、
        // 切り落としなしで小さくなる
        fontSize: dockPx(full.label, BAND_COMPACT.label),
        lineHeight: LABEL_LINE_RATIO,
        // 箱を畳むのはフェードが終わった後だけ。それまでは LABEL_BOX_MAX が
        // 自然な箱より大きいので何も拘束しない
        maxHeight: dockPxIn(LABEL_BOX_MAX, 0, LABEL_COLLAPSE),
        opacity: dockFadeOutIn(LABEL_FADE),
      }}
      className="overflow-hidden font-medium text-fg-muted"
    >
      {label}
    </h3>
    <p
      style={{ fontSize: dockPx(full.value, BAND_COMPACT.value) }}
      className="font-semibold leading-tight tabular-nums tracking-tight text-accent-ink"
    >
      {value.toFixed(1)} mm
    </p>
  </div>
);

const spokeCountSegments: SegmentedOption[] = spokeCountOptions.map(value => ({ value, label: value }));

// セグメントには数字だけを描画する。375px では 5 分割で 1 セグメント約 60px しか
// なく、"0 (ラジアル組)" / "0 (Radial Lacing)" は収まらないため。
// 意味は 0 セグメントの aria-label（支援技術向け）と、下の常設キャプション
// （視覚的）の 2 経路で補う。
const useCrossingSegments = (): SegmentedOption[] => {
  const { t } = useTranslation();
  return useMemo(
    () => crossingOptions.map(value => (
      value === '0'
        ? { value, label: value, ariaLabel: t('input.radialLacing') }
        : { value, label: value }
    )),
    [t],
  );
};

// 選択状態に関係なく常に描画する。条件付きにするとレイアウトシフトが起きる
// （FieldError が h-5 を予約しているのと同じ規律）。
const RadialHint: React.FC = () => {
  const { t } = useTranslation();
  return <p className="mt-1 text-xs text-fg-subtle">{t('input.crossingsRadialHint')}</p>;
};

// Groups related input fields under a label, separated by a hairline rule.
// The rule lives on the wrapper rather than on the fieldset itself: a bordered
// fieldset gets a notch cut out of its top border where the legend sits.
// `min-w-0` neutralises the fieldset UA default `min-inline-size: min-content`,
// so a long unwrappable label can never push the form wider than its container.
const FieldGroup: React.FC<{
  label: string;
  icon: React.ReactNode;
  withRule?: boolean;
  children: React.ReactNode;
}> = ({ label, icon, withRule = true, children }) => (
  <div className={withRule ? 'border-t border-line pt-6' : undefined}>
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-semibold text-fg">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  </div>
);

const sectionHeading = 'mb-3 flex items-center gap-2 text-sm font-semibold text-fg';
const sectionHeadingIcon = 'h-4 w-4 shrink-0 text-accent';

// Regular number input component
interface NumberInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  step: number;
  min?: number;
  max?: number;
  error?: string;
  describedBy?: string;
  placeholder?: string;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  id,
  value,
  onChange,
  onBlur,
  step,
  min,
  max,
  error,
  describedBy,
  placeholder,
  className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Allow empty string as is
    if (newValue === '') {
      onChange(newValue);
      return;
    }

    // Allow just decimal point (during input)
    if (newValue === '.') {
      onChange(newValue);
      return;
    }

    // Allow decimal point at the end of number (e.g., "2.")
    if (newValue.endsWith('.') && !isNaN(parseFloat(newValue.slice(0, -1)))) {
      onChange(newValue);
      return;
    }

    const numValue = parseFloat(newValue);

    // Reject changes if not a number
    if (isNaN(numValue)) {
      return;
    }

    onChange(newValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentValue = e.target.value;
    onBlur?.();

    // Do nothing for empty string or decimal point only
    if (currentValue === '' || currentValue === '.') {
      return;
    }

    const numValue = parseFloat(currentValue);

    // When valid as number and step is 0.1 (for Spoke Hole Diameter)
    if (!isNaN(numValue) && step === 0.1) {
      // Display to 1 decimal place
      onChange(numValue.toFixed(1));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow numbers, decimal point, backspace, delete, arrow keys, tab and other control keys
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];

    if (allowedKeys.includes(e.key)) {
      return;
    }

    // Allow shortcuts like Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    // Reject anything other than numbers and decimal point
    if (!/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // Check for duplicate decimal points
    if (e.key === '.' && value.includes('.')) {
      e.preventDefault();
      return;
    }

  };

  return (
    <input
      id={id}
      type="number"
      step={step}
      min={min}
      max={max}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      aria-invalid={error !== undefined}
      aria-describedby={error !== undefined ? `${id}-error` : describedBy}
      className={getControlClassName(error !== undefined, className)}
      placeholder={placeholder}
    />
  );
};

const SpokeLengthCalculator: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const crossingSegments = useCrossingSegments();
  const [isCompactViewport, setIsCompactViewport] = useState(getIsCompactViewport);
  const [inputs, setInputs] = useState<Inputs>({
    erd: '',
    rimOffset: '0',
    pitchCircleLeft: '',
    pitchCircleRight: '',
    flangeDistanceLeft: '',
    flangeDistanceRight: '',
    spokeHoleDiameter: '2.6', // Hope Pro 5 value as default (author's personal preference)
    numberOfSpokes: '32', // Generally 32 spokes is common,
    crossingsLeft: '3', // 3-cross is also typical
    crossingsRight: '3' // 3-cross is also typical
  });

  const presetOptions = PRESET_LOAD_RESULT.options;
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>(
    INITIAL_SAVED_CALCULATIONS.calculations,
  );
  const [savedDataLoadStatus, setSavedDataLoadStatus] = useState<InitialDataLoadStatus>(
    INITIAL_SAVED_CALCULATIONS.status,
  );
  const [calculationName, setCalculationName] = useState('');
  const [showJsonOutput, setShowJsonOutput] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calculationToDelete, setCalculationToDelete] = useState<number | null>(null);
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const compareSectionRef = useRef<HTMLDivElement>(null);
  // 結果帯の直前の要素。帯は sticky で自分の位置から自分の状態を決められないので、
  // ドック度合いはこの下端 (= 帯の本来の上端) を測って決める
  const inputSectionRef = useRef<HTMLDivElement>(null);
  // ドック度合い (--dock) の書き込み先。帯だけでなくシート内の兄弟にも継承させたいので、
  // 帯自身ではなくシートに置く
  const sheetRef = useRef<HTMLDivElement>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  // 結果帯のドック度合いの計測。ResultBand の中ではなくここで呼ぶ —— 上の 2 つの ref を
  // 所有しているのが App なので、App の useLayoutEffect が走る時点では両方が attach 済み。
  // 子側で呼ぶと祖先 (シート) の ref がまだ null で、フックが何もせずに抜けてしまう (#62)。
  const bandDock = bandMetrics(isCompactViewport);

  useDockMorph(inputSectionRef, sheetRef, bandDock.fullHeight, bandDock.morphSpan);

  const calculation = useMemo(() => getCalculationState(inputs), [inputs]);
  const currentResults = calculation.results;
  const rimOffsetAssessment = getRimOffsetAssessment(inputs);
  const visibleFieldErrors = useMemo(() => {
    const errors: Partial<Record<InputField, string>> = {};

    for (const field of inputFields) {
      const errorKey = calculation.fieldErrors[field];

      if (errorKey !== undefined && (touchedFields[field] || inputs[field] !== '')) {
        errors[field] = t(errorKey);
      }
    }

    return errors;
  }, [calculation.fieldErrors, inputs, t, touchedFields]);
  const rimOffsetWarning = visibleFieldErrors.rimOffset === undefined
    ? (() => {
      if (rimOffsetAssessment.kind === 'directionIndeterminate') {
        return t('warnings.rimOffsetDirectionIndeterminate');
      }

      if (rimOffsetAssessment.kind === 'worsensAsymmetry') {
        return t('warnings.rimOffsetWorsensAsymmetry', {
          before: rimOffsetAssessment.originalDifference.toFixed(1),
          after: rimOffsetAssessment.effectiveDifference.toFixed(1),
        });
      }

      return undefined;
    })()
    : undefined;
  const hasValidResults = currentResults !== null;

  const wheelOptions = useMemo((): WheelOption[] => {
    const presetItems: WheelOption[] = presetOptions.map(p => ({
      id: `preset:${p.id}`,
      label: p.name,
      group: 'preset',
      spec: {
        label: p.name,
        leftLength: p.data.results.left,
        rightLength: p.data.results.right,
        spokeCount: parseInt(p.data.inputs.numberOfSpokes, 10) || 32,
      },
    }));
    const savedItems: WheelOption[] = savedCalculations.map(s => ({
      id: `saved:${s.id}`,
      label: s.name,
      group: 'saved',
      spec: {
        label: s.name,
        leftLength: s.results.left,
        rightLength: s.results.right,
        spokeCount: parseInt(s.inputs.numberOfSpokes, 10) || 32,
      },
    }));
    return [...presetItems, ...savedItems];
  }, [presetOptions, savedCalculations]);

  // タイトルは幅に関係なくフルで出す。375px でも折り返して収まり、
  // ヘッダーは flex-col になるので h1 が単独行を占める。
  const titleText = t('title');
  const resultsLeftText = t(isCompactViewport ? 'results.leftShort' : 'results.left');
  const resultsRightText = t(isCompactViewport ? 'results.rightShort' : 'results.right');
  const calculationNamePlaceholder = t(
    isCompactViewport ? 'results.namePlaceholderShort' : 'results.namePlaceholder'
  );

  const markFieldTouched = (field: InputField) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsCompactViewport(event.matches);
    };

    setIsCompactViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Language switch handler
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem('preferredLanguage', lang);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
    document.documentElement.lang = lang;
  };

  // Keep lang attribute in sync with i18n language
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Update input values
  const handleInputChange = (field: keyof Inputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    setSelectedPreset('');
  };

  // Save calculation results
  const saveCalculation = () => {
    if (!calculationName.trim()) {
      showToast(t('alerts.enterCalculationName'), 'warning');
      return;
    }

    if (currentResults === null) {
      showToast(t('alerts.performCalculationFirst'), 'warning');
      return;
    }

    const newCalculation: SavedCalculation = {
      id: Date.now(),
      name: calculationName,
      inputs: { ...inputs },
      results: { ...currentResults },
      timestamp: new Date().toLocaleString('ja-JP')
    };

    const updated = [...savedCalculations, newCalculation];
    try {
      localStorage.setItem('spokeCalculations', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save calculation:', error);
      showToast(t('alerts.saveFailed'), 'error');
      return;
    }

    setSavedCalculations(updated);
    setSavedDataLoadStatus('ok');
    setCalculationName('');
    showToast(t('alerts.saved'), 'success');
  };

  // Load saved calculation
  const loadCalculation = (calculation: SavedCalculation) => {
    setInputs(calculation.inputs);
    setTouchedFields(createTouchedFields(true));
    setSelectedPreset('');
  };

  // Load preset
  const loadPreset = (presetId: string) => {
    if (presetId === '') {
      setSelectedPreset('');
      return;
    }
    
    const preset = presetOptions.find(p => p.id === presetId);
    if (preset) {
      setInputs(preset.data.inputs);
      setTouchedFields({});
      setSelectedPreset(presetId);
    }
  };

  // Delete saved calculation
  const deleteCalculation = (id: number) => {
    setCalculationToDelete(id);
    setShowDeleteConfirm(true);
  };

  // Confirm deletion
  const confirmDelete = () => {
    if (calculationToDelete !== null) {
      const updated = savedCalculations.filter(calc => calc.id !== calculationToDelete);
      try {
        localStorage.setItem('spokeCalculations', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to delete calculation:', error);
        showToast(t('alerts.deleteFailed'), 'error');
        return;
      }

      setSavedCalculations(updated);
      setSavedDataLoadStatus('ok');
      showToast(t('alerts.deleted'), 'success');
    }
    setShowDeleteConfirm(false);
    setCalculationToDelete(null);
  };

  // Cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setCalculationToDelete(null);
  };

  const handleCompareToggle = () => {
    if (!showCompare) {
      compareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setShowCompare(prev => !prev);
  };

  // JSON export
  const exportToJSON = () => {
    if (currentResults === null) {
      showToast(t('alerts.performCalculationFirst'), 'warning');
      return;
    }

    const exportData = {
      inputs,
      results: currentResults,
      timestamp: new Date().toISOString(),
      metadata: {
        calculator: 'Bicycle Spoke Length Calculator',
        version: '1.0'
      }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    setJsonData(jsonString);
    setShowJsonOutput(true);
  };

  // Copy JSON data to clipboard
  const copyToClipboard = () => {
    if (!navigator.clipboard) {
      showToast(t('alerts.copyFailed'), 'error');
      return;
    }

    navigator.clipboard.writeText(jsonData).then(() => {
      showToast(t('alerts.copiedToClipboard'), 'success');
    }).catch(() => {
      showToast(t('alerts.copyFailed'), 'error');
    });
  };

  // Download JSON data as file
  const downloadJSON = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `spoke-calculation-${timestamp}.json`;

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(t('alerts.jsonDownloaded'), 'success');
  };

  // Load from JSON file
  const loadFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        if (e.target && typeof e.target.result === 'string') {
          const parsed: unknown = JSON.parse(e.target.result);

          if (!isRecord(parsed)) {
            showToast(t('alerts.invalidJsonFormat'), 'error');
            return;
          }

          const normalizedInputs = normalizeInputs(parsed.inputs);

          if (normalizedInputs !== null) {
            setInputs(normalizedInputs);
            setTouchedFields(createTouchedFields(true));
            setSelectedPreset('');

            const importedCalculation = getCalculationState(normalizedInputs);
            showToast(
              importedCalculation.results === null
                ? t('alerts.jsonLoadedWithValidationErrors')
                : t('alerts.jsonLoaded'),
              importedCalculation.results === null ? 'warning' : 'success',
            );
          } else {
            showToast(t('alerts.invalidJsonFormat'), 'error');
          }
        }
      } catch {
        showToast(t('alerts.jsonLoadFailed'), 'error');
      }
    };
    reader.onerror = () => {
      showToast(t('alerts.jsonLoadFailed'), 'error');
    };
    reader.readAsText(file);

    // Reset file selection
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-page text-fg transition-colors">
      {/* max-w-3xl は 798074c (#27) が外した幅制限を意図的に戻したもの。#27 が問題視
          したのは何も整理しない装飾的なシートだったが、下のシートは既存の FieldGroup
          セマンティクスと 1:1 で対応する機能的な区切り。旧 max-w-4xl より狭くし、
          モバイルは p-4 のままなので表示領域は失われない。 */}
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <header
          className="mb-8 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {titleText}
          </h1>
          <div className="flex items-center gap-3">
            {/* 選択肢が English / 日本語 と自明なのでアイコンは置かない。
                そのぶんアクセシブル名は aria-label で与える。 */}
            <div className="relative">
              <select
                value={i18n.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                aria-label={t('language.label')}
                className={`${nativeSelect} min-h-9 w-auto py-1 pr-8 text-sm`}
              >
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
              <ChevronDown aria-hidden="true" className={`${selectChevron} right-2.5`} />
            </div>
            <button
              onClick={toggleTheme}
              className={btnGhost}
              title={t('theme.toggle')}
              aria-label={t('theme.toggle')}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Moon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        {/* 入力と結果を 1 枚のシートに収め、ハイラインで区切る。
            overflow-hidden は付けない —— 付けるとこの div がスクロールコンテナに
            なり、中の結果帯の position: sticky が効かなくなる。子は入力欄・
            結果帯・保存欄の 3 つで、背景を持つのは中央の結果帯だけなので、
            角丸のクリップは元々不要。
            group と ref はドック度合いのため —— --dock と data-docked をここに書き、
            結果帯は group-data-[docked]: で受ける */}
        <div ref={sheetRef} className="group rounded-xl border border-line bg-surface">
          {/* Input section */}
          <div ref={inputSectionRef} className="space-y-6 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-fg border-b border-line pb-2">{t('input.heading')}</h2>

          <div className="space-y-6">
            {PRESET_LOAD_RESULT.errors.length > 0 && (
              <InitialDataAlert
                message={t('alerts.presetLoadError')}
                severity="error"
              />
            )}

            {/* Preset selection - only show if presets exist */}
            {presetOptions.length > 0 && (
              <div>
                <label htmlFor="preset" className={sectionHeading}>
                  <SlidersHorizontal aria-hidden="true" className={sectionHeadingIcon} />
                  {t('input.preset')}
                </label>
                <div className="relative">
                  <select
                    id="preset"
                    value={selectedPreset}
                    onChange={(e) => loadPreset(e.target.value)}
                    className={nativeSelect}
                  >
                    <option value="">{t('input.presetOption')}</option>
                    {presetOptions.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden="true" className={selectChevron} />
                </div>
              </div>
            )}

            {/* Without the preset block above, this rule would double up with the h2 border */}
            <FieldGroup
              label={t('input.group.rim')}
              icon={<Circle aria-hidden="true" className={sectionHeadingIcon} />}
              withRule={presetOptions.length > 0}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-sm font-medium text-fg-muted">{t('input.erd')}</label>
                    <HelpButton topic="erd" onOpen={setHelpTopic} />
                  </div>
                  <NumberInput
                    id="erd"
                    value={inputs.erd}
                    onChange={(value) => handleInputChange('erd', value)}
                    onBlur={() => markFieldTouched('erd')}
                    step={1}
                    min={1}
                    max={1000}
                    error={visibleFieldErrors.erd}
                    placeholder={t('input.erdPlaceholder')}
                  />
                  <FieldError id="erd-error" message={visibleFieldErrors.erd} />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-sm font-medium text-fg-muted">{t('input.rimOffset')}</label>
                    <HelpButton topic="rimOffset" onOpen={setHelpTopic} />
                  </div>
                  <NumberInput
                    id="rimOffset"
                    value={inputs.rimOffset}
                    onChange={(value) => handleInputChange('rimOffset', value)}
                    onBlur={() => markFieldTouched('rimOffset')}
                    step={0.1}
                    min={0}
                    max={100}
                    error={visibleFieldErrors.rimOffset}
                    describedBy={rimOffsetWarning !== undefined ? 'rimOffset-warning' : undefined}
                    placeholder={t('input.rimOffsetPlaceholder')}
                  />
                  {rimOffsetWarning !== undefined ? (
                    <FieldWarning id="rimOffset-warning" message={rimOffsetWarning} />
                  ) : (
                    <FieldError id="rimOffset-error" message={visibleFieldErrors.rimOffset} />
                  )}
                </div>
              </div>
            </FieldGroup>

            <FieldGroup
              label={t('input.group.hub')}
              icon={<MtbHubIcon aria-hidden="true" className={sectionHeadingIcon} />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-sm font-medium text-fg-muted">
                      <span className="md:hidden">{t('input.pcdLeft')}</span>
                      <span className="hidden md:block">{t('input.pcdLeft')}</span>
                    </label>
                    <HelpButton topic="pcd" onOpen={setHelpTopic} />
                  </div>
                  <NumberInput
                    id="pitchCircleLeft"
                    value={inputs.pitchCircleLeft}
                    onChange={(value) => handleInputChange('pitchCircleLeft', value)}
                    onBlur={() => markFieldTouched('pitchCircleLeft')}
                    step={1}
                    min={1}
                    max={100}
                    error={visibleFieldErrors.pitchCircleLeft}
                    placeholder={t('input.flangeLeftPlaceholder')}
                  />
                  <FieldError id="pitchCircleLeft-error" message={visibleFieldErrors.pitchCircleLeft} />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-sm font-medium text-fg-muted">
                      <span className="md:hidden">{t('input.pcdRight')}</span>
                      <span className="hidden md:block">{t('input.pcdRight')}</span>
                    </label>
                    <HelpButton topic="pcd" onOpen={setHelpTopic} />
                  </div>
                  <NumberInput
                    id="pitchCircleRight"
                    value={inputs.pitchCircleRight}
                    onChange={(value) => handleInputChange('pitchCircleRight', value)}
                    onBlur={() => markFieldTouched('pitchCircleRight')}
                    step={1}
                    min={1}
                    max={100}
                    error={visibleFieldErrors.pitchCircleRight}
                    placeholder={t('input.flangeRightPlaceholder')}
                  />
                  <FieldError id="pitchCircleRight-error" message={visibleFieldErrors.pitchCircleRight} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-sm font-medium text-fg-muted">{t('input.flangeDistanceLeft')}</label>
                    <HelpButton topic="flangeDistance" onOpen={setHelpTopic} />
                  </div>
                  <NumberInput
                    id="flangeDistanceLeft"
                    value={inputs.flangeDistanceLeft}
                    onChange={(value) => handleInputChange('flangeDistanceLeft', value)}
                    onBlur={() => markFieldTouched('flangeDistanceLeft')}
                    step={1}
                    min={1}
                    max={100}
                    error={visibleFieldErrors.flangeDistanceLeft}
                    placeholder={t('input.flangeLeftPlaceholder')}
                  />
                  <FieldError id="flangeDistanceLeft-error" message={visibleFieldErrors.flangeDistanceLeft} />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-sm font-medium text-fg-muted">{t('input.flangeDistanceRight')}</label>
                    <HelpButton topic="flangeDistance" onOpen={setHelpTopic} />
                  </div>
                  <NumberInput
                    id="flangeDistanceRight"
                    value={inputs.flangeDistanceRight}
                    onChange={(value) => handleInputChange('flangeDistanceRight', value)}
                    onBlur={() => markFieldTouched('flangeDistanceRight')}
                    step={1}
                    min={1}
                    max={100}
                    error={visibleFieldErrors.flangeDistanceRight}
                    placeholder={t('input.flangeRightPlaceholder')}
                  />
                  <FieldError id="flangeDistanceRight-error" message={visibleFieldErrors.flangeDistanceRight} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="block text-sm font-medium text-fg-muted">{t('input.spokeHoleDiameter')}</label>
                  <HelpButton topic="spokeHoleDiameter" onOpen={setHelpTopic} />
                </div>
                <NumberInput
                  id="spokeHoleDiameter"
                  value={inputs.spokeHoleDiameter}
                  onChange={(value) => handleInputChange('spokeHoleDiameter', value)}
                  onBlur={() => markFieldTouched('spokeHoleDiameter')}
                  step={0.1}
                  min={1.0}
                  max={3.0}
                  error={visibleFieldErrors.spokeHoleDiameter}
                  placeholder={t('input.spokeHolePlaceholder')}
                />
                <FieldError id="spokeHoleDiameter-error" message={visibleFieldErrors.spokeHoleDiameter} />
              </div>
            </FieldGroup>

            <FieldGroup
              label={t('input.group.lacing')}
              icon={<Waypoints aria-hidden="true" className={sectionHeadingIcon} />}
            >
              <div>
                {/* label ではなく span + aria-labelledby。radiogroup は単一の
                    フォームコントロールではないので label/for では結びつかない。
                    元の <label> は htmlFor を持っておらず既に未関連付けだったので、
                    これは退行ではなく a11y 上の改善。 */}
                <span id="numberOfSpokes-label" className="block text-sm font-medium text-fg-muted mb-1">
                  {t('input.numberOfSpokes')}
                </span>
                <SegmentedControl
                  name="numberOfSpokes"
                  labelledBy="numberOfSpokes-label"
                  value={inputs.numberOfSpokes}
                  options={spokeCountSegments}
                  onChange={(value) => handleInputChange('numberOfSpokes', value)}
                  onBlur={() => markFieldTouched('numberOfSpokes')}
                  invalid={visibleFieldErrors.numberOfSpokes !== undefined}
                  describedBy={visibleFieldErrors.numberOfSpokes !== undefined ? 'numberOfSpokes-error' : undefined}
                />
                <FieldError id="numberOfSpokes-error" message={visibleFieldErrors.numberOfSpokes} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <span id="crossingsLeft-label" className="block text-sm font-medium text-fg-muted">{t('input.crossingsLeft')}</span>
                    <HelpButton topic="crossings" onOpen={setHelpTopic} />
                  </div>
                  <SegmentedControl
                    name="crossingsLeft"
                    labelledBy="crossingsLeft-label"
                    value={inputs.crossingsLeft}
                    options={crossingSegments}
                    onChange={(value) => handleInputChange('crossingsLeft', value)}
                    onBlur={() => markFieldTouched('crossingsLeft')}
                    invalid={visibleFieldErrors.crossingsLeft !== undefined}
                    describedBy={visibleFieldErrors.crossingsLeft !== undefined ? 'crossingsLeft-error' : undefined}
                  />
                  <RadialHint />
                  <FieldError id="crossingsLeft-error" message={visibleFieldErrors.crossingsLeft} />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <span id="crossingsRight-label" className="block text-sm font-medium text-fg-muted">{t('input.crossingsRight')}</span>
                    <HelpButton topic="crossings" onOpen={setHelpTopic} />
                  </div>
                  <SegmentedControl
                    name="crossingsRight"
                    labelledBy="crossingsRight-label"
                    value={inputs.crossingsRight}
                    options={crossingSegments}
                    onChange={(value) => handleInputChange('crossingsRight', value)}
                    onBlur={() => markFieldTouched('crossingsRight')}
                    invalid={visibleFieldErrors.crossingsRight !== undefined}
                    describedBy={visibleFieldErrors.crossingsRight !== undefined ? 'crossingsRight-error' : undefined}
                  />
                  <RadialHint />
                  <FieldError id="crossingsRight-error" message={visibleFieldErrors.crossingsRight} />
                </div>
              </div>
            </FieldGroup>

          </div>
        </div>

        {/* 結果はシート内の帯。角丸を持たせず、上のハイラインで区切る。
            まだそこまでスクロールしていない間は画面下端にドックして縮む */}
        <ResultBand
          results={currentResults}
          heading={t('results.heading')}
          placeholder={t('results.placeholder')}
          leftLabel={resultsLeftText}
          rightLabel={resultsRightText}
          isCompactViewport={isCompactViewport}
        />

        {/* Save and export */}
        <div className="space-y-4 border-t border-line p-5 sm:p-6">
          <div>
            <label htmlFor="calculationName" className={sectionHeading}>
              <Tag aria-hidden="true" className={sectionHeadingIcon} />
              {t('results.calculationName')}
            </label>
            <input
              id="calculationName"
              type="text"
              value={calculationName}
              onChange={(e) => setCalculationName(e.target.value)}
              className="w-full min-h-11 px-3 py-2 border border-line-strong rounded-md bg-surface text-fg placeholder:text-fg-subtle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              placeholder={calculationNamePlaceholder}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={saveCalculation}
              disabled={!hasValidResults}
              className={btnPrimary}
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {t('buttons.save')}
            </button>
            <button
              onClick={exportToJSON}
              disabled={!hasValidResults}
              className={btnSecondary}
            >
              <FileJson className="w-4 h-4" aria-hidden="true" />
              <span className="sm:hidden">{t('buttons.jsonShort')}</span>
              <span className="hidden sm:inline">{t('buttons.jsonDisplay')}</span>
            </button>
          </div>
          {/* Load JSON file */}
          <label className="block">
            <input
              type="file"
              accept=".json"
              onChange={loadFromJSON}
              className="hidden"
            />
            <span className={`${btnSecondary} w-full cursor-pointer`}>
              <FileUp className="w-4 h-4" aria-hidden="true" />
              {t('buttons.loadJson')}
            </span>
          </label>

          {/* List of saved calculations */}
          {savedDataLoadStatus !== 'ok' && (
            <InitialDataAlert
              message={t('alerts.savedDataLoadFailed')}
              severity={savedDataLoadStatus}
            />
          )}

          {savedCalculations.length > 0 && (
            <div className="pt-2">
              <h3 className="text-base font-semibold text-fg mb-3">{t('results.savedCalculations')}</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedCalculations.map((calc) => (
                  <div key={calc.id} className="border border-line bg-surface rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-fg">{calc.name}</p>
                      <p className="text-xs tabular-nums text-fg-subtle">{calc.timestamp}</p>
                      <p className="text-sm tabular-nums text-fg-muted">
                        {resultsLeftText}: {calc.results.left !== null ? calc.results.left.toFixed(1) : '-'}mm / {resultsRightText}: {calc.results.right !== null ? calc.results.right.toFixed(1) : '-'}mm
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => loadCalculation(calc)}
                        className={`${btnGhost} text-sm text-accent-ink hover:text-accent`}
                      >
                        {t('buttons.load')}
                      </button>
                      <button
                        onClick={() => deleteCalculation(calc.id)}
                        aria-label={t('dialog.confirm')}
                        className={`${btnGhost} text-danger-ink hover:text-danger`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Wheel compare section
            比較も入力シートと同じ作法 —— 外枠 1 枚、中はハイラインで区切る。
            見出しはこのボタン 1 つだけ (パネル内に h2 を重ねると同じことを 2 回言う)。
            overflow-hidden は付けない: ボタンの focus ring が outline-offset-2 で
            枠の外に出るため、クリップすると可視フォーカスが消える */}
        <div ref={compareSectionRef} className="mt-8 rounded-xl border border-line bg-surface">
          {/* APG の disclosure —— 見出しの中にボタン。input.heading と同格の h2 */}
          <h2>
            <button
              onClick={handleCompareToggle}
              aria-expanded={showCompare}
              aria-controls="compare-panel"
              className={`w-full min-h-11 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 text-left text-lg font-semibold text-fg hover:bg-sunken transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${showCompare ? 'rounded-t-xl border-b border-line' : 'rounded-xl'}`}
            >
              <span className="flex items-center gap-2">
                <ArrowLeftRight aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
                {t('compare.toggle')}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`shrink-0 h-4 w-4 text-fg-subtle transition-transform ${showCompare ? 'rotate-180' : ''}`}
              />
            </button>
          </h2>
          {/* 区切りのハイラインはボタン側 (border-b) に置く。パネルに border-t を
              持たせると fade-in-down の -8px にハイラインごと引きずられ、
              開く瞬間だけ区切り線がヘッダ行の中を滑り降りて見える */}
          {showCompare && (
            <div id="compare-panel" className="p-5 sm:p-6 animate-fade-in-down">
              <CompareWheels
                options={wheelOptions}
                selectedA={compareA}
                selectedB={compareB}
                onChangeA={setCompareA}
                onChangeB={setCompareB}
              />
            </div>
          )}
        </div>
      </div>

      {/* JSON data display modal */}
      {showJsonOutput && (
        <div className="fixed inset-0 bg-scrim flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-line rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-fg">{t('results.jsonOutput')}</h3>
              <button
                onClick={() => setShowJsonOutput(false)}
                aria-label={t('buttons.close')}
                className={btnGhost}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <textarea
              value={jsonData}
              readOnly
              className="w-full flex-1 min-h-64 p-3 border border-line-strong rounded-md text-sm font-mono bg-sunken text-fg resize-none mb-4"
            />
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button onClick={copyToClipboard} className={`${btnSecondary} w-full sm:w-auto`}>
                {t('buttons.copyToClipboard')}
              </button>
              <button onClick={downloadJSON} className={`${btnPrimary} w-full sm:w-auto`}>
                <FileJson className="w-4 h-4" aria-hidden="true" />
                {t('buttons.downloadJson')}
              </button>
              <button onClick={() => setShowJsonOutput(false)} className={`${btnSecondary} w-full sm:w-auto`}>
                {t('buttons.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title={t('dialog.deleteConfirm.title')}
        message={t('dialog.deleteConfirm.message')}
      />

      {/* Help modal */}
      <HelpModal topic={helpTopic} onClose={() => setHelpTopic(null)} />
    </div>
  );
};

export default SpokeLengthCalculator;
