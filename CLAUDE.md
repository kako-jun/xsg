# XSG Development Notes

このドキュメントは、XSGプロジェクトの技術的な選択肢と将来の実装計画をまとめたものです。

## プロジェクト概要

XSG（Signal Generator）は、高価な業務用信号発生器の代替となるブラウザベースのテストパターン生成ツールです。cprofプロジェクトと同様に、当初はRust + Tauriでデスクトップアプリとして開発する予定でしたが、開発速度と配布の容易さを優先し、まずNext.js + TypeScriptでブラウザ版を実装しました。

## 現在の実装（ブラウザ版）

### 技術スタック

- **フレームワーク**: Next.js 15.5.0 (App Router)
- **言語**: TypeScript 5.7.0
- **スタイリング**: Tailwind CSS 3.4.0
- **設定管理**: js-yaml 4.1.0
- **デプロイ**: GitHub Pages (静的エクスポート)

### ブラウザ版の制約

- ❌ 自動フルスクリーン表示が不可（ユーザー操作が必須）
- ❌ タイトルバー・アドレスバーの完全削除が不可
- ❌ OSレベルのガンマ補正制御が不可
- ⚠️ セキュリティ制約により、起動時の自動フルスクリーン化は禁止

### 回避策

1. ブラウザのフルスクリーンモード（F11キー）を手動で使用
2. Kioskモードでブラウザを起動（例: `chrome --kiosk http://localhost:3000`）

---

## 将来の実装計画：デスクトップアプリ化

ブラウザ版の制約を克服し、業務用として完全な機能を提供するため、将来的にデスクトップアプリ化を検討しています。

### 選択肢1: Python + PyWebView（推奨）

#### 概要

既存のHTML/CSS/JavaScript（Next.jsビルド）をそのまま使い、Pythonでウィンドウのみをラップする方法。

#### メリット

- ✅ 既存のコードをほぼそのまま流用可能
- ✅ タイトルバーなしフルスクリーン起動が可能
- ✅ シンプルで開発が容易
- ✅ クロスプラットフォーム対応
- ✅ Pythonライブラリでガンマ補正制御も可能

#### デメリット

- ⚠️ バイナリサイズが大きい（Python + ブラウザエンジン）
- ⚠️ 起動速度がTauriより遅い

#### 実装例

**静的ビルド版（推奨）**

```python
import webview
import os

# npm run build で生成された out/ ディレクトリを使う
index_path = os.path.abspath('./out/index.html')

webview.create_window(
    'XSG - Signal Generator',
    f'file://{index_path}',
    fullscreen=True,      # フルスクリーン起動
    frameless=True,       # タイトルバーなし
)
webview.start()
```

**開発サーバー版**

```python
import webview
import threading
import subprocess
import time

def start_next_server():
    subprocess.Popen(['npm', 'run', 'dev'], cwd='./xsg')
    time.sleep(3)  # サーバー起動待ち

threading.Thread(target=start_next_server, daemon=True).start()

webview.create_window(
    'XSG',
    'http://localhost:3000',
    fullscreen=True,
    frameless=True,
)
webview.start()
```

#### PyWebViewのインストール

```bash
pip install pywebview
```

---

### 選択肢2: Tauri（将来推奨）

#### 概要

Rust製の軽量デスクトップアプリフレームワーク。cprofと同じアプローチ。

#### メリット

- ✅ バイナリサイズが非常に小さい（数MB）
- ✅ 起動が非常に速い
- ✅ セキュリティが高い
- ✅ クロスプラットフォーム対応が優れている
- ✅ 既存のNext.jsコードをそのまま使える

#### デメリット

- ⚠️ Rust言語の学習コストが高い
- ⚠️ セットアップがPyWebViewより複雑

#### 実装概要

```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            window.set_fullscreen(true).unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### 選択肢3: Pythonネイティブ（Canvas描画）

既存のHTML版を使わず、PythonでCanvas描画を直接実装する方法。

#### 3-1. Tkinter（標準ライブラリ）

**メリット**

- ✅ 追加インストール不要
- ✅ シンプルで学習コストが低い
- ✅ ドキュメントが豊富

**デメリット**

- ⚠️ UIが古臭い
- ⚠️ 高度な描画は手間がかかる

**実装例**

```python
import tkinter as tk

root = tk.Tk()

# タイトルバー削除
root.overrideredirect(True)

# 画面サイズ取得して最大化
screen_width = root.winfo_screenwidth()
screen_height = root.winfo_screenheight()
root.geometry(f"{screen_width}x{screen_height}+0+0")

# Canvas作成
canvas = tk.Canvas(root, width=screen_width, height=screen_height, bg='black')
canvas.pack()

# カラーバー描画例
colors = ['#C0C0C0', '#C0C000', '#00C0C0', '#00C000', '#C000C0', '#C00000', '#0000C0']
bar_width = screen_width // len(colors)
for i, color in enumerate(colors):
    canvas.create_rectangle(
        i * bar_width, 0,
        (i + 1) * bar_width, screen_height,
        fill=color, outline=''
    )

root.mainloop()
```

#### 3-2. PyQt5/PySide6（プロフェッショナル向け）

**メリット**

- ✅ 非常に高機能
- ✅ QPainterで自由に描画可能
- ✅ 企業アプリで広く使われている

**デメリット**

- ⚠️ 学習コストが高い
- ⚠️ ライセンス問題（GPL or 商用ライセンス）

**実装例**

```python
from PyQt5.QtWidgets import QApplication, QMainWindow
from PyQt5.QtGui import QPainter, QColor
from PyQt5.QtCore import Qt

class PatternWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowFlags(Qt.FramelessWindowHint)
        self.showFullScreen()

    def paintEvent(self, event):
        painter = QPainter(self)
        colors = [
            QColor(192, 192, 192),  # White 75%
            QColor(192, 192, 0),    # Yellow
            QColor(0, 192, 192),    # Cyan
            QColor(0, 192, 0),      # Green
            QColor(192, 0, 192),    # Magenta
            QColor(192, 0, 0),      # Red
            QColor(0, 0, 192),      # Blue
        ]
        bar_width = self.width() // len(colors)
        for i, color in enumerate(colors):
            painter.fillRect(i * bar_width, 0, bar_width, self.height(), color)

app = QApplication([])
window = PatternWindow()
window.show()
app.exec_()
```

#### 3-3. Kivy（モバイル対応）

**メリット**

- ✅ モバイル対応（Android/iOS）
- ✅ タッチUI向け

**デメリット**

- ⚠️ デスクトップ用途には過剰
- ⚠️ 学習コストが高い

---

## 技術選択の比較表

| 方法          | タイトルバー削除 | 自動フルスクリーン | バイナリサイズ | 開発の手軽さ | 既存コード流用 |
| ------------- | ---------------- | ------------------ | -------------- | ------------ | -------------- |
| **ブラウザ**  | ❌               | ❌                 | -              | ⭐⭐⭐       | ✅ 完全        |
| **PyWebView** | ✅               | ✅                 | 大 (50-100MB)  | ⭐⭐         | ✅ 完全        |
| **Tauri**     | ✅               | ✅                 | 小 (5-15MB)    | ⭐⭐         | ✅ 完全        |
| **Tkinter**   | ✅               | ✅                 | 小             | ⭐           | ❌ 要再実装    |
| **PyQt**      | ✅               | ✅                 | 大             | ⭐           | ❌ 要再実装    |

---

## 推奨ロードマップ

### フェーズ1: ブラウザ版（現在）✅

- Next.js + TypeScriptで全機能を実装
- GitHub Pagesでの配布
- 多様なテストパターンの実装
- モバイル対応UI

### フェーズ2: PyWebView版（短期）

- 既存のHTML版をラップ
- タイトルバーなしフルスクリーン対応
- Pythonでのガンマ補正制御実装
- シングルバイナリ化（PyInstaller）

### フェーズ3: Tauri版（中期）

- Rust + Tauriで完全移行
- 軽量・高速バイナリ
- OSレベルの機能統合
- プロフェッショナル向け機能追加

---

## PyWebView実装の詳細

### 必要なパッケージ

```bash
pip install pywebview
pip install pyinstaller  # バイナリ化用
```

### ディレクトリ構成

```
xsg/
├── out/              # Next.js静的ビルド (npm run build)
├── xsg_app.py        # PyWebViewラッパー
├── requirements.txt
└── build.sh          # ビルドスクリプト
```

### xsg_app.py（完全版）

```python
import webview
import os
import sys

def get_resource_path(relative_path):
    """PyInstallerでバンドルされたリソースのパスを取得"""
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def main():
    # 静的ビルドのindex.htmlを読み込む
    index_path = get_resource_path('out/index.html')

    # ウィンドウ作成
    window = webview.create_window(
        'XSG - Signal Generator',
        f'file://{index_path}',
        fullscreen=True,
        frameless=True,
        resizable=False,
    )

    # アプリ起動
    webview.start()

if __name__ == '__main__':
    main()
```

### バイナリ化

```bash
# Windows
pyinstaller --onefile --windowed --add-data "out;out" xsg_app.py

# macOS/Linux
pyinstaller --onefile --windowed --add-data "out:out" xsg_app.py
```

---

## まとめ

### 現状のベストプラクティス

1. **開発フェーズ**: Next.js + TypeScriptで機能を素早く実装
2. **配布フェーズ**: GitHub Pagesでブラウザ版を公開
3. **プロフェッショナル向け**: PyWebViewで簡易デスクトップ版を提供
4. **長期目標**: Tauriで最適化されたバイナリを提供

### 次のステップ

- [ ] ブラウザ版の機能完成度を高める
- [ ] PyWebView版のプロトタイプ作成
- [ ] ガンマ補正制御の実装検証
- [ ] Tauriへの移行検討

---

## 参考リンク

- [PyWebView Documentation](https://pywebview.flowrl.com/)
- [Tauri Documentation](https://tauri.app/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [cprof Repository](https://github.com/kako-jun/cprof) - 参考元プロジェクト
