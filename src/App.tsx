import React, { useState, useEffect, useMemo, useRef, type RefObject } from 'react';
import { Save, Trash2, FileJson, FileUp, Sun, Moon, TriangleAlert, ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { useBelowFoldProgress } from './hooks/useBelowFoldProgress';
import { ConfirmDialog } from './components/ConfirmDialog';
import { HelpButton } from './components/HelpButton';
import { HelpModal, type HelpTopic } from './components/HelpModal';
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

// スクロール中プレビューの 1 セル。計算できない間は「—」を出す。
// バーごと消すのではなく値だけを置き換えるので、入力を打ち直している最中に
// プレビューが出たり消えたりして視線が飛ばない。
// justify-center —— 2 分割グリッドの列中央に置くことで、本来の結果帯
// (同じ 2 分割グリッド) と数値の x 座標が揃う。
const ResultPreviewValue: React.FC<{ label: string; value?: number }> = ({ label, value }) => (
  <div className="flex items-baseline justify-center gap-1.5 whitespace-nowrap">
    <span className="text-xs font-medium text-fg-muted">{label}</span>
    <span
      className={[
        'text-base font-semibold tabular-nums tracking-tight sm:text-lg',
        value !== undefined ? 'text-accent-ink' : 'text-fg-subtle',
      ].join(' ')}
    >
      {value !== undefined ? `${value.toFixed(1)} mm` : '— mm'}
    </span>
  </div>
);

// スクロール中の結果プレビュー。結果帯 (本来の計算結果領域) が画面下端より
// 下に食み出している量 (useBelowFoldProgress) に連動して、画面下端に控えを
// 出し入れする。結果帯は画面下端から入ってくるので、バーも下端にいることで
// 「帯がドックから外れる / 戻る」1 つの動きとして読める。
//
// 帯の複製なのでスクリーンリーダーには渡さない (aria-hidden) —— 帯そのものが
// 常に DOM にあり、二重読み上げは害でしかない。
// pointer-events-none —— 下端は入力欄の上に重なるので、タップを塞がない。
// z-40 —— トースト (bottom-4 right-4 z-50) とモーダル (z-50) の下に敷く。
// 実際には両者と同時には出ない (トーストは保存/書き出し操作からしか出ず、
// そのとき帯は既に画面内 = progress 0) が、重ね順は明示しておく。
//
// 条件付きマウントではなく常設し、opacity / translate の遷移で出し入れする。
// アンマウントでは消えるほうが一瞬で終わり、出入りが非対称になるため。
// visibility も遷移対象に入れてある —— visible が絡む遷移では最後まで visible
// が保たれるので、フェードアウトを最後まで見せたうえで非表示時はヒットテスト
// からも外れる。
// translate であって transform ではない: Tailwind v4 の translate-* は
// transform ではなく個別プロパティを吐くので、transform を並べても何も
// 動かない。transition-property に translate 単体で列挙する必要がある。
// scale は使わない —— 全幅のバーを縮小すると左右端が結果帯の列端からずれ、
// 「幅を揃える」ことの意味が消える。動きは opacity + 縦移動 16px のみ。
//
// duration-100 ease-linear は「出し入れ」の演出ではなく、progress の量子化
// (0.05 刻み) の段差を均すためだけの補間。長くするとスクロールに対して
// 遅れて見える。かつてここにあった 300ms / 200ms の非対称 duration
// (#57, 慣性スクロール中に知覚できる強度を稼ぐための工夫) は、
// スクロール位置に直接連動する本方式では不要になった —— 知覚できる強度は
// 連動そのものが担う。
//
// 色は結果帯と同じ accent-soft / sunken ではなく overlay 系トークンを使う。
// 帯は不透明なシートに敷かれた面だがこれは本文の上に浮くので、ダークの
// accent-soft (accent 14%) だと下の入力欄が透けて数値と衝突する (#52)。
// overlay 系はライトでは帯と同値のエイリアスなので見た目は変わらない。
//
// shadow は付けない —— 既定の影は下向きに落ちるので、下端固定の要素では
// 画面外に出て何もしない。輪郭は罫線 (border-x border-t) だけが担う。
const ResultPreviewBar: React.FC<{
  valuesRef: RefObject<HTMLDivElement | null>;
  results: Results | null;
  leftLabel: string;
  rightLabel: string;
}> = ({ valuesRef, results, leftLabel, rightLabel }) => {
  const progress = useBelowFoldProgress(valuesRef);

  return (
    <div
      aria-hidden="true"
      style={{
        // 不透明度は progress 0.6 で振り切る。帯が動き始めてすぐ数値が
        // 読める濃さになってほしいので、フル連動より早く立ち上げる。
        '--preview-opacity': Math.min(1, progress / 0.6),
        '--preview-shift': `${(1 - progress) * 16}px`,
      } as React.CSSProperties}
      className={[
        'pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 sm:px-6',
        'opacity-[var(--preview-opacity)] translate-y-[var(--preview-shift)]',
        'transition-[opacity,translate,visibility] duration-100 ease-linear',
        'motion-reduce:translate-none motion-reduce:transition-none',
        progress === 0 ? 'invisible' : 'visible',
      ].join(' ')}
    >
      <div
        className={[
          'w-full max-w-3xl border-x border-t px-5 py-3 transition-colors sm:px-6',
          'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
          results !== null
            ? 'bg-overlay-accent border-overlay-accent-line'
            : 'bg-overlay border-overlay-line',
        ].join(' ')}
      >
        <div className="grid grid-cols-2 items-center gap-3 text-center sm:gap-4">
          <ResultPreviewValue label={leftLabel} value={results?.left} />
          <ResultPreviewValue label={rightLabel} value={results?.right} />
        </div>
      </div>
    </div>
  );
};

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
  withRule?: boolean;
  children: React.ReactNode;
}> = ({ label, withRule = true, children }) => (
  <div className={withRule ? 'border-t border-line pt-6' : undefined}>
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-semibold text-fg">
        {label}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  </div>
);

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

  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [calculationName, setCalculationName] = useState('');
  const [showJsonOutput, setShowJsonOutput] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [presetOptions, setPresetOptions] = useState<PresetOption[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calculationToDelete, setCalculationToDelete] = useState<number | null>(null);
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const savedCalculationsLoadedRef = useRef(false);
  const compareSectionRef = useRef<HTMLDivElement>(null);
  const resultValuesRef = useRef<HTMLDivElement>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

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
    if (showCompare) {
      compareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showCompare]);

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

  // Dynamically load preset data
  useEffect(() => {
    const loadPresets = async () => {
      const presets: PresetOption[] = [];
      let hasError = false;

      for (const [path, module] of Object.entries(presetModules)) {
        try {
          const data = module as PresetData;

          const normalizedInputs = normalizeInputs(data.inputs);
          const normalizedResults = normalizeResults(data.results);

          if (normalizedInputs === null || normalizedResults === null) {
            console.error(`Invalid preset format in ${path}: missing or invalid required fields`);
            hasError = true;
            continue;
          }

          const presetCalculation = getCalculationState(normalizedInputs);

          if (presetCalculation.results === null) {
            console.error(`Invalid preset format in ${path}: preset inputs cannot be calculated`);
            hasError = true;
            continue;
          }

          // Generate ID from filename
          const fileName = path.split('/').pop()?.replace('.json', '') || '';
          
          // Determine display name (use displayName if available, otherwise format filename)
          const displayName = data.displayName || fileName
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());

          presets.push({
            id: fileName,
            name: displayName,
            data: {
              ...data,
              inputs: normalizedInputs,
              results: presetCalculation.results,
            },
          });
        } catch (error) {
          console.error(`Failed to load preset from ${path}:`, error);
          hasError = true;
        }
      }

      setPresetOptions(presets);
      
      // Show toast notification if there were errors
      if (hasError) {
        showToast(t('alerts.presetLoadError'), 'error');
      }
    };

    loadPresets();
  }, [showToast, t]);

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

  // Load saved calculations from local storage
  useEffect(() => {
    if (savedCalculationsLoadedRef.current) {
      return;
    }

    savedCalculationsLoadedRef.current = true;

    try {
      const saved = localStorage.getItem('spokeCalculations');

      if (!saved) {
        return;
      }

      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        throw new Error('Saved calculations must be an array');
      }

      const normalized = parsed
        .map(normalizeSavedCalculation)
        .filter((calculation): calculation is SavedCalculation => calculation !== null);

      setSavedCalculations(normalized);

      if (normalized.length !== parsed.length) {
        showToast(t('alerts.savedDataLoadFailed'), 'warning');
      }
    } catch (error) {
      console.warn('Failed to load saved calculations:', error);
      setSavedCalculations([]);
      showToast(t('alerts.savedDataLoadFailed'), 'error');
    }
  }, [showToast, t]);

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
          </div>
        </header>

        {/* 入力と結果を 1 枚のシートに収め、ハイラインで区切る */}
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {/* Input section */}
          <div className="space-y-6 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-fg border-b border-line pb-2">{t('input.heading')}</h2>

          <div className="space-y-6">
            {/* Preset selection - only show if presets exist */}
            {presetOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-1.5">{t('input.preset')}</label>
                <div className="relative">
                  <select
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
            <FieldGroup label={t('input.group.rim')} withRule={presetOptions.length > 0}>
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

            <FieldGroup label={t('input.group.hub')}>
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

            <FieldGroup label={t('input.group.lacing')}>
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

        {/* 結果はシート内の帯。角丸を持たせず、上のハイラインで区切る */}
        <div
          className={[
            'border-t p-5 transition-colors sm:p-6',
            currentResults !== null
              ? 'bg-accent-soft border-accent-line'
              : 'bg-sunken border-line',
          ].join(' ')}
        >
          <h2 className="mb-4 text-sm font-medium text-fg-muted">{t('results.heading')}</h2>
          {/* プレビューの出し入れはこのグリッド (数値そのもの) を見て決める。
              帯全体だと見出しが覗いた時点で「見えた」ことになってしまう */}
          <div
            ref={resultValuesRef}
            className="grid min-h-24 w-full grid-cols-2 items-center gap-3 text-center sm:min-h-20 sm:gap-4"
          >
            {currentResults !== null ? (
              <>
                <div>
                  <h3 className="text-sm font-medium text-fg-muted sm:text-base">{resultsLeftText}</h3>
                  <p className="text-2xl font-semibold leading-tight tabular-nums tracking-tight text-accent-ink sm:text-3xl">
                    {currentResults.left.toFixed(1)} mm
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-fg-muted sm:text-base">{resultsRightText}</h3>
                  <p className="text-2xl font-semibold leading-tight tabular-nums tracking-tight text-accent-ink sm:text-3xl">
                    {currentResults.right.toFixed(1)} mm
                  </p>
                </div>
              </>
            ) : (
              <p className="col-span-2 text-sm text-fg-subtle sm:text-base">
                {t('results.placeholder')}
              </p>
            )}
          </div>
        </div>

        {/* Save and export */}
        <div className="space-y-4 border-t border-line p-5 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1.5">{t('results.calculationName')}</label>
            <input
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

        {/* Wheel compare section */}
        <div ref={compareSectionRef} className="mt-8">
          <button
            onClick={() => setShowCompare(prev => !prev)}
            aria-expanded={showCompare}
            aria-controls="compare-panel"
            className="w-full min-h-11 flex items-center justify-between px-4 py-3 rounded-lg border border-line bg-surface hover:bg-sunken text-fg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span>{t('compare.toggle')}</span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 text-fg-subtle transition-transform ${showCompare ? 'rotate-180' : ''}`}
            />
          </button>
          {showCompare && (
            <div id="compare-panel" className="mt-4 rounded-xl border border-line bg-surface p-5 sm:p-6 animate-fade-in-down">
              <h2 className="text-lg font-semibold text-fg mb-4">{t('compare.heading')}</h2>
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

      <ResultPreviewBar
        valuesRef={resultValuesRef}
        results={currentResults}
        leftLabel={resultsLeftText}
        rightLabel={resultsRightText}
      />

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
