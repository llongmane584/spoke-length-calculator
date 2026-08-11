import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { compareWheels, type WheelSpec } from '../spokeCompare';
import { PresetSelect, type PresetSelectGroup } from './PresetSelect';

export interface WheelOption {
  id: string;
  label: string;
  group: 'current' | 'preset' | 'saved';
  spec: WheelSpec;
}

interface Props {
  options: WheelOption[];
  selectedA: string;
  selectedB: string;
  onChangeA: (id: string) => void;
  onChangeB: (id: string) => void;
}

const CompareWheels: React.FC<Props> = ({ options, selectedA, selectedB, onChangeA, onChangeB }) => {
  const { t } = useTranslation();

  const specA = options.find(o => o.id === selectedA)?.spec ?? null;
  const specB = options.find(o => o.id === selectedB)?.spec ?? null;

  // 選んだ id が options に無い状態。現在の入力が計算できなくなった、あるいは
  // 選んでいた保存済み計算を消したときに起きる。PresetSelect は黙って
  // プレースホルダに倒れるので、下の案内文で「選び直しが要る」ことを伝える。
  const unresolved = (selectedA !== '' && specA === null) || (selectedB !== '' && specB === null);

  const result = useMemo(() => {
    if (specA === null || specB === null) return null;
    return compareWheels(specA, specB);
  }, [specA, specB]);

  // optgroup が要るのでネイティブ select のまま。見た目は PresetSelect が
  // 入力欄側のプリセット選択と揃える (対応ブラウザでは appearance: base-select)。
  //
  // 3 グループを 1 つの useMemo で組む。options から filter した中間配列を外に出すと
  // 毎レンダー新しい参照になり、deps に載せた useMemo が何もメモしない。
  // 現在の入力だけ label を持たない —— 1 件しかないものに見出しを立てても情報が
  // 増えず、PresetSelect は label 無しのグループを optgroup 抜きで素に並べる。
  const groups = useMemo((): PresetSelectGroup[] => {
    const itemsOf = (group: WheelOption['group']) =>
      options.filter(o => o.group === group).map(o => ({ id: o.id, name: o.label }));

    return [
      { items: itemsOf('current') },
      { label: t('compare.groupPresets'), items: itemsOf('preset') },
      { label: t('compare.groupSaved'), items: itemsOf('saved') },
    ].filter(group => group.items.length > 0);
  }, [options, t]);

  const renderSelect = (
    id: string,
    value: string,
    onChange: (id: string) => void,
    label: string,
  ) => (
    <PresetSelect
      id={id}
      variant="field"
      label={label}
      placeholder={t('compare.placeholder')}
      value={value}
      groups={groups}
      onSelect={onChange}
    />
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderSelect('compareWheelA', selectedA, onChangeA, t('compare.wheelA'))}
        {renderSelect('compareWheelB', selectedB, onChangeB, t('compare.wheelB'))}
      </div>

      {/* 比較できない理由を 1 つに丸めない。選んだホイールが消えたのに
          「両方選択してください」と出すと、選んだ側は何が起きたか分からない。
          アイコンは下の allNew と同じ組み方 —— 色だけで状態を伝えない */}
      {result === null ? (
        unresolved ? (
          <p className="flex items-start justify-center gap-1.5 py-4 text-sm text-warn-ink">
            <TriangleAlert aria-hidden="true" className="shrink-0 mt-0.5 h-4 w-4" />
            <span>{t('compare.selectionUnavailable')}</span>
          </p>
        ) : (
          <p className="text-sm text-fg-subtle text-center py-4">
            {t('compare.selectBoth')}
          </p>
        )
      ) : (
        <div className="rounded-lg border bg-accent-soft border-accent-line p-5 space-y-4">
          {/* キャプションの行数は言語と語長でばらつく (日本語は 1〜3 行)。
              各セルを縦フレックスにし mt-auto で数字を下端へ送ることで、
              キャプションが何行でも 3 つの数字が同じ高さに揃う。 */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col">
              <p className="text-xs text-fg-subtle">{t('compare.totalNeeded')}</p>
              <p className="mt-auto pt-1 text-xl font-semibold tabular-nums text-accent-ink">{result.totalNeeded}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-fg-subtle">{t('compare.reuseCount')}</p>
              <p className="mt-auto pt-1 text-xl font-semibold tabular-nums text-accent-ink">{result.reuseCount}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-fg-subtle">{t('compare.leftoverCount')}</p>
              <p className="mt-auto pt-1 text-xl font-semibold tabular-nums text-fg-muted">{result.leftoverCount}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-fg mb-2">
              {t('compare.buyHeading')}
            </p>
            {/* 以下 2 つのアイコンは装飾ではなく 1.4.1 の担保。ok / warn は
                アクセントと色相を離してあるが、色だけで状態を伝えてはいけない。
                組み方は App.tsx の FieldWarning に合わせている。 */}
            {result.buyItems.length === 0 ? (
              <p className="flex items-start gap-1.5 text-sm text-ok-ink">
                <CircleCheck aria-hidden="true" className="shrink-0 mt-0.5 h-4 w-4" />
                <span>{t('compare.noBuy')}</span>
              </p>
            ) : (
              <ul className="space-y-1">
                {result.buyItems.map((item, i) => (
                  <li key={i} className="text-sm tabular-nums text-fg">
                    {t('compare.buyItem', { length: item.length.toFixed(1), count: item.count })}
                    <span className="text-xs text-fg-subtle ml-1">
                      ({item.side === 'left' ? t('compare.sideLeft') : t('compare.sideRight')})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result.reuseCount === 0 && result.buyItems.length > 0 && (
            <p className="flex items-start gap-1.5 text-sm text-warn-ink">
              <TriangleAlert aria-hidden="true" className="shrink-0 mt-0.5 h-4 w-4" />
              <span>{t('compare.allNew')}</span>
            </p>
          )}

          {result.combinable && result.buyItems.length > 0 && (
            <p className="text-sm text-accent-ink">{t('compare.combinable')}</p>
          )}

          <p className="text-xs text-fg-subtle">{t('compare.note')}</p>
        </div>
      )}
    </div>
  );
};

// #102 でダイアログの中に入ったので、閉じている間はマウントもされない。それでも
// memo を外さないのは、開いている間の親の再描画 (トースト、ビューポート幅の変化) を
// ここまで下ろさないため。props はどれも参照が安定している (options は useMemo、
// onChange は setState そのもの) ので素通しできる。
export default memo(CompareWheels);
