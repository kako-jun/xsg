# XSG Webレンダリングモード + プロキシ対応

## 🌐 新機能: HTMLレンダリングモード

PyWebViewは実質的にブラウザなので、**任意のURLを全画面レンダリング**できます。

---

## 🎯 使用例

### 1. HTMLページを全画面表示

```bash
# URLを直接指定
uv run python -m app.main --url https://example.com

# フルスクリーン + 操作不可
uv run python -m app.main --url https://example.com --fullscreen --readonly
```

### 2. プレイリストでWebページを表示

```yaml
# playlist.yaml
items:
  # Webページを表示（操作不可）
  - url: "https://example.com"
    duration: 10000
    readonly: true

  # YouTubeライブを表示
  - url: "https://www.youtube.com/watch?v=xxxxx"
    duration: 60000
    readonly: true

  # ダッシュボードを表示
  - url: "http://localhost:3000/dashboard"
    duration: 30000
```

### 3. YAMLファイル自体をURLで指定

```bash
# リモートのYAMLを読み込み
uv run python -m app.main --file https://example.com/patterns/test.yaml

# プレイリストもURL
uv run python -m app.main --playlist https://example.com/playlists/signage.yaml

# GitHub Rawから直接
uv run python -m app.main --file https://raw.githubusercontent.com/user/repo/main/pattern.yaml
```

---

## 🔧 実装

### 1. URL直接レンダリング

```python
# backend/app/main.py
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", type=str,
                        help="URL to display directly")
    parser.add_argument("--readonly", action="store_true",
                        help="Disable user interaction")
    parser.add_argument("--file", type=str,
                        help="Pattern file (local path or URL)")
    parser.add_argument("--playlist", type=str,
                        help="Playlist file (local path or URL)")
    args = parser.parse_args()

    if args.url:
        # URL直接レンダリング
        run_url_mode(args.url, readonly=args.readonly)
    elif args.file:
        # パターンファイル
        run_pattern_mode(args.file)
    elif args.playlist:
        # プレイリスト
        run_playlist_mode(args.playlist)
    else:
        # デフォルト
        run_normal_mode()

def run_url_mode(url: str, readonly: bool = True):
    """URL直接レンダリングモード"""
    window = webview.create_window(
        title="XSG - Web Renderer",
        url=url,
        fullscreen=True,
        frameless=True,
    )

    if readonly:
        # JavaScript無効化（操作不可）
        window.evaluate_js("document.body.style.pointerEvents = 'none';")

    webview.start()
```

### 2. リモートファイルの読み込み

```python
# backend/app/loader.py
import httpx
from pathlib import Path
import yaml

class ResourceLoader:
    def __init__(self, proxy: str = None):
        self.proxy = proxy
        self.client = httpx.Client(
            proxies=proxy if proxy else None,
            timeout=30.0,
            follow_redirects=True,
        )

    def load(self, resource: str) -> dict:
        """
        ローカルファイルまたはURLを読み込み

        Args:
            resource: ファイルパスまたはURL

        Returns:
            パース済みのYAMLデータ
        """
        if resource.startswith(("http://", "https://")):
            # URL
            return self._load_url(resource)
        else:
            # ローカルファイル
            return self._load_file(resource)

    def _load_url(self, url: str) -> dict:
        """URLからYAMLを読み込み"""
        response = self.client.get(url)
        response.raise_for_status()

        content = response.text
        return yaml.safe_load(content)

    def _load_file(self, path: str) -> dict:
        """ローカルファイルを読み込み"""
        with open(path) as f:
            return yaml.safe_load(f)

# 使用例
loader = ResourceLoader(proxy=os.getenv("HTTP_PROXY"))

# ローカル
pattern = loader.load("patterns/test.yaml")

# URL
pattern = loader.load("https://example.com/patterns/test.yaml")
```

---

## 🔒 プロキシ対応

### 環境変数

```bash
# HTTP/HTTPSプロキシ
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# 認証付きプロキシ
export HTTP_PROXY=http://user:password@proxy.example.com:8080

# プロキシ除外
export NO_PROXY=localhost,127.0.0.1,.local

# XSG起動
uv run python -m app.main --url https://example.com
```

### コマンドライン引数

```bash
# プロキシを直接指定
uv run python -m app.main --url https://example.com \
  --proxy http://proxy.example.com:8080

# 認証付き
uv run python -m app.main --url https://example.com \
  --proxy http://user:password@proxy.example.com:8080
```

### 実装

```python
# backend/app/main.py
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--proxy", type=str,
                        help="HTTP/HTTPS proxy (e.g., http://proxy:8080)")
    args = parser.parse_args()

    # プロキシ設定（環境変数 or 引数）
    proxy = args.proxy or os.getenv("HTTP_PROXY") or os.getenv("HTTPS_PROXY")

    if proxy:
        # httpxにプロキシを設定
        os.environ["HTTP_PROXY"] = proxy
        os.environ["HTTPS_PROXY"] = proxy

        # PyWebViewにもプロキシを設定（WebEngineによる）
        setup_webview_proxy(proxy)

def setup_webview_proxy(proxy: str):
    """PyWebViewにプロキシを設定"""
    # PyWebViewはChromium/WebKit/EdgeWebView2を使用
    # プロキシ設定方法はプラットフォームによる

    import platform
    system = platform.system()

    if system == "Windows":
        # EdgeWebView2の場合、環境変数で設定
        # または webview.start() の前に設定
        pass
    elif system == "Linux":
        # WebKitGTKの場合、環境変数で設定
        pass
    elif system == "Darwin":
        # macOS WebKitの場合、環境変数で設定
        pass
```

---

## 📋 プレイリストでのWeb表示

### プレイリスト形式の拡張

```yaml
# web-playlist.yaml
version: "1.0"

# プロキシ設定（オプション）
proxy: "http://proxy.example.com:8080"

playlist:
  mode: sequence
  loop: true

items:
  # 1. XSGパターン
  - pattern: "@/patterns/colorbar.yaml"
    duration: 3000

  # 2. Webページ（操作不可）
  - url: "https://example.com"
    readonly: true
    duration: 10000

  # 3. Webページ（操作可能）
  - url: "http://localhost:3000/dashboard"
    readonly: false
    duration: 30000

  # 4. YouTube
  - url: "https://www.youtube.com/embed/xxxxx?autoplay=1"
    readonly: true
    duration: 60000

  # 5. ローカルHTML
  - url: "file:///C:/Users/user/dashboard.html"
    readonly: false
    duration: 15000
```

### 実装

```python
# backend/app/playlist.py
class PlaylistRunner:
    async def run(self, on_change_callback):
        while True:
            item = self.get_current()

            if "url" in item:
                # Webページを表示
                await self._show_url(item)
            elif "pattern" in item:
                # パターンを表示
                await self._show_pattern(item)
            elif "inline" in item:
                # インラインパターンを表示
                await self._show_inline(item)

            await asyncio.sleep(item.get("duration", 5000) / 1000)
            self.next()

    async def _show_url(self, item: Dict):
        """Webページを表示"""
        url = item["url"]
        readonly = item.get("readonly", True)

        # PyWebViewでURLを読み込み
        window.load_url(url)

        if readonly:
            # JavaScript無効化
            window.evaluate_js("""
                document.body.style.pointerEvents = 'none';
                document.body.style.userSelect = 'none';
            """)
```

---

## 🎨 使用例

### 例1: デジタルサイネージ（Web + パターン）

```yaml
# signage-web.yaml
version: "1.0"

playlist:
  mode: sequence
  loop: true

items:
  # 会社のダッシュボード
  - url: "http://internal.company.com/dashboard"
    readonly: true
    duration: 30000

  # お知らせページ
  - url: "https://company.com/notice"
    readonly: true
    duration: 15000

  # テストパターン
  - pattern: "@/patterns/colorbar.yaml"
    duration: 5000
```

### 例2: スクリーンセーバー（URL画像 + Web）

```yaml
# screensaver-web.yaml
version: "1.0"

playlist:
  mode: random
  loop: true

items:
  # URL画像
  - image:
      src: "https://picsum.photos/1920/1080"
      fit: cover
    duration: 5000

  # Webページ
  - url: "https://unsplash.com/photos/random"
    readonly: true
    duration: 10000

  # ランダムパターン
  - generator: random
    count: 5
    duration: 3000
```

### 例3: URLからYAMLを読み込み

```bash
# GitHub Rawから直接読み込み
uv run python -m app.main --file \
  https://raw.githubusercontent.com/user/xsg-patterns/main/colorbar.yaml

# プレイリストもURL
uv run python -m app.main --playlist \
  https://example.com/playlists/signage.yaml

# プロキシ経由
uv run python -m app.main --file \
  https://example.com/patterns/test.yaml \
  --proxy http://proxy:8080
```

---

## 🔐 セキュリティ考慮事項

### 1. readonlyモード

```yaml
# 操作を完全に無効化
- url: "https://example.com"
  readonly: true
```

**実装:**
```javascript
// pointer-eventsで操作無効化
document.body.style.pointerEvents = 'none';
document.body.style.userSelect = 'none';

// さらに厳密に（すべてのイベントを無効化）
document.addEventListener('click', (e) => e.preventDefault(), true);
document.addEventListener('contextmenu', (e) => e.preventDefault(), true);
```

### 2. サンドボックス

```python
# PyWebViewのセキュリティ設定
window = webview.create_window(
    url=url,
    js_api=None,  # JavaScriptからPythonへのアクセス無効化
)
```

### 3. ホワイトリスト

```yaml
# 許可するドメインのみ
allowedDomains:
  - "company.com"
  - "localhost"
  - "127.0.0.1"

items:
  - url: "https://company.com/dashboard"  # ✅ OK
  - url: "https://evil.com"                # ❌ ブロック
```

---

## 📊 スキーマ拡張

```yaml
# XSG Pattern/Playlist Format v1.0

# グローバル設定
proxy: string               # HTTPプロキシ（オプション）
allowedDomains: string[]    # 許可するドメイン（オプション）

# プレイリストアイテム
items:
  - # Option 1: パターンファイル（URL可）
    pattern: string         # ローカルパスまたはURL
    duration: number

  - # Option 2: Webページ
    url: string             # HTTP/HTTPS/file://
    readonly: boolean       # 操作無効化（デフォルト: true）
    duration: number

  - # Option 3: 画像（URL可）
    image:
      src: string           # ローカルパスまたはURL
      fit: string
    duration: number
```

---

## 🚀 実装の優先順位

### v1.0（基本）
1. ✅ **URL直接レンダリング** - `--url` 引数
2. ✅ **readonlyモード** - 操作無効化
3. ✅ **リモートファイル読み込み** - YAML URL対応

### v1.1（プロキシ）
4. ✅ **プロキシ対応** - 環境変数 + 引数
5. ✅ **プレイリストでWeb表示** - `url` アイテム
6. ✅ **ホワイトリスト** - ドメイン制限

---

## ✅ まとめ

**新機能:**
1. ✅ **URL直接レンダリング** - 任意のWebページを全画面表示
2. ✅ **readonlyモード** - 操作を完全に無効化
3. ✅ **リモートYAML** - YAMLファイル自体をURLで指定
4. ✅ **プロキシ対応** - 企業ネットワーク対応

**用途:**
- 🌐 **Webダッシュボード表示** - 社内ダッシュボードを全画面表示
- 📺 **デジタルサイネージ** - WebページとXSGパターンを混在
- 🖼️ **スライドショー** - URL画像を自動切り替え
- 🔐 **情報端末** - readonly + ホワイトリストで安全に表示

**PyWebViewの本質を活かした設計:**
- XSGは単なるテストパターン発生器ではなく、**汎用の全画面Webレンダラー**
- プロキシ対応で企業環境でも使える
- YAMLをURLで指定できるので、設定ファイルを一元管理可能

これにより、XSGは**信号発生器 + デジタルサイネージ + Webキオスク端末**の3役をこなせます！
