# XSG スクリーンセーバー インストールガイド

XSGをスクリーンセーバーとして使用する方法を説明します。

## 共通仕様

全OSで以下のコマンドライン引数に対応しています：

```bash
# スクリーンセーバーモード
xsg --screensaver --playlist screensaver.yaml

# ランダムパターン生成
xsg --screensaver --random --duration 3000

# 単一パターン表示
xsg --screensaver --pattern colorbar.yaml

# プレビューモード
xsg --screensaver --preview

# 設定画面
xsg --screensaver-config
```

## Windows インストール

### 方法1: .scr ファイル（推奨）

#### ビルド

```bash
# 1. フロントエンドをビルド
cd frontend
npm install
npm run build

# 2. バックエンドをパッケージング
cd ../backend
uv sync
uv pip install pyinstaller

# 3. PyInstallerでビルド
pyinstaller --noconfirm ^
    --onefile ^
    --windowed ^
    --name XSG ^
    --add-data "../frontend/dist;frontend/dist" ^
    --add-data "../patterns;patterns" ^
    --add-data "../playlists;playlists" ^
    --add-data "../presets;presets" ^
    app/main.py

# 4. .scr にリネーム
copy dist\XSG.exe dist\XSG.scr
```

#### インストール

**Option A: システム全体にインストール（管理者権限が必要）**

```powershell
# XSG.scrをシステムディレクトリにコピー
Copy-Item dist\XSG.scr C:\Windows\System32\

# スクリーンセーバー設定を開く
control desk.cpl,,@screensaver
```

**Option B: ユーザーごとにインストール（管理者権限不要）**

```powershell
# ユーザーディレクトリにコピー
$dest = "$env:USERPROFILE\AppData\Local\XSG"
New-Item -ItemType Directory -Force -Path $dest
Copy-Item dist\XSG.scr $dest\

# 右クリック → "インストール" を選択
explorer $dest
```

#### 設定

1. デスクトップを右クリック → 「個人用設定」
2. 「ロック画面」→「スクリーンセーバー設定」
3. スクリーンセーバーのリストから「XSG」を選択
4. 「設定」ボタンでプレイリストを選択（オプション）
5. 待ち時間を設定（例: 5分）
6. 「OK」をクリック

### Windows コマンドライン引数

Windows スクリーンセーバーは以下の引数をサポート：

```cmd
XSG.scr /s          スクリーンセーバー起動
XSG.scr /c          設定画面表示
XSG.scr /p 12345    プレビュー（ウィンドウハンドル指定）
```

XSGは自動的にこれらの引数を認識し、適切なモードで動作します。

## Linux (XScreenSaver) インストール

### 方法1: バイナリインストール

#### ビルド

```bash
# 1. フロントエンドをビルド
cd frontend
npm install
npm run build

# 2. バックエンドをパッケージング
cd ../backend
uv sync
uv pip install pyinstaller

# 3. PyInstallerでビルド
pyinstaller --noconfirm \
    --onefile \
    --windowed \
    --name xsg \
    --add-data "../frontend/dist:frontend/dist" \
    --add-data "../patterns:patterns" \
    --add-data "../playlists:playlists" \
    --add-data "../presets:presets" \
    app/main.py

# 4. システムにインストール
sudo cp dist/xsg /usr/local/bin/
sudo chmod +x /usr/local/bin/xsg
```

#### XScreenSaver設定

```bash
# 1. ~/.xscreensaver を編集
nano ~/.xscreensaver

# 2. programs: セクションに追加
programs: \
  xsg --screensaver --playlist ~/.xsg/screensaver.yaml -root \n\

# 3. プレイリストを配置
mkdir -p ~/.xsg
cp playlists/random-screensaver.yaml ~/.xsg/screensaver.yaml

# 4. XScreenSaverを再起動
xscreensaver-command -restart
```

#### XScreenSaver GUI設定

```bash
# XScreenSaver設定画面を開く
xscreensaver-settings

# Advanced タブ → Programs
# 以下を追加:
xsg --screensaver --playlist ~/.xsg/screensaver.yaml -root
```

### Linux コマンドライン引数

```bash
# XScreenSaver用（-root フラグ）
xsg --screensaver --playlist screensaver.yaml -root

# 通常起動
xsg --screensaver --playlist screensaver.yaml

# ランダムパターン
xsg --screensaver --random -root
```

## macOS インストール

### 方法1: コマンドライン直接実行（推奨）

macOS 26以降、スクリーンセーバーシステムが変更されたため、コマンドライン実行が最も確実です。

#### ビルド

```bash
# 1. フロントエンドをビルド
cd frontend
npm install
npm run build

# 2. バックエンドをパッケージング
cd ../backend
uv sync
uv pip install pyinstaller

# 3. PyInstallerでビルド
pyinstaller --noconfirm \
    --onefile \
    --windowed \
    --name xsg \
    --add-data "../frontend/dist:frontend/dist" \
    --add-data "../patterns:patterns" \
    --add-data "../playlists:playlists" \
    --add-data "../presets:presets" \
    app/main.py

# 4. インストール
sudo cp dist/xsg /usr/local/bin/
sudo chmod +x /usr/local/bin/xsg
```

#### 使用方法

```bash
# プレイリストを配置
mkdir -p ~/.xsg
cp playlists/random-screensaver.yaml ~/.xsg/screensaver.yaml

# 手動起動
xsg --screensaver --playlist ~/.xsg/screensaver.yaml

# キーボードショートカット設定（オプション）
# システム設定 → キーボード → ショートカット
# カスタムショートカットで上記コマンドを登録
```

### 方法2: .saver バンドル（オプション）

.saverバンドルを作成することも可能ですが、macOS 26以降では非推奨です。

## プレイリスト設定

### デフォルトプレイリスト

デフォルトでは、スクリーンセーバーはランダムパターンを生成します。

カスタムプレイリストを使用する場合：

#### Windows

```powershell
# プレイリストを配置
Copy-Item playlists\random-screensaver.yaml C:\Users\<username>\AppData\Local\XSG\screensaver.yaml

# 設定画面から選択
```

#### Linux

```bash
# プレイリストを配置
mkdir -p ~/.xsg
cp playlists/random-screensaver.yaml ~/.xsg/screensaver.yaml

# ~/.xscreensaver を更新
programs: \
  xsg --screensaver --playlist ~/.xsg/screensaver.yaml -root \n\
```

#### macOS

```bash
# プレイリストを配置
mkdir -p ~/.xsg
cp playlists/random-screensaver.yaml ~/.xsg/screensaver.yaml

# 起動コマンドに反映
xsg --screensaver --playlist ~/.xsg/screensaver.yaml
```

## トラブルシューティング

### Windows

**問題: スクリーンセーバーリストに表示されない**

- `C:\Windows\System32` または `%USERPROFILE%\AppData\Local\XSG` に .scr ファイルがあるか確認
- ファイル名が `XSG.scr` であることを確認
- 管理者権限で実行していない場合、ユーザーディレクトリを使用

**問題: 設定画面が表示されない**

- `XSG.scr /c` を直接実行してエラーメッセージを確認
- Python環境が正しくパッケージングされているか確認

### Linux

**問題: XScreenSaverに表示されない**

- `~/.xscreensaver` ファイルの `programs:` セクションを確認
- `xsg` コマンドが `/usr/local/bin/` にあるか確認
- `xscreensaver-command -restart` を実行

**問題: 画面が真っ黒**

- プレイリストファイルのパスが正しいか確認
- `xsg --screensaver --playlist <path> -root` を手動実行してエラー確認

### macOS

**問題: コマンドが見つからない**

- `/usr/local/bin/xsg` が存在するか確認
- `chmod +x /usr/local/bin/xsg` で実行権限を付与

**問題: プレイリストが読み込めない**

- `~/.xsg/screensaver.yaml` のパスと権限を確認
- フルパスで指定: `xsg --screensaver --playlist ~/.xsg/screensaver.yaml`

## カスタマイズ

### プロキシ環境での使用

```bash
# 環境変数でプロキシ設定
export HTTP_PROXY=http://proxy:8080
export HTTPS_PROXY=http://proxy:8080
xsg --screensaver --playlist screensaver.yaml

# または引数で指定
xsg --screensaver --playlist screensaver.yaml --proxy http://proxy:8080
```

### マルチディスプレイ

```bash
# 全ディスプレイに表示
xsg --screensaver --playlist screensaver.yaml --display all

# プライマリディスプレイのみ
xsg --screensaver --playlist screensaver.yaml --display primary

# 左端ディスプレイ
xsg --screensaver --playlist screensaver.yaml --display left
```

## 参考リンク

- [CROSS_PLATFORM_SCREENSAVER.md](./CROSS_PLATFORM_SCREENSAVER.md) - 設計詳細
- [playlists/README.md](./playlists/README.md) - プレイリスト作成
- [DESIGN_SUMMARY.md](./DESIGN_SUMMARY.md) - 全体設計
