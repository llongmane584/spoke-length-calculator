import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { compareWheels, type WheelSpec } from '../spokeCompare';
import { nativeSelect, selectChevron } from '../styles';

export interface WheelOption {
  id: string;
  label: string;
  group: 'preset' | 'saved';
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

  const presets = options.filter(o => o.group === 'preset');
  const saved = options.filter(o => o.group === 'saved');

  const specA = options.find(o => o.id === selectedA)?.spec ?? null;
  const specB = options.find(o => o.id === selectedB)?.spec ?? null;

  const result = useMemo(() => {
    if (specA === null || specB === null) return null;
    return compareWheels(specA, specB);
  }, [specA, specB]);

  const renderSelect = (
    value: string,
    onChange: (id: string) => void,
    label: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-fg-muted">
        {label}
      </label>
      {/* optgroup が必要なのでネイティブ select のまま。ポップアップの見た目は
          index.css の base 層にある color-scheme がテーマに追従させる。 */}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={nativeSelect}
        >
          <option value="">{t('compare.placeholder')}</option>
          {presets.length > 0 && (
            <optgroup label={t('compare.groupPresets')}>
              {presets.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </optgroup>
          )}
          {saved.length > 0 && (
            <optgroup label={t('compare.groupSaved')}>
              {saved.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </optgroup>
          )}
        </select>
        <ChevronDown aria-hidden="true" className={selectChevron} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderSelect(selectedA, onChangeA, t('compare.wheelA'))}
        {renderSelect(selectedB, onChangeB, t('compare.wheelB'))}
      </div>

      {result === null ? (
        <p className="text-sm text-fg-subtle text-center py-4">
          {t('compare.selectBoth')}
        </p>
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
            {result.buyItems.length === 0 ? (
              <p className="text-sm text-ok-ink">{t('compare.noBuy')}</p>
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
            <p className="text-sm text-warn-ink">{t('compare.allNew')}</p>
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

export default CompareWheels;
