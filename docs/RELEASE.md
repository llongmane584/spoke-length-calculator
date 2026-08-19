# リリース手順

version++ / タグ / GitHub Release / アプリ内更新履歴を 1 回のリリースでまとめて進めるための手順書。
上から順に実行する。**中断条件が書いてある箇所で条件を満たさなかったら、その場で止めて原因を潰す。**
先へ進めてはいけない。

スクリプトは用意していない。手順が数回まわって固まるまでは、文章のまま運用する。

## ブランチ運用

- `dev` が統合ブランチ。機能追加も修正も PR は `dev` 宛てに出してマージする。
- `main` は**本番そのもの**。`main` に push した瞬間 GitHub Pages へデプロイされる
  (`.github/workflows/deploy.yml`)。
- **リリースとは `dev` を `main` へ昇格させること**。バージョンを上げる区切りはここにしかない。
- リリース作業では issue もブランチも立てない。この手順書自体が承認済みの計画なので、
  `dev` に直接コミットして昇格する。

## バージョン番号の決め方

0.x 系。`§0` で集めた変更一覧を見て決める。

| | 上げ方 | 例 |
|---|---|---|
| 目に見える機能追加・UI 変更が **1 つでもある** | minor | `0.1.0` → `0.2.0` |
| バグ修正・文言・内部整理**だけ** | patch | `0.2.0` → `0.2.1` |

迷ったら minor。0.x のうちは minor を惜しむ理由がない。

---

## §0 前提を揃える

```bash
git switch dev && git pull
git log $(git describe --tags --abbrev=0)..dev --oneline
```

出てきたコミットが今回のリリースの中身。ここからバージョンを決め、利用者向けのノートを起草する。

`git describe --tags --abbrev=0` はタグが 1 本も無いと exit 128 になり、
`$(...)` が空になった結果 `git log ..dev` が **何も出さずに成功する**。無言の空振りなので、
コミットが 1 件も出なかったら「変更が無い」ではなく「タグが引けていない」を先に疑う。

## §1 4 ファイルを更新する

リリースが触るのはこの 4 つだけ。

| ファイル | 何を |
|---|---|
| `src/changelog.ts` | `CHANGELOG` 配列の **先頭** に `{ version: 'X.Y.Z', date: 'YYYY-MM-DD' }` を 1 つ差し込む |
| `package.json` | `"version"` を同じ値にする |
| `src/locales/en.json` | `pages.changelog.releases.vX_Y_Z.notes` を足す |
| `src/locales/ja.json` | 同上。キーは en と完全に同一にする |

守ること:

- **翻訳キーはドットを `_` に潰した形**。`0.2.0` なら `v0_2_0` (`releaseKey()` / `src/changelog.ts`)。
  i18next の `keySeparator` が `.` なので、`v0.2.0` と書くと 3 階層のネストとして解釈され、
  `notes` を引けなくなる。
- **notes は `\n` で連結した 1 本の文字列**。配列にしてはいけない ——
  `src/locales.test.ts` が「全ての葉は文字列」を要求する。表示側 (`src/components/ChangelogSections.tsx`)
  が `\n` で分割して `<li>` に並べる。
- **日付は `main` へ昇格する日**。ノートを起草した日ではない。`Get-Date -Format yyyy-MM-dd` で取る。
  昇格が翌日にずれ込んだら日付を書き直す。
- **文面はコミット件名の羅列にしない。** 利用者に何が変わったかを、利用者の言葉で書く。
  en と ja は同じ内容を書く（片方だけ詳しくしない）。
- **1 変更 = 1 行。行数の目安は持たない。** 行数は「利用者に見える変更が何件あったか」の
  結果でしかない。1 件なら 1 行で終わる。目標行数を決めると、そこへ届かせるために
  中身が水増しされる。
- **1 行に収まらない補足は、書かずに捨てる。** 1 つの変更の注意書き・但し書き・言い訳を
  2 行目に切り出してはいけない —— 履歴では 2 件目の変更に見える。同じ行に押し込むのも違う。
  利用者が読んで得るものが無いなら、その文字列は消すのが正解。
  - v0.4.0 でやらかした実例。ドロワーを逆方向のスワイプで閉じられるようにした変更 1 件に対し、
    「画面の左右の端は端末の『戻る』操作のために空けてあるので、少し内側から指を動かしてください」
    という 2 行目を足していた。実装の都合を利用者に説明しただけで、読んでも何も嬉しくない。
    当時この手順書に「3〜6 行」と書いてあったのが元凶で、行数へ届かせるための水増しだった。
    正しい対処は 1 行目へ畳むことでもなく、**削除**。
- **`Unreleased` エントリを作ってはいけない。** `src/changelog.test.ts` が
  `package.json` の `"version"` と `CHANGELOG[0].version` の一致を要求するので、
  未リリース枠を先頭に置くと必ず落ちる。ノートを小出しに溜める運用は取れない設計になっている ——
  リリース時にまとめて書く。

## §2 関門 (通らなければ中断する)

```bash
pnpm lint
pnpm test
pnpm build
pnpm preview
```

`pnpm test` が本命。バージョンの一致、ISO 8601 の日付、新しい順の並び、
両 locale に notes があることを、`src/changelog.test.ts` と `src/locales.test.ts` が見張る。
**なお `pnpm test` は lefthook でも CI でも走らない。ここで人が走らせるのが唯一の実行機会。**

`pnpm preview` も飛ばさない。`vite.config.ts` により、**本番と同じ `/the-spoke-calculator/`
ベースパスを再現するのは preview だけ**（dev サーバーは `/` で動く。`src/viteConfig.test.ts` が
3 通りを固定している）。

開く URL は次の 2 つ。**`http://localhost:4173/` ではない** —— ベースパスが付き、
かつ HashRouter なので、ルートを開いても何も出ない:

```
http://localhost:4173/the-spoke-calculator/
http://localhost:4173/the-spoke-calculator/#/changelog
```

見るもの:

- ブラウザのコンソールに**エラーも警告も 1 本も無い**こと (CLAUDE.md のコンソールの項)
- ドロワー最下部のバージョン表記が新しい番号になっていること
- `#/changelog` に今回のエントリが出て、箇条書きが意図どおり改行されていること
- `#/changelog/all` の年ナビが壊れていないこと（年をまたぐリリースのときは特に）

サーバーを起動する前に、人間が起動済みのサーバーが無いか確認する。
`playwright-cli` を使うなら `-s=<名前>` で別セッションを切る —— 既定セッションは
人が開いているブラウザに繋がる。

## §3 `dev` にコミットして push

```bash
git commit -am "chore(release): v0.2.0"
git push origin dev
```

コミット本文には §1 で書いたノートをそのまま入れておくと、§7 で使い回せる。

## §4 `main` へ昇格

```bash
git switch main && git pull
git merge --ff-only dev
git push origin main
```

`--ff-only` が安全装置。**失敗したら中断する。** それは `main` に `dev` が持っていない
コミットがある証拠 —— 取り込み忘れた hotfix (§8) がほぼ確実に原因。
`git switch dev && git merge main` で追従させ、**§2 からやり直す**。
`--ff-only` を外して回避してはいけない。

`dev → main` を squash merge してはいけない。`dev` が恒久的に分岐し、以後の昇格が全部壊れる。

## §5 デプロイを見届ける

```bash
gh run list --workflow=deploy.yml --limit 1
gh run watch
```

成功したら <https://llongmane584.github.io/the-spoke-calculator/> を開き、
ドロワーのバージョンが上がっていること、`#/changelog` に新しいエントリが出ていることを確認する。

**ここで失敗したら §6 へ進まない。** 直してから §4 をやり直す。

### 途中の run が cancelled になっているのは正常

`deploy.yml` の `concurrency: group: pages` は待機枠をグループに 1 本しか持たない。
新しい push が来ると古い待機分が
`Canceling since a higher priority waiting request for pages exists` で落ちる ——
`cancel-in-progress: false` が守るのは実行中の run だけで、待機中の run は保護されない。
飛ばされた run のコミットは最新 run の祖先なので、出荷内容は変わらない。

### 自分の run が `pending` のまま動かないとき

先に `queued` の run がグループを保持している。`git merge-base --is-ancestor <その run の sha> HEAD`
が真なら、その run を `gh run cancel <id>` で落としてよい（内容は今回の run に含まれている）。
落とした瞬間にグループが空いて自分の run が走り出す。

```bash
gh run list --limit 5 --json databaseId,status,headSha \
  -q '.[] | select(.status != "completed") | "\(.databaseId) \(.headSha[0:7]) \(.status)"'
```

## §6 タグを打つ

デプロイの成功を確認してから打つ。先に打つと、出荷されなかったものを指すタグが残る。

```bash
git tag -a v0.2.0 -m "v0.2.0"
git push origin v0.2.0
```

## §7 GitHub Release

```bash
mkdir -p tmp/release/v0.2.0
# tmp/release/v0.2.0/notes.md を書く
gh release create v0.2.0 --title "v0.2.0" --notes-file tmp/release/v0.2.0/notes.md
```

GitHub に送るテキストは `./tmp/` に一時ファイルを作って `--notes-file` で渡す
(CLAUDE.md の `--body-file` の項)。本文は §1 の notes をそのまま流用した日英 2 節 + compare リンク:

```markdown
## 変更点

- ...

## Changes

- ...

**Full Changelog**: https://github.com/llongmane584/the-spoke-calculator/compare/v0.1.0...v0.2.0
```

compare リンクの左側は**前回のタグ**。書いた URL は必ず新しいリポジトリ名
(`the-spoke-calculator`) を使う —— git remote は旧名 `spoke-length-calculator.git` のままで、
`gh` は GitHub のリネームリダイレクトで解決している (#146)。

## §8 hotfix

原則として hotfix も `dev` を通す。本番が壊れていて直接 `main` に入れた場合は、
**その場で** `dev` を追従させる:

```bash
git switch dev && git merge main
```

これを飛ばすと次のリリースの `--ff-only` (§4) が落ちる。
利用者に見える修正なら、patch リリースとして §1 からやり直す。

## §9 やってはいけないこと

- `Unreleased` エントリを置く (§1 — `src/changelog.test.ts` が必ず落ちる)
- notes を配列で書く (§1 — `src/locales.test.ts` が必ず落ちる)
- 翻訳キーにドットを残す (§1 — i18next がネストとして解釈する)
- 日付をノート起草日にする (§1 — 昇格日を書く)
- 1 つの変更の注意書きを 2 行目に切り出して、2 件の変更に見せる (§1 — 畳むのではなく削除する)
- 目標行数を決めて、そこへ届かせるために中身を水増しする (§1 — 1 変更 = 1 行、目安は持たない)
- `pnpm preview` を飛ばして dev サーバーだけで確認する (§2 — ベースパスが本番と違う)
- `localhost:4173/` を開いて「真っ白だ」と騒ぐ (§2 — ベースパスと HashRouter)
- `dev → main` を squash merge する (§4 — `dev` が恒久的に分岐する)
- `--ff-only` が落ちたとき、`--ff-only` を外して通す (§4 — hotfix を取り込み忘れている)
- デプロイ確認前にタグを打つ (§6)
- hotfix を `main` に入れたまま `dev` に戻さない (§8)
