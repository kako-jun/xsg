# XSG パス解決仕様

## 📁 画像ファイルパスの解決ルール

### 対応する形式

```yaml
# 1. 相対パス（推奨）
src: "./images/fg/crosstalk.png"
src: "../shared/logo.png"

# 2. 絶対パス（Windows/Linux/macOS）
src: "/home/user/images/test.png"         # Linux/macOS
src: "C:\\Users\\user\\images\\test.png"  # Windows

# 3. プロジェクト相対（@プレフィックス）
src: "@/images/fg/crosstalk.png"          # プロジェクトルートから

# 4. URL（HTTP/HTTPS）
src: "https://example.com/images/test.png"
```

---

## 🎯 カレントディレクトリの定義

### ルール: **YAMLファイルが置かれているディレクトリ**

```
プロジェクト構造:
xsg/
├── patterns/
│   ├── test1.yaml          ← カレント: patterns/
│   └── subdir/
│       └── test2.yaml      ← カレント: patterns/subdir/
├── images/
│   ├── fg/
│   │   └── crosstalk.png
│   └── bg/
│       └── checker.png
└── presets/
```

### 例1: `patterns/test1.yaml`

```yaml
nodes:
  - type: image
    src: "./images/fg/crosstalk.png" # ❌ 解決失敗
    # 実際のパス: patterns/images/fg/crosstalk.png（存在しない）

  - type: image
    src: "../images/fg/crosstalk.png" # ✅ 解決成功
    # 実際のパス: images/fg/crosstalk.png
```

### 例2: `patterns/subdir/test2.yaml`

```yaml
nodes:
  - type: image
    src: "../../images/fg/crosstalk.png" # ✅ 解決成功
    # 実際のパス: images/fg/crosstalk.png
```

---

## 🔧 プロジェクト相対パス（@プレフィックス）

### 推奨: プロジェクトルートからの相対パス

```yaml
# @/ = プロジェクトルート
- type: image
  src: "@/images/fg/crosstalk.png"
# どのYAMLファイルからでも同じパスで参照可能
```

### プロジェクトルートの検出方法

**優先順位:**

1. `--project-root` コマンドライン引数
2. `XSG_PROJECT_ROOT` 環境変数
3. `package.json` が存在するディレクトリ
4. `pyproject.toml` が存在するディレクトリ
5. `.git/` が存在するディレクトリ
6. カレントワーキングディレクトリ

```bash
# 明示的に指定
uv run python -m app.main --file patterns/test.yaml --project-root /path/to/xsg

# 環境変数
export XSG_PROJECT_ROOT=/path/to/xsg
uv run python -m app.main --file patterns/test.yaml

# 自動検出（package.json or pyproject.toml）
uv run python -m app.main --file patterns/test.yaml
```

---

## 📋 パス解決の実装

```python
# backend/app/path_resolver.py
from pathlib import Path
import os

class PathResolver:
    def __init__(self, pattern_file: Path, project_root: Path = None):
        """
        Args:
            pattern_file: YAMLファイルのパス
            project_root: プロジェクトルート（オプション）
        """
        self.pattern_file = pattern_file
        self.pattern_dir = pattern_file.parent  # YAMLのディレクトリ = カレント
        self.project_root = project_root or self._detect_project_root()

    def _detect_project_root(self) -> Path:
        """プロジェクトルートを自動検出"""
        # 1. 環境変数
        if env_root := os.getenv("XSG_PROJECT_ROOT"):
            return Path(env_root)

        # 2. package.json / pyproject.toml を探す
        current = self.pattern_dir
        while current != current.parent:
            if (current / "package.json").exists() or \
               (current / "pyproject.toml").exists():
                return current
            current = current.parent

        # 3. .git/ を探す
        current = self.pattern_dir
        while current != current.parent:
            if (current / ".git").exists():
                return current
            current = current.parent

        # 4. カレントワーキングディレクトリ
        return Path.cwd()

    def resolve(self, path: str) -> Path:
        """
        パスを解決する

        Args:
            path: src属性の値

        Returns:
            解決された絶対パス
        """
        # 1. URL（HTTP/HTTPS）
        if path.startswith(("http://", "https://")):
            return path  # URLはそのまま返す

        # 2. プロジェクト相対（@/）
        if path.startswith("@/"):
            rel_path = path[2:]  # @/ を削除
            return self.project_root / rel_path

        # 3. 絶対パス
        if Path(path).is_absolute():
            return Path(path)

        # 4. 相対パス（YAMLファイルからの相対）
        return (self.pattern_dir / path).resolve()

    def exists(self, path: str) -> bool:
        """パスが存在するか確認"""
        if path.startswith(("http://", "https://")):
            return True  # URLは存在チェックしない（実行時にエラー）

        resolved = self.resolve(path)
        return resolved.exists()
```

---

## 🧪 テストケース

```python
# tests/test_path_resolver.py
import pytest
from pathlib import Path
from app.path_resolver import PathResolver

def test_relative_path():
    """相対パス"""
    pattern_file = Path("/home/user/xsg/patterns/test.yaml")
    resolver = PathResolver(pattern_file)

    # ../images/fg/test.png
    result = resolver.resolve("../images/fg/test.png")
    assert result == Path("/home/user/xsg/images/fg/test.png")

def test_absolute_path():
    """絶対パス"""
    pattern_file = Path("/home/user/xsg/patterns/test.yaml")
    resolver = PathResolver(pattern_file)

    # /tmp/test.png
    result = resolver.resolve("/tmp/test.png")
    assert result == Path("/tmp/test.png")

def test_project_relative():
    """プロジェクト相対"""
    pattern_file = Path("/home/user/xsg/patterns/test.yaml")
    project_root = Path("/home/user/xsg")
    resolver = PathResolver(pattern_file, project_root)

    # @/images/fg/test.png
    result = resolver.resolve("@/images/fg/test.png")
    assert result == Path("/home/user/xsg/images/fg/test.png")

def test_url():
    """URL"""
    pattern_file = Path("/home/user/xsg/patterns/test.yaml")
    resolver = PathResolver(pattern_file)

    # https://example.com/test.png
    result = resolver.resolve("https://example.com/test.png")
    assert result == "https://example.com/test.png"
```

---

## 📖 使用例

### ケース1: プロジェクト標準レイアウト

```
xsg/
├── patterns/
│   └── test.yaml
└── images/
    ├── fg/
    └── bg/
```

```yaml
# patterns/test.yaml
nodes:
  - type: image
    src: "@/images/fg/crosstalk.png" # ✅ 推奨（どこからでも同じ）
```

### ケース2: 相対パス

```yaml
# patterns/test.yaml
nodes:
  - type: image
    src: "../images/fg/crosstalk.png" # ✅ OK（シンプル）
```

### ケース3: 絶対パス

```yaml
# patterns/test.yaml
nodes:
  - type: image
    src: "/home/user/assets/test.png" # ✅ OK（外部リソース）
```

### ケース4: URL

```yaml
# patterns/test.yaml
nodes:
  - type: image
    src: "https://cdn.example.com/test.png" # ✅ OK（リモート）
```

---

## ⚠️ エラーハンドリング

```python
def load_pattern(pattern_file: Path):
    resolver = PathResolver(pattern_file)

    for node in pattern["nodes"]:
        if node.get("type") == "image":
            src = node["src"]

            # 存在チェック（URLは除く）
            if not resolver.exists(src):
                raise FileNotFoundError(
                    f"Image not found: {src}\n"
                    f"Resolved to: {resolver.resolve(src)}\n"
                    f"Pattern file: {pattern_file}\n"
                    f"Project root: {resolver.project_root}"
                )
```

**エラーメッセージ例:**

```
Image not found: ./images/fg/test.png
Resolved to: /home/user/xsg/patterns/images/fg/test.png
Pattern file: /home/user/xsg/patterns/test.yaml
Project root: /home/user/xsg

Hint: Did you mean "@/images/fg/test.png" or "../images/fg/test.png"?
```

---

## 🎯 推奨パターン

### ✅ 推奨: プロジェクト相対（@/）

```yaml
src: "@/images/fg/crosstalk.png"
```

**メリット:**

- どのYAMLファイルからも同じパスで参照可能
- YAMLファイルを移動しても動作する
- 最も分かりやすい

### ✅ OK: 相対パス

```yaml
src: "../images/fg/crosstalk.png"
```

**メリット:**

- シンプル
- プロジェクトルートの検出が不要

**デメリット:**

- YAMLファイルを移動すると動作しなくなる

### ✅ OK: 絶対パス（外部リソース）

```yaml
src: "/mnt/shared/assets/test.png"
```

**用途:**

- 共有ディレクトリのリソース
- 外部ストレージ

### ✅ OK: URL

```yaml
src: "https://cdn.example.com/test.png"
```

**用途:**

- CDN
- リモートリソース

---

## 🔄 移植元との互換性

### 移植元の仕様

```javascript
// 移植元
{
  "image_id": "fg/クロストーク"  // 拡張子なし、相対パス
}
```

### 新仕様での対応

```yaml
# 新仕様（推奨）
src: "@/images/fg/クロストーク.png"

# 移行ツールでの変換
# image_id: "fg/クロストーク" → src: "@/images/fg/クロストーク.png"
```

```python
# migration.py
def convert_image_id(image_id: str) -> str:
    """移植元のimage_idを新形式に変換"""
    # 拡張子がない場合は .png を追加
    if not any(image_id.endswith(ext) for ext in [".png", ".jpg", ".gif", ".bmp"]):
        image_id = f"{image_id}.png"

    # プロジェクト相対に変換
    return f"@/images/{image_id}"

# 例:
# "fg/クロストーク" → "@/images/fg/クロストーク.png"
# "bg/sandstorm" → "@/images/bg/sandstorm.png"
```

---

## 📋 まとめ

| パス形式         | 例                             | カレント                   | 推奨度             |
| ---------------- | ------------------------------ | -------------------------- | ------------------ |
| プロジェクト相対 | `@/images/test.png`            | プロジェクトルート         | ⭐⭐⭐             |
| 相対パス         | `../images/test.png`           | YAMLファイルのディレクトリ | ⭐⭐               |
| 絶対パス         | `/home/user/test.png`          | -                          | ⭐（外部リソース） |
| URL              | `https://example.com/test.png` | -                          | ⭐（リモート）     |

**デフォルト推奨: プロジェクト相対（@/）**
