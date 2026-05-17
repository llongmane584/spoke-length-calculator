---
name: react-dev
description: React 19 + TypeScript + TanStack Router development best practices including strict useEffect rules, component patterns, performance optimization, and Tailwind CSS styling guidelines
---

# React + TypeScript + TanStack Router Development Skill

このスキルは、React 19 + TypeScript + TanStack Router を使用した開発のベストプラクティスを提供します。

## 概要

このプロジェクトで React コンポーネントを作成・修正する際は、以下のガイドラインに厳格に従ってください。

---

## useEffect の絶対ルール

### 使用目的
- **外部システムとの同期にのみ使用する**（fetch、イベント、タイマー、WebSocket など）
- 計算やデリバティブ値には使わない → `useMemo` やインラインロジックを使用

### 依存配列のルール
- すべてのリアクティブな値（props、state、関数）を依存配列に含める
- 不要な再実行を引き起こす関数/オブジェクトは `useCallback`/`useMemo` でメモ化する
- **絶対に** `eslint-plugin-react-hooks` の警告を無視しない → 原因を修正する

### クリーンアップ
- **必ず**クリーンアップ関数を実装する
  - イベントリスナーの削除
  - タイマーの停止
  - WebSocket 接続のクローズ
  - AbortController によるフェッチのキャンセル

```typescript
useEffect(() => {
  const controller = new AbortController();

  async function fetchData() {
    try {
      const response = await fetch('/api/data', {
        signal: controller.signal
      });
      const data = await response.json();
      setData(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Fetch error:', error);
      }
    }
  }

  fetchData();

  // クリーンアップ関数
  return () => {
    controller.abort();
  };
}, [/* 依存配列 */]);
```

### 重要な注意点
- React Strict Mode のダブル実行下でも正しく動作することを確認
- `[]` は「一度だけ実行」を意味するが、開発モードでは2回実行される可能性がある
- レイアウト関連の修正には `useLayoutEffect` を使用
- useEffect はレンダリングロジックの一部ではなく、副作用の同期として考える

### アンチパターン

❌ **悪い例：計算に useEffect を使う**
```typescript
const [count, setCount] = useState(0);
const [doubleCount, setDoubleCount] = useState(0);

useEffect(() => {
  setDoubleCount(count * 2);
}, [count]);
```

✅ **良い例：直接計算する**
```typescript
const [count, setCount] = useState(0);
const doubleCount = count * 2;
```

❌ **悪い例：クリーンアップなし**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  // クリーンアップがない！
}, []);
```

✅ **良い例：適切なクリーンアップ**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

---

## TypeScript のベストプラクティス

### 型定義
- コンポーネントの Props は必ず interface または type で定義
- `any` の使用は避け、適切な型を定義
- ジェネリクスを活用して再利用可能な型を作成

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({
  label,
  onClick,
  variant = 'primary',
  disabled = false
}: ButtonProps) {
  // 実装
}
```

### イベントハンドラの型
```typescript
// フォームイベント
const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // 処理
};

// インプットイベント
const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setValue(event.target.value);
};

// クリックイベント
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  // 処理
};
```

### useState の型推論
```typescript
// 型が明確な場合は推論に任せる
const [count, setCount] = useState(0);

// 複雑な型の場合は明示的に指定
const [user, setUser] = useState<User | null>(null);

// 初期値が null の場合
const [data, setData] = useState<Data | null>(null);
```

---

## TanStack Router の使用方法

### ルート定義
```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutComponent,
});

function AboutComponent() {
  return <div>About page</div>;
}
```

### パラメータ付きルート
```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/posts/$postId')({
  component: PostComponent,
});

function PostComponent() {
  const { postId } = Route.useParams();

  return <div>Post ID: {postId}</div>;
}
```

### ナビゲーション
```typescript
import { Link, useNavigate } from '@tanstack/react-router';

function Navigation() {
  const navigate = useNavigate();

  return (
    <nav>
      <Link to="/about">About</Link>
      <button onClick={() => navigate({ to: '/posts' })}>
        Posts
      </button>
    </nav>
  );
}
```

### ローダーの使用
```typescript
import { createFileRoute } from '@tanstack/react-router';

interface Post {
  id: number;
  title: string;
}

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const response = await fetch(`/api/posts/${params.postId}`);
    return response.json() as Promise<Post>;
  },
  component: PostComponent,
});

function PostComponent() {
  const post = Route.useLoaderData();

  return <h1>{post.title}</h1>;
}
```

---

## コンポーネント設計パターン

### ファイル構成
```
src/
├── components/
│   ├── ui/              # 再利用可能な UI コンポーネント
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   └── features/        # 機能固有のコンポーネント
│       └── UserProfile.tsx
├── hooks/               # カスタムフック
│   └── useAuth.ts
├── types/               # 型定義
│   └── user.ts
└── routes/              # TanStack Router のルート
    └── index.tsx
```

### コンポーネントの命名規則
- PascalCase: コンポーネント名
- camelCase: フック名（必ず `use` プレフィックス）
- UPPER_SNAKE_CASE: 定数

```typescript
// コンポーネント
export function UserProfile() { }

// カスタムフック
export function useAuth() { }

// 定数
const MAX_RETRY_COUNT = 3;
```

### Props の分割代入
```typescript
// ✅ 良い例
function UserCard({ name, email, avatar }: UserCardProps) {
  return (
    <div>
      <img src={avatar} alt={name} />
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}

// ❌ 悪い例
function UserCard(props: UserCardProps) {
  return (
    <div>
      <img src={props.avatar} alt={props.name} />
      <h2>{props.name}</h2>
      <p>{props.email}</p>
    </div>
  );
}
```

---

## パフォーマンス最適化

### メモ化
```typescript
// 高コストな計算
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// コールバックのメモ化
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);

// コンポーネントのメモ化
const MemoizedComponent = memo(function Component({ data }: Props) {
  return <div>{data}</div>;
});
```

### レンダリング最適化
- 不要な state の更新を避ける
- 子コンポーネントに props として関数を渡す場合は `useCallback` でメモ化
- リストのレンダリングには適切な `key` を使用（index は避ける）

```typescript
// ✅ 良い例
{items.map(item => (
  <Item key={item.id} data={item} />
))}

// ❌ 悪い例
{items.map((item, index) => (
  <Item key={index} data={item} />
))}
```

---

## スタイリング（Tailwind CSS v4）

### クラス名の順序
1. レイアウト（flex、grid、position）
2. サイズ（width、height、padding、margin）
3. テキスト（font、text-color、text-align）
4. 装飾（background、border、shadow）
5. インタラクション（hover、focus、transition）

```typescript
<button className="
  flex items-center justify-center
  px-4 py-2 w-full
  text-sm font-medium text-white
  bg-blue-600 rounded-lg shadow-md
  hover:bg-blue-700 focus:ring-2 focus:ring-blue-500
  transition-colors
">
  Submit
</button>
```

### 条件付きクラス
```typescript
import clsx from 'clsx';

function Button({ variant, disabled }: ButtonProps) {
  return (
    <button
      className={clsx(
        'px-4 py-2 rounded',
        variant === 'primary' && 'bg-blue-600 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
    >
      Click me
    </button>
  );
}
```

---

## エラーハンドリング

### 非同期処理のエラーハンドリング
```typescript
function DataFetcher() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/data', {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    return () => controller.abort();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return <div>{/* データの表示 */}</div>;
}
```

---

## テスト可能なコンポーネント設計

### ロジックの分離
```typescript
// ✅ ロジックをカスタムフックに分離
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount(c => c - 1);
  }, []);

  return { count, increment, decrement };
}

function Counter() {
  const { count, increment, decrement } = useCounter();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

---

## チェックリスト

コンポーネントを作成・修正する際は、以下を確認してください：

- [ ] useEffect は外部システムとの同期にのみ使用されている
- [ ] すべての依存配列が正しく設定されている
- [ ] クリーンアップ関数が実装されている
- [ ] Props に適切な型定義がある
- [ ] イベントハンドラに適切な型が指定されている
- [ ] 不要な再レンダリングが発生しないようメモ化されている
- [ ] エラーハンドリングが適切に実装されている
- [ ] key props が適切に設定されている（リスト）
- [ ] Tailwind クラスが読みやすく整理されている
- [ ] コンポーネントがテスト可能な設計になっている

---

## 参考資料

- [React 公式ドキュメント](https://react.dev/)
- [TanStack Router ドキュメント](https://tanstack.com/router)
- [TypeScript ドキュメント](https://www.typescriptlang.org/docs/)
- [Tailwind CSS v4](https://tailwindcss.com/)
