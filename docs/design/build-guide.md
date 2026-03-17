# XSG ビルドガイド

XSGをソースからビルドする手順を説明します。

## 前提条件

### 共通

- **Node.js** 20以上
- **Python** 3.11以上
- **uv** (Python package manager)

### Windows

- **Visual Studio Build Tools** または **Visual Studio**
- **.NET Framework** 4.7.2以上（PyWebView用）

### Linux

- **build-essential** (gcc, make等)
- **python3-dev**
- **libwebkit2gtk-4.0-dev** (PyWebView用)

```bash
# Ubuntu/Debian
sudo apt install build-essential python3-dev libwebkit2gtk-4.0-dev

# Fedora
sudo dnf install gcc python3-devel webkit2gtk3-devel
```

### macOS

- **Xcode Command Line Tools**

```bash
xcode-select --install
```

## クイックスタート

### 方法1: 自動ビルド（全プラットフォーム）

```bash
# リポジトリをクローン
git clone https://github.com/kako-jun/xsg.git
cd xsg

# 統合ビルドスクリプトを実行
chmod +x build.sh
./build.sh
```

このスクリプトは：

1. プラットフォームを自動検出
2. フロントエンドをビルド
3. 適切なバックエンドビルドスクリプトを実行

### 方法2: 手動ビルド

#### 1. フロントエンドをビルド

```bash
cd frontend
npm install
npm run build
cd ..
```

#### 2. バックエンドをビルド

**Windows:**

```bash
cd backend
build_windows.bat
```

**Linux:**

```bash
cd backend
chmod +x build_linux.sh
./build_linux.sh
```

**macOS:**

```bash
cd backend
chmod +x build_macos.sh
./build_macos.sh
```

## 出力ファイル

### Windows

- `backend/dist/XSG.exe` - 標準実行ファイル
- `backend/dist/XSG.scr` - スクリーンセーバー

### Linux

- `backend/dist/xsg` - 実行ファイル
- `backend/dist/xsg-linux-x64.tar.gz` - インストールパッケージ

### macOS

- `backend/dist/xsg` - 実行ファイル
- `backend/dist/XSG.app` - アプリケーションバンドル
- `backend/dist/XSG-macOS-x64.dmg` - DMGインストーラー（hdiutilが利用可能な場合）

## 開発ビルド

本番ビルドではなく、開発用に実行する場合：

### フロントエンド

```bash
cd frontend
npm run dev
# http://localhost:3000 で開発サーバーが起動
```

### バックエンド

```bash
cd backend
uv sync
uv run python -m app.main --dev
# PyWebViewウィンドウが開く
```

## ビルドスクリプトの詳細

### build_windows.bat

**機能:**

- PyInstallerで単一実行ファイルを作成
- フロントエンド、パターン、プリセット、プレイリストを同梱
- .exe → .scr に複製してスクリーンセーバー版を作成

**オプション:**

- アイコン: `frontend/public/favicon.ico`
- ウィンドウなし起動（`--windowed`）
- 単一ファイル（`--onefile`）

### build_linux.sh

**機能:**

- PyInstallerで単一実行ファイルを作成
- インストールスクリプト付きのtarballを作成
- XScreenSaver統合サポート

**インストーラーの機能:**

- システム全体（`/usr/local/bin/`）またはユーザーのみ（`~/.local/bin/`）に対応
- XScreenSaver自動設定（オプション）

### build_macos.sh

**機能:**

- PyInstallerで単一実行ファイルを作成
- .appバンドルを作成
- Info.plistとアイコンを設定
- DMGインストーラーを作成（hdiutilが利用可能な場合）

**.appバンドル構造:**

```
XSG.app/
├── Contents/
│   ├── MacOS/
│   │   └── xsg (実行ファイル)
│   ├── Resources/
│   │   ├── playlists/
│   │   ├── patterns/
│   │   └── README.md
│   ├── Info.plist
│   └── PkgInfo
```

## カスタマイズ

### アイコンの変更

**Windows/macOS:**

```bash
# frontend/public/favicon.ico を置き換えてから
cd backend
# ビルドスクリプトを実行
```

**Linux:**
Linuxではデスクトップエントリファイル（.desktop）でアイコンを指定します。

### バンドルするファイルの変更

`build_*.{bat,sh}` スクリプトの `--add-data` オプションを編集：

```bash
--add-data "パス:出力先" \
```

例:

```bash
--add-data "../my-custom-patterns:patterns" \
```

### PyInstallerオプション

詳細は [PyInstaller Documentation](https://pyinstaller.org/) を参照。

よく使うオプション:

- `--onefile` - 単一実行ファイル
- `--windowed` - コンソールウィンドウを非表示
- `--name` - 実行ファイル名
- `--icon` - アイコンファイル
- `--add-data` - データファイルを同梱
- `--hidden-import` - 暗黙的なインポートを明示

## トラブルシューティング

### エラー: Frontend not built

**原因:** フロントエンドがビルドされていない

**解決:**

```bash
cd frontend
npm install
npm run build
```

### エラー: Failed to sync dependencies

**原因:** uvが正しくインストールされていない

**解決:**

```bash
pip install uv
```

### エラー: PyInstaller build failed

**原因:** 依存関係が不足している

**解決:**

**Windows:**

- Visual Studio Build Toolsをインストール
- .NET Framework 4.7.2以上をインストール

**Linux:**

```bash
sudo apt install build-essential python3-dev libwebkit2gtk-4.0-dev
```

**macOS:**

```bash
xcode-select --install
```

### 警告: hdiutil not found (macOS)

**原因:** DMG作成ツールが見つからない

**影響:** DMGインストーラーが作成されない（.appバンドルは作成される）

**解決:** macOS標準のhdiutilを使用（通常はインストール済み）

### 実行ファイルが大きい

**原因:** PyInstallerは全ての依存関係を同梱

**対策:**

- `--exclude-module` で不要なモジュールを除外
- `--strip` でデバッグシンボルを削除（Linux/macOS）
- UPXで圧縮（非推奨: ウイルス対策ソフトに検出される可能性）

### ビルド時間が長い

**原因:** PyInstallerの解析とパッケージング処理

**対策:**

- キャッシュを活用（2回目以降は高速）
- SSDを使用
- `--noconfirm` オプションを削除して対話モードにする

## CI/CD

GitHub Actionsを使用した自動ビルド:

```yaml
# .github/workflows/build.yml で定義済み
```

プッシュ、PR、リリース時に自動的に全プラットフォーム向けにビルド。

## 参考リンク

- [PyInstaller Documentation](https://pyinstaller.org/)
- [Vite Documentation](https://vite.dev/)
- [uv Documentation](https://docs.astral.sh/uv/)
- [PyWebView Documentation](https://pywebview.flowrl.com/)
