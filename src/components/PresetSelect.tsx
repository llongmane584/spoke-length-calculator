import { ChevronDown } from 'lucide-react';
import { Fragment } from 'react';

import {
  customizableSelect,
  customizableSelectChip,
  dismissOpenPicker,
  fieldLabel,
  nativeSelect,
  nativeSelectChip,
  selectChevron,
  supportsBaseSelect,
} from '../styles';

export interface PresetSelectItem {
  id: string;
  name: string;
  /** 展開時に名前の下へ添える寸法の要約 */
  spec?: string;
}

export interface PresetSelectGroup {
  /** 省略すると optgroup を挟まずそのまま並べる */
  label?: string;
  items: PresetSelectItem[];
}

interface PresetSelectProps {
  id: string;
  /**
   * chip バリアントでは見出しを出さずアクセシブル名として使う。
   * 畳んだ chip には選択中の値そのものが出るので、見出しを重ねると冗長になる。
   */
  label: string;
  placeholder: string;
  /** chip = 見出し行に添える丸いピル / field = ラベル付きのフルワイド入力欄 */
  variant?: 'chip' | 'field';
  /** '' なら未選択。state ではなく、今の入力値に一致する定義の id を渡すこと。 */
  value: string;
  groups: PresetSelectGroup[];
  onSelect: (id: string) => void;
}

// 寸法の要約は子要素ではなく data 属性で渡し、CSS の ::after + attr() で描く。
// <option> の中に <span> を置くと React の DOM ネスト検証に引っかかるうえ、
// base-select 非対応のブラウザではテキストが連結されて 1 行に潰れる。
// 畳んだ状態には item.name だけを出すので、要約は開いたときにしか現れない。
const renderItems = (items: PresetSelectItem[]) => (
  items.map(item => (
    <option key={item.id} value={item.id} data-spec={item.spec}>
      {item.name}
    </option>
  ))
);

export function PresetSelect({
  id,
  label,
  placeholder,
  variant = 'chip',
  value,
  groups,
  onSelect,
}: PresetSelectProps) {
  const isChip = variant === 'chip';
  // preset-select クラスも分岐に含める。index.css の @supports ブロックは
  // レイヤ外なので Tailwind の appearance-none より強い —— 無条件に付けると
  // フォールバックのつもりの select にまで base-select が当たってしまう。
  const selectClass = supportsBaseSelect
    ? `${isChip ? customizableSelectChip : customizableSelect} preset-select`
    : (isChip ? nativeSelectChip : nativeSelect);

  // 畳んだ状態に出るラベル。どの項目にも一致しない value が来たらブラウザは何も
  // 選ばないので、プレースホルダに倒す (空欄よりは「まだ選んでいない」と読める)。
  const selectedLabel = value === ''
    ? placeholder
    : groups.flatMap(group => group.items).find(item => item.id === value)?.name ?? placeholder;

  const select = (
    // chip の幅は見出し行の残り幅ではなくブレークポイントごとの固定値にする。
    // 全体 / リム / ハブで隣の見出しが違っても揃い、選択名は内側で省略される。
    <div className={isChip ? 'relative w-32 shrink-0 min-[375px]:w-40 sm:w-64' : 'relative'}>
      <select
        id={id}
        value={value}
        onChange={event => onSelect(event.target.value)}
        onPointerDown={supportsBaseSelect ? dismissOpenPicker : undefined}
        aria-label={isChip ? label : undefined}
        className={selectClass}
      >
        {/* 畳んだ状態を自分で組む。省略するとブラウザが同等のボタンを起こすが、
            それは author 側の CSS から掴めず、長いプリセット名がチップから
            はみ出しても省略記号にできない。自前で置けば min-width:0 と
            text-overflow を効かせられる。

            中身はブラウザ任せの <selectedcontent> ではなく自分で描く。あれは
            選択中の option を複製する要素で、複製が走るのは挿入時と選択が
            変わったときだけ —— 選択はそのままで option のテキストだけが
            変わる言語切替では、旧言語の複製が残る (実測済み)。

            なお React の DOM ネスト検証は <select> の子に <button> を許さず、
            開発ビルドで警告を 1 本出す (customizable select がまだ React 側に
            反映されていないため)。本番ビルドでは出ず、SSR もしていないので実害はない。 */}
        {supportsBaseSelect && (
          <button>
            <span>{selectedLabel}</span>
          </button>
        )}
        {/* プレースホルダを disabled にしてはいけない。'' は初期状態でも手編集後でも
            起きる常態で、disabled な option は選択対象にならないため、ブラウザが
            代わりに先頭の項目を選んでしまう (入力欄が空なのに部品名が出る)。 */}
        <option value="">{placeholder}</option>
        {groups.map((group, index) => (
          group.label === undefined ? (
            <Fragment key={`group-${index}`}>{renderItems(group.items)}</Fragment>
          ) : (
            <optgroup key={group.label} label={group.label}>
              {renderItems(group.items)}
            </optgroup>
          )
        ))}
      </select>
      {!supportsBaseSelect && (
        <ChevronDown aria-hidden="true" className={isChip ? `${selectChevron} right-2.5` : selectChevron} />
      )}
    </div>
  );

  if (isChip) {
    return select;
  }

  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>{label}</label>
      {select}
    </div>
  );
}
