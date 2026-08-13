import { useLayoutEffect, type RefObject } from 'react';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

// ブラウザの最小フォントサイズ設定。1px を指定しても下がらない値がそれ。
// 設定が無ければ 1px がそのまま返る (どの箱にも効かない値なので分岐は要らない)。
//
// 帯の外に置くこと —— 中に入れると帯の中身を見ている MutationObserver が反応し、
// 測り直しが循環する。
const measureFontFloor = (): number => {
  const probe = document.createElement('span');

  probe.style.cssText = 'position:absolute;visibility:hidden;font-size:1px';
  document.body.append(probe);

  const floor = parseFloat(getComputedStyle(probe).fontSize);

  probe.remove();

  return floor;
};

// レイアウトビューポートではなくビジュアルビューポートの下端を見る。
// iOS でソフトキーボードが開くと innerHeight は変わらないので、
// それを使うと「隠れている帯を見えている」と誤判定する。
const getViewportBottom = (): number => {
  const viewport = window.visualViewport;

  return viewport !== null && viewport !== undefined
    ? viewport.offsetTop + viewport.height
    : window.innerHeight;
};

/**
 * 画面下端にドックしている度合いを、CSS カスタムプロパティ `--dock` (0..1) として
 * `scopeRef` の要素に書き込む。
 *   1 … 帯の居場所がまだ折り返しの下 (ドック中 = 簡易表示)
 *   0 … 帯の居場所が画面内に収まった (本来の姿)
 * ドック中は `data-docked` 属性も立てる。pointer-events は数値で表せないため。
 *
 * 併せて 2 つの実測値を書く。どちらも「帯の rem のモデルと実際の寸法が食い違う」
 * ことへの答えで、モデルを直すのではなく実測に従わせる (#157)。
 *   `--band-spacer` (scope) … 帯が縮んだぶんを埋めるスペーサーの高さ。
 *                             本来の高さ - 帯の実高 なので、帯がどう縮もうと
 *                             帯 + スペーサーは本来の高さのまま = 文書の高さが動かない
 *   `--band-cover` (ルート)  … ドック中に帯が画面下端を覆っている高さ。
 *                             `scroll-padding-bottom` がこれを受ける
 *
 * 値を返さず DOM に直接書くのが要点。state に入れるとスクロールのフレームごとに
 * React の再描画が走る。書き込み先では帯の姿の補間を calc() で行うので、React が置くのは
 * 初回の style 文字列だけになり、スクロール中の再描画は 0 回になる。連続値のまま
 * 扱えるので量子化も CSS トランジションも要らず、変形はスクロールに 1:1 で追従する。
 *
 * 測るのは帯そのものの位置ではない —— 帯は position: sticky なので
 * getBoundingClientRect() が「引き上げられた後」の位置を返し、自分の位置から
 * 自分の状態を決められない。代わりに帯の直前にある要素 (`slotTopRef` = 入力セクション)
 * の下端を測る。そこが帯の本来の上端で、スクロール以外では動かない。
 *
 * 本来の下端は「そこ + 本来の高さ」で出す。本来の高さ (fullHeight) は定数ではなく
 * 実測する —— 帯の実高は rem のモデルと食い違いうるためで、ブラウザの最小フォント
 * サイズ設定は下限に引っかかる文字だけを持ち上げるし、狭い画面で文字を大きくすれば
 * 見出しや数値が折り返して想定を超える (#155 / #157)。実測なら progress が 0 になる
 * 瞬間と sticky がドックを解除する瞬間 (帯の本来の下端が画面内に入る瞬間) が一致し、
 * 姿が戻りきると同時に帯が流れの中へ着地する。
 *
 * 帯の下のスペーサーを測って本来の下端を出す形 (#155) はやめた。スペーサーの高さを
 * 実測から書くようになると「スペーサー → progress → 帯の姿 → スペーサー」の循環に
 * なるため。slotTop と fullHeight だけで出せば、progress はスクロール位置と
 * 実測値だけの関数になり、こちらの書き込みでは動かない。
 *
 * `morphRatio` は食み出し量を 0..1 に写すときの分母を、実測した本来の高さから
 * 出すための無次元比 = 変形が完了するまでのスクロール距離 / 本来の高さ。
 * 帯の高さの変化量 (本来の高さ - 簡易表示の高さ) の割合を下回ってはならない ——
 * 下回ると帯は隙間が広がるより速く縮み、変形の途中で sticky から解放されて
 * 画面下端を離れてしまう。
 */
export const useDockMorph = (
  slotTopRef: RefObject<Element | null>,
  bandRef: RefObject<HTMLElement | null>,
  scopeRef: RefObject<HTMLElement | null>,
  morphRatio: number,
): void => {
  useLayoutEffect(() => {
    const element = slotTopRef.current;
    const band = bandRef.current;
    const scope = scopeRef.current;

    if (element === null || band === null || scope === null || morphRatio <= 0) {
      return;
    }

    const root = document.documentElement;
    let frame = 0;
    let docked: boolean | null = null;
    let cover: string | null = null;
    // 今の帯の姿がどの progress で描かれたものか。読んだ実高がいつのものかを知るため
    let rendered = Number.NaN;
    // 本来の姿の実高。伏せられている間 (App の hidden) は 0 になり、下の morphSpan も
    // 0 になる。ゼロ除算を避けるためだけの分岐ではなく、レイアウトを持たない間は
    // ドックしていないと決めるための分岐
    let fullHeight = 0;
    let calibrated = false;

    // 本来の姿の高さと、文字の箱を狭める下限を測る。`--dock` を一時的に 0 にして
    // 読むだけで、書き戻しまで同じタスクの中で終わるので描画は挟まらない (ちらつかない)。
    //
    // このとき帯は縮んだ姿から本来の姿へ広がる = 文書は伸びるだけなので、下端まで
    // スクロールしていてもスクロール位置は切り詰められない。
    const calibrate = () => {
      const dock = scope.style.getPropertyValue('--dock');
      const textBoxes = band.querySelectorAll<HTMLElement>('[data-dock-text]');
      const fontFloor = measureFontFloor();

      scope.style.setProperty('--dock', '0');
      fullHeight = band.getBoundingClientRect().height;

      // 折り返す文字の箱を、ブラウザが実際に使う文字サイズに合わせて狭めるための下限。
      // 箱を `--dock` と同率で狭めるだけだと、最小フォントサイズ設定が効いている間は
      // 箱だけが狭まって字面は縮まず、折り返しが増える —— 最小フォント 24px の
      // 390px 幅では見出しが 3 行ぶん増え、帯が本来の姿より膨らんでいた (#157)。
      // 使う文字サイズは max(下限, 指定サイズ) なので、箱も同じ形で下限を持てば
      // 箱 / 字面の比が全区間で一定になり、折り返し位置が動かなくなる。
      //
      // ここで読む文字サイズは max(下限, 本来の指定サイズ) —— 下限のほうが大きければ
      // 比は 1 = 一切狭めない、になる。CSS の calc() は長さ ÷ 長さを受け付けないので、
      // この割り算だけは JS が引き受ける。
      for (const textBox of textBoxes) {
        const fontSize = parseFloat(getComputedStyle(textBox).fontSize);
        const floor = fontSize > 0 ? Math.min(1, fontFloor / fontSize) : 1;

        textBox.style.setProperty('--dock-text-floor', floor.toFixed(4));
      }

      if (dock === '') {
        scope.style.removeProperty('--dock');
      } else {
        scope.style.setProperty('--dock', dock);
      }

      calibrated = true;
    };

    const update = () => {
      frame = 0;

      if (!calibrated) {
        calibrate();
      }

      // 読みは書き込みより先にまとめる。間に書き込みを挟むと同期レイアウトが走る。
      // そのぶん帯の実高は 1 つ前の `--dock` で描かれたもの = 1 フレーム古い。
      // 下で「変わっていたらもう 1 フレーム回す」ことで詰める
      const slotTop = element.getBoundingClientRect().bottom;
      const bandHeight = band.getBoundingClientRect().height;
      const morphSpan = fullHeight * morphRatio;
      const progress = morphSpan > 0
        ? clamp01((slotTop + fullHeight - getViewportBottom()) / morphSpan)
        : 0;

      // 帯が縮んだぶんを埋める。着地したら 0 —— 帯より下が画面に入るのはこの瞬間から
      // なので、ここだけは 1 フレーム古い値を使ってはいけない。max() は最小フォント
      // サイズ設定で帯が本来の姿より膨らむ区間のため (負の高さは書けない)
      const spacer = progress > 0 ? Math.max(0, fullHeight - bandHeight) : 0;

      scope.style.setProperty('--band-spacer', `${spacer.toFixed(2)}px`);
      scope.style.setProperty('--dock', progress.toFixed(4));

      // 帯が画面下端を覆っている高さ。ドックしていなければ何も覆っていない。
      // 1px 単位に丸めてから比べ、変わったときだけ書く —— ルート要素の
      // カスタムプロパティなので、無駄に触ると文書全体のスタイル再計算を誘う
      const nextCover = progress > 0 ? `${Math.ceil(bandHeight)}px` : '0px';

      if (nextCover !== cover) {
        cover = nextCover;
        root.style.setProperty('--band-cover', nextCover);
      }

      // 属性の変更はセレクタの再マッチを伴うので、変わった瞬間だけ触る。
      // 解除は removeAttribute でなければならない —— [data-docked] は属性の
      // 存在で一致するので、'false' を入れると着地後もドック中の扱いが残り、
      // 帯とその下のコントロールが永久にタップできなくなる。
      const isDocked = progress > 0;

      if (isDocked !== docked) {
        docked = isDocked;

        if (isDocked) {
          scope.setAttribute('data-docked', '');
        } else {
          scope.removeAttribute('data-docked');
        }
      }

      // 上で書いた `--dock` で帯はこの後さらに変形する。その実高を読むにはもう
      // 1 フレーム要る —— 読まずに止まると、スペーサーは 1 手前の姿のぶんを埋めた
      // ままになり、スクロールを止めた場所で文書の高さがずれて残る。
      // 帯の姿は progress にしか依存しない (スペーサーには依存しない) ので、
      // この追いかけは progress が動かなくなった次のフレームで必ず止まる
      if (progress !== rendered) {
        rendered = progress;
        schedule();
      }
    };

    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };

    // 本来の高さが変わりうる出来事。次のフレームで測り直す
    const invalidate = () => {
      calibrated = false;
      schedule();
    };

    update(); // 初回だけ同期。first paint の前に確定させる

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', invalidate);
    // ソフトキーボードの開閉。帯の寸法は変わらないので測り直しは要らない
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);

    // スクロール以外でも帯の居場所は動く: バリデーションエラー行の出現・消滅、
    // プリセット読み込み、フォントの遅延適用、ブラウザの文字サイズ設定の変更。
    // 観測するのは帯より上にある slot 要素だけ —— 帯やスペーサーを観測すると、
    // --dock を書く → 帯が変形する → また発火する、の往復になる。
    // 上の要素はこちらの書き込みで動かないので、その循環が起きない。
    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(element);

    // 帯の中身が入れ替わると本来の高さも変わる (結果の出現・消滅、言語の切替)。
    // 大きさではなく中身を見るのが要点 —— 大きさを見ると上の往復になる。
    // style 属性の書き換えは拾わないので、こちらの毎フレームの書き込みでは発火しない。
    const contentObserver = new MutationObserver(invalidate);
    contentObserver.observe(band, { childList: true, characterData: true, subtree: true });

    return () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', invalidate);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      resizeObserver.disconnect();
      contentObserver.disconnect();
      // ルート要素はこのページより長生きするので、書いたものは片付ける。
      // 残すと帯のないページでも scroll-padding-bottom が効いたままになる
      root.style.removeProperty('--band-cover');
    };
  }, [slotTopRef, bandRef, scopeRef, morphRatio]);
};
