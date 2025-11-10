# XSG Development Guide

このドキュメントは、XSGプロジェクトの技術的な実装と開発ガイドをまとめたものです。

## プロジェクト概要

XSG（Signal Generator）は、高価な業務用信号発生器の代替となるデスクトップアプリケーションです。フルスクリーン・フレームレス表示が可能で、プロフェッショナルな映像テスト環境を提供します。

## アーキテクチャ

### 技術スタック

- **フロントエンド**: Vite 6.0 + React 18 + TypeScript 5.7
- **スタイリング**: Tailwind CSS 3.4
- **バックエンド**: FastAPI 0.121 + PyWebView 6.1
- **パッケージ管理**:
  - フロントエンド: npm
  - バックエンド: uv (Python package manager)
- **デプロイ**: PyInstaller（シングルバイナリ化）

### プロジェクト構成

```
xsg/
├── frontend/                    # Vite + React アプリケーション
│   ├── src/
│   │   ├── components/          # React コンポーネント
│   │   │   ├── patterns/        # テストパターン実装
│   │   │   ├── PatternDisplay.tsx
│   │   │   └── PatternMenu.tsx
│   │   ├── lib/                 # ユーティリティとタイプ定義
│   │   ├── App.tsx              # ルートコンポーネント
│   │   ├── main.tsx             # エントリーポイント
│   │   └── index.css            # グローバルスタイル
│   ├── public/                  # 静的アセット
│   ├── dist/                    # ビルド出力（.gitignore）
│   ├── index.html               # HTMLテンプレート
│   ├── vite.config.ts           # Vite設定
│   ├── tailwind.config.ts       # Tailwind設定
│   ├── tsconfig.json            # TypeScript設定
│   └── package.json             # npm依存関係
│
└── backend/                     # FastAPI + PyWebView
    ├── app/
    │   ├── __init__.py
    │   └── main.py              # FastAPI + PyWebView統合
    ├── .venv/                   # Python仮想環境（.gitignore）
    ├── pyproject.toml           # uv依存関係
    ├── build.bat/sh             # ビルドスクリプト
    └── dev.bat/sh               # 開発モードスクリプト
```

## フロントエンド（Vite + React）

### 特徴

- ⚡ **高速ビルド**: ViteによるHMR（Hot Module Replacement）
- 🎨 **シンプルな構成**: SSR不要、純粋なSPA
- 📦 **軽量**: 必要最小限の依存関係
- 🔧 **パスエイリアス**: `@/` でsrcディレクトリを参照可能

### 開発コマンド

```bash
cd frontend
npm install          # 依存関係インストール
npm run dev          # 開発サーバー起動（http://localhost:3000）
npm run build        # プロダクションビルド（dist/）
npm run preview      # ビルド結果をプレビュー
npm run lint         # ESLintチェック
npm run format       # Prettierフォーマット
```

### パターンの実装

全てのテストパターンは `src/components/patterns/` に配置されています。

**実装例（ColorBar.tsx）:**

```tsx
import { useEffect, useRef } from 'react';

export default function ColorBar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 描画ロジック
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // カラーバーを描画
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
```

## バックエンド（FastAPI + PyWebView）

### 特徴

- 🖥️ **デスクトップアプリ化**: PyWebViewによるネイティブウィンドウ
- 🚀 **フルスクリーン起動**: フレームレス・タイトルバーなし
- 🔌 **REST API**: FastAPIによるパターン制御
- 🐍 **Python統合**: OSレベルのガンマ補正制御が可能

### 開発コマンド

```bash
cd backend
uv sync              # 依存関係インストール
uv run python -m app.main --dev  # 開発モード起動
uv run python -m app.main        # 本番モード起動
uv run python -m app.main --api-only  # APIサーバーのみ
```

または、開発スクリプトを使用：

```bash
# Windows
dev.bat

# Linux/macOS
chmod +x dev.sh
./dev.sh
```

### FastAPI エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/` | API情報 |
| GET | `/api/patterns` | 全パターン一覧 |
| GET | `/api/patterns/{id}` | パターン詳細 |
| POST | `/api/gamma` | ガンマ補正設定 |
| GET | `/api/gamma` | ガンマ補正取得 |

**使用例:**

```bash
# パターン一覧取得
curl http://localhost:8000/api/patterns

# ガンマ補正設定
curl -X POST http://localhost:8000/api/gamma \
  -H "Content-Type: application/json" \
  -d '{"value": 2.2, "enabled": true}'
```

### PyWebView統合

`app/main.py`でFastAPIとPyWebViewを統合：

```python
# FastAPI起動（バックグラウンドスレッド）
api_thread = threading.Thread(
    target=start_api_server,
    kwargs={"port": 8000},
    daemon=True,
)
api_thread.start()

# PyWebViewウィンドウ作成
webview.create_window(
    title="XSG - Signal Generator",
    url="http://localhost:3000",  # 開発モード
    fullscreen=True,
    frameless=True,
    resizable=False,
)
webview.start()
```

## ビルドとデプロイ

### プロダクションビルド

```bash
# フロントエンドビルド
cd frontend
npm install
npm run build  # → frontend/dist/

# バックエンド + パッケージング
cd ../backend
uv sync
uv pip install pyinstaller

# Windows
build.bat

# Linux/macOS
chmod +x build.sh
./build.sh
```

### PyInstallerオプション

```bash
pyinstaller --noconfirm \
    --onefile \              # シングルバイナリ
    --windowed \             # コンソールウィンドウを隠す
    --name XSG \             # 実行ファイル名
    --add-data "frontend/dist:frontend/dist" \  # フロントエンドを同梱
    app/main.py
```

**出力:**
- Windows: `backend/dist/XSG.exe`
- Linux/macOS: `backend/dist/XSG`

## 開発ワークフロー

### 1. 新しいパターンを追加

```bash
# 1. フロントエンドにパターンコンポーネント追加
frontend/src/components/patterns/NewPattern.tsx

# 2. PatternDisplay.tsxに登録
# 3. PatternMenu.tsxにメニュー項目追加

# 4. APIにパターン情報追加（オプション）
backend/app/main.py の get_patterns() に追加
```

### 2. APIエンドポイント追加

```python
# backend/app/main.py

@app.post("/api/custom-endpoint")
async def custom_endpoint(data: CustomModel):
    # 処理
    return {"status": "ok"}
```

### 3. フロントエンドからAPI呼び出し

```typescript
// frontend/src/components/SomeComponent.tsx

const response = await fetch('http://localhost:8000/api/custom-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'value' })
});
const result = await response.json();
```

## 技術的な特徴

### フルスクリーン表示

PyWebViewの `fullscreen=True` と `frameless=True` により、タイトルバーなしの完全フルスクリーン表示が可能です。

```python
webview.create_window(
    title="XSG",
    url=url,
    fullscreen=True,   # フルスクリーン
    frameless=True,    # フレームレス
    resizable=False,   # リサイズ不可
)
```

### URLパラメータによるパターン切り替え

```
http://localhost:3000/?pattern=colorbar
http://localhost:3000/?pattern=checker
http://localhost:3000/?pattern=vgradient&steps=128
```

### キーボードショートカット

- `M` キー: パターンメニューを開く/閉じる
- `ESC` キー: メニューを閉じる

## 将来の拡張計画

### 実装済み
- ✅ Vite + React フロントエンド
- ✅ FastAPI バックエンド
- ✅ PyWebView デスクトップラッパー
- ✅ フルスクリーン・フレームレス表示
- ✅ REST API
- ✅ uv パッケージマネージャー

### 今後の実装
- 🔄 OSレベルのガンマ補正制御
- 🔄 カスタムパターンエディタ
- 🔄 パターンアニメーション
- 🔄 設定ファイルの保存/読み込み
- 🔄 マルチディスプレイ対応
- 🔄 より高度なテストパターン（Zone Plate、Needleなど）

## トラブルシューティング

### Vite開発サーバーが起動しない

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### PyWebViewウィンドウが開かない

```bash
cd backend
uv sync
# Windowsの場合、.NET Framework 4.7.2以上が必要
```

### ビルドエラー

```bash
# フロントエンド
cd frontend
npm run build

# バックエンド
cd backend
uv sync
# pyproject.tomlの[tool.hatch.build.targets.wheel]を確認
```

## 参考リンク

- [Vite Documentation](https://vite.dev/)
- [React Documentation](https://react.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PyWebView Documentation](https://pywebview.flowrl.com/)
- [uv Documentation](https://docs.astral.sh/uv/)
- [PyInstaller Documentation](https://pyinstaller.org/)

## ライセンス

MIT License

## 作者

kako-jun
