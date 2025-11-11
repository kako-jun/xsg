# クロスプラットフォーム スクリーンセーバー対応

## 🎯 設計方針

**ユーザーの指摘通り：「コマンドラインで指定できれば全OS対応可能」**

全OSで共通のコマンドライン実装を基盤とし、各OS固有の形式は薄いラッパーとして提供します。

---

## 🖥️ クロスプラットフォーム対応

### 共通コマンドライン（全OS）

```bash
# 基本的なスクリーンセーバー起動
xsg --screensaver --playlist screensaver.yaml

# または
xsg -s --playlist screensaver.yaml

# プレビューモード（小ウィンドウ）
xsg --screensaver --preview

# 設定画面
xsg --screensaver-config
```

**これが全OSで動作する基盤です。**

---

## 💻 Windows (.scr)

### 仕組み

- `.scr` = `.exe` をリネームしたもの
- `C:\Windows\System32\` に配置
- 標準的なコマンドライン引数

### コマンドライン引数

```bash
# スクリーンセーバー起動
XSG.scr /s

# 設定画面
XSG.scr /c

# プレビュー（ウィンドウハンドル）
XSG.scr /p 12345
```

### 実装

```python
# backend/app/main.py
def main():
    parser = argparse.ArgumentParser()

    # 標準的なWindowsスクリーンセーバー引数
    parser.add_argument("/s", "--screensaver", action="store_true")
    parser.add_argument("/c", "--config", action="store_true")
    parser.add_argument("/p", "--preview", type=int, nargs="?")

    # XSG独自引数
    parser.add_argument("--playlist", type=str, default="screensaver.yaml")

    args = parser.parse_args()

    if args.screensaver or args.preview is not None:
        run_screensaver(playlist=args.playlist, preview=args.preview)
    elif args.config:
        show_config()
    else:
        run_normal()
```

### ビルド・インストール

```bash
# ビルド
cd backend
pyinstaller --onefile --windowed --name XSG app/main.py

# .scr化
copy dist\XSG.exe dist\XSG.scr

# インストール（管理者権限）
copy dist\XSG.scr C:\Windows\System32\
```

**または:**

```powershell
# ユーザーディレクトリにインストール（管理者権限不要）
copy dist\XSG.scr %USERPROFILE%\AppData\Local\XSG\
```

---

## 🍎 macOS (.saver)

### 仕組み

- `.saver` = ScreenSaverViewバンドル
- `~/Library/Screen Savers/` に配置
- Swift/Objective-Cで実装

### 課題

- ⚠️ macOS 26で仕様変更（legacyScreenSaver engine）
- ⚠️ 複雑（ScreenSaverViewクラスの実装が必要）

### 解決策: コマンドライン + ラッパー

**Option 1: シンプルなラッパー（推奨）**

```swift
// XSG.saver/Contents/MacOS/XSG
// ScreenSaverViewラッパー
import ScreenSaver

class XSGView: ScreenSaverView {
    var process: Process?

    override func startAnimation() {
        super.startAnimation()

        // XSGバイナリを起動
        let task = Process()
        task.launchPath = Bundle.main.path(forResource: "xsg", ofType: nil)
        task.arguments = ["--screensaver", "--playlist", "screensaver.yaml"]
        task.launch()

        self.process = task
    }

    override func stopAnimation() {
        super.stopAnimation()
        process?.terminate()
    }
}
```

**Option 2: コマンドライン直接実行（推奨）**

```bash
# XSGをコマンドラインから直接実行（OS標準スクリーンセーバーは使わない）
# Automatorやcronで自動起動

# cron例
# 5分アイドル後にXSGを起動
*/5 * * * * /path/to/xsg --screensaver --playlist screensaver.yaml
```

### インストール

```bash
# バイナリをインストール
cp xsg /usr/local/bin/

# プレイリストを配置
cp screensaver.yaml ~/.xsg/

# 手動起動
xsg --screensaver --playlist ~/.xsg/screensaver.yaml
```

---

## 🐧 Linux (XScreenSaver)

### 仕組み

- `~/.xscreensaver` に登録
- コマンドラインで実行
- 最もシンプル

### 設定

```bash
# ~/.xscreensaver に追加
programs: \
  xsg --screensaver --playlist ~/.xsg/screensaver.yaml -root
```

**または:**

```bash
# XScreenSaverの設定ファイルを編集
xscreensaver-settings

# "Advanced" タブ → "Programs" に追加
xsg --screensaver --playlist ~/.xsg/screensaver.yaml -root
```

### 実装

```python
# backend/app/main.py
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-root", action="store_true",
                        help="Run in root window (for XScreenSaver)")
    args = parser.parse_args()

    if args.root:
        # XScreenSaver用（ルートウィンドウに描画）
        run_screensaver_root()
    else:
        run_normal()

def run_screensaver_root():
    """XScreenSaver用の実装"""
    # ルートウィンドウに描画する場合の処理
    # または通常のフルスクリーンウィンドウを作成
    pass
```

### インストール

```bash
# バイナリをインストール
sudo cp xsg /usr/local/bin/
chmod +x /usr/local/bin/xsg

# プレイリストを配置
mkdir -p ~/.xsg
cp screensaver.yaml ~/.xsg/

# XScreenSaverに登録
echo 'xsg --screensaver --playlist ~/.xsg/screensaver.yaml -root' >> ~/.xscreensaver
```

---

## 📋 統一されたコマンドライン

### 全OSで共通のインターフェース

```bash
# スクリーンセーバー起動
xsg --screensaver --playlist screensaver.yaml

# プレビュー（小ウィンドウ）
xsg --screensaver --preview

# 設定画面
xsg --screensaver-config

# URLから直接
xsg --screensaver --playlist https://example.com/screensaver.yaml

# フルスクリーン + 操作不可
xsg --url https://example.com --fullscreen --readonly

# ランダムパターン
xsg --screensaver --random --duration 5000
```

### 引数の完全リスト

```bash
# スクリーンセーバーモード
--screensaver, -s          # スクリーンセーバーモード
--preview                  # プレビューモード
--screensaver-config       # 設定画面

# プレイリスト
--playlist FILE            # プレイリストファイル（ローカルまたはURL）
--file FILE                # パターンファイル（ローカルまたはURL）

# ランダム生成
--random                   # ランダムパターン生成
--duration MSEC            # 表示時間（ms）

# URL表示
--url URL                  # URLを直接表示
--readonly                 # 操作無効化

# ディスプレイ
--display all|primary|... # ディスプレイ指定
--fullscreen              # フルスクリーン
--frameless               # フレームレス

# ネットワーク
--proxy URL               # HTTPプロキシ

# OS固有
-root                     # XScreenSaver用（ルートウィンドウ）
/s, /c, /p                # Windows用
```

---

## 🚀 実装の優先順位

### v1.0（全OS共通）
1. ✅ **コマンドライン基盤** - 全OSで動作
2. ✅ **プレイリスト** - `--playlist`
3. ✅ **ランダム生成** - `--random`
4. ✅ **URL直接表示** - `--url`

### v1.1（OS固有ラッパー）
5. ✅ **Windows .scr** - `/s`, `/c`, `/p` 引数
6. ✅ **Linux XScreenSaver** - `-root` 引数
7. ⚠️ **macOS .saver** - ラッパー（オプション）

---

## 📖 インストールガイド

### Windows

```powershell
# 1. ダウンロード
Invoke-WebRequest -Uri https://github.com/kako-jun/xsg/releases/latest/download/XSG.scr -OutFile XSG.scr

# 2. インストール
# Option A: システムディレクトリ（管理者権限必要）
Copy-Item XSG.scr C:\Windows\System32\

# Option B: ユーザーディレクトリ（管理者権限不要）
$dest = "$env:USERPROFILE\AppData\Local\XSG"
New-Item -ItemType Directory -Force -Path $dest
Copy-Item XSG.scr $dest\

# 3. スクリーンセーバー設定で "XSG" を選択
```

### macOS

```bash
# 1. ダウンロード
curl -L https://github.com/kako-jun/xsg/releases/latest/download/xsg-macos -o xsg
chmod +x xsg

# 2. インストール
sudo mv xsg /usr/local/bin/

# 3. プレイリスト配置
mkdir -p ~/.xsg
curl -L https://github.com/kako-jun/xsg/raw/main/screensaver.yaml -o ~/.xsg/screensaver.yaml

# 4. 手動起動（OS標準スクリーンセーバーは使わない）
xsg --screensaver --playlist ~/.xsg/screensaver.yaml
```

### Linux

```bash
# 1. ダウンロード
wget https://github.com/kako-jun/xsg/releases/latest/download/xsg-linux
chmod +x xsg-linux

# 2. インストール
sudo mv xsg-linux /usr/local/bin/xsg

# 3. プレイリスト配置
mkdir -p ~/.xsg
wget https://github.com/kako-jun/xsg/raw/main/screensaver.yaml -O ~/.xsg/screensaver.yaml

# 4. XScreenSaverに登録
echo 'xsg --screensaver --playlist ~/.xsg/screensaver.yaml -root' >> ~/.xscreensaver

# 5. XScreenSaverを再起動
xscreensaver-command -restart
```

---

## 🎨 使用例

### 例1: シンプルなスクリーンセーバー（全OS）

```bash
# プレイリストから起動
xsg --screensaver --playlist screensaver.yaml
```

```yaml
# screensaver.yaml
version: "1.0"

playlist:
  mode: random
  loop: true
  defaultDuration: 10000

items:
  - generator: random
    count: 100
```

### 例2: URL画像スライドショー（全OS）

```bash
xsg --screensaver --playlist https://example.com/slideshow.yaml
```

### 例3: Webダッシュボード表示（全OS）

```bash
xsg --url https://company.com/dashboard --fullscreen --readonly
```

---

## ✅ まとめ

**設計方針:**
1. ✅ **コマンドライン基盤** - 全OSで共通
2. ✅ **OS固有ラッパー** - 必要最小限

**OS対応:**
| OS | 方法 | 状態 |
|----|------|------|
| **Windows** | `.scr`（コマンドライン） | ✅ 完全対応 |
| **Linux** | XScreenSaver登録 | ✅ 完全対応 |
| **macOS** | コマンドライン直接 | ✅ 実用的対応 |
| **macOS** | `.saver`ラッパー | ⚠️ オプション |

**メリット:**
- ✅ **シンプル** - コマンドラインが基盤
- ✅ **柔軟** - OS固有の制約なし
- ✅ **保守性** - 共通コードベース
- ✅ **拡張性** - 新機能が全OSで動作

**結論: ユーザーの指摘通り、コマンドラインベースで全OS対応可能です。**
