// ハブ / リム単体の「部品プリセット」を読むための純粋モジュール。
//
// import.meta.glob は Vite 専用なので呼び出し側 (App.tsx) に置き、ここはモジュールの
// マップを受け取るだけにしてある —— おかげで node --test から素で読める。
//
// 全体プリセット (src/presets/*.json) が 10 項目すべてを持つのに対し、部品プリセットは
// 自分の担当項目だけを持つ。担当の切り方は入力フォームの FieldGroup と同じ:
// リム = ERD / リムオフセット、ハブ = PCD / フランジ距離 / スポーク穴径。
// スポーク本数とクロス数は「ハブとリムの穴数が一致して初めて決まる」組み方側の値なので
// 部品には含めない (同じハブが 28H/32H で存在しうる)。

export const HUB_FIELDS = [
  'pitchCircleLeft',
  'pitchCircleRight',
  'flangeDistanceLeft',
  'flangeDistanceRight',
  'spokeHoleDiameter',
] as const;

export const RIM_FIELDS = ['erd', 'rimOffset'] as const;

export type HubPosition = 'front' | 'rear';

export interface PartPresetOption {
  /** ファイル名から拡張子を除いたもの。select の option value になる */
  id: string;
  name: string;
  /** ハブのみ。select の optgroup 見出しに使う */
  position?: HubPosition;
  fields: Record<string, string>;
}

export interface PartPresetLoadResult {
  options: PartPresetOption[];
  errors: string[];
}

/** matchPreset に渡せる最小形。全体プリセットもこの形に均してから渡す */
export interface MatchablePreset {
  id: string;
  fields: Record<string, string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isHubPosition = (value: unknown): value is HubPosition => (
  value === 'front' || value === 'rear'
);

// 部品の値は必ず有限の数値でなければならない。全体プリセットのローダーは文字列を
// そのまま通して後段の計算で弾いているが、部品は単体では計算できないのでここで弾く。
const normalizeFieldValue = (value: unknown): string | null => {
  let text: string;

  if (typeof value === 'string') {
    text = value.trim();
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    text = String(value);
  } else {
    return null;
  }

  if (text === '' || !Number.isFinite(Number(text))) {
    return null;
  }

  return text;
};

// displayName が無いファイル用の代替表示名。全体プリセットのローダーと同じ変換。
const deriveName = (id: string): string => (
  id.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
);

/**
 * glob で集めたモジュール群を検証して select 用の選択肢に変換する。
 * 検証に落ちたファイルは黙って捨てず errors に理由を積む —— 呼び出し側が
 * 既存のプリセット読み込みエラーと同じバナーに合流させる。
 */
export const buildPartPresets = (
  modules: Record<string, unknown>,
  fields: readonly string[],
  requirePosition: boolean,
): PartPresetLoadResult => {
  const options: PartPresetOption[] = [];
  const errors: string[] = [];

  for (const [path, module] of Object.entries(modules)) {
    if (!isRecord(module)) {
      errors.push(`Invalid part preset in ${path}: not an object`);
      continue;
    }

    const rawInputs = module.inputs;

    if (!isRecord(rawInputs)) {
      errors.push(`Invalid part preset in ${path}: missing or invalid "inputs"`);
      continue;
    }

    const normalizedFields: Record<string, string> = {};
    let invalidField: string | null = null;

    for (const field of fields) {
      const normalizedValue = normalizeFieldValue(rawInputs[field]);

      if (normalizedValue === null) {
        invalidField = field;
        break;
      }

      normalizedFields[field] = normalizedValue;
    }

    if (invalidField !== null) {
      errors.push(`Invalid part preset in ${path}: "${invalidField}" is missing or not a number`);
      continue;
    }

    const { position } = module;

    if (requirePosition && !isHubPosition(position)) {
      errors.push(`Invalid part preset in ${path}: "position" must be "front" or "rear"`);
      continue;
    }

    const id = path.split('/').pop()?.replace(/\.json$/, '') ?? path;
    const displayName = module.displayName;

    options.push({
      id,
      name: typeof displayName === 'string' && displayName !== '' ? displayName : deriveName(id),
      ...(isHubPosition(position) ? { position } : {}),
      fields: normalizedFields,
    });
  }

  return { options, errors };
};

// 数値として比べる —— "3.0" と "3"、"35.60" と "35.6" は同じ部品を指す。
// ただし片方でも空なら不一致。Number('') が 0 になるので、未入力の欄が
// たまたま 0 の定義と一致してしまう事故を塞ぐ。
const valuesEqual = (a: string | undefined, b: string | undefined): boolean => {
  if (a === undefined || b === undefined) {
    return false;
  }

  const left = a.trim();
  const right = b.trim();

  if (left === '' || right === '') {
    return false;
  }

  return Number(left) === Number(right);
};

/**
 * 今の入力値に一致する定義の id を返す。無ければ ''。
 *
 * プリセットの select はこの戻り値をそのまま value にする。選択状態を state で
 * 覚えないので、「ホイールプリセットを選ぶとハブ / リムの欄も点く」「フランジ距離を
 * 手で書き換えるとハブの欄が消える」が同期処理なしで成立する。
 */
export const matchPreset = (
  options: readonly MatchablePreset[],
  inputs: Readonly<Record<string, string>>,
  fields: readonly string[],
): string => {
  const matched = options.find(
    option => fields.every(field => valuesEqual(option.fields[field], inputs[field])),
  );

  return matched?.id ?? '';
};
