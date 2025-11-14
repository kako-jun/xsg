"""
Proxy Support for XSG

Handles HTTP/HTTPS proxy configuration for:
- Pattern file loading from URLs
- Image loading from URLs
- Web page rendering
"""

import os
from typing import Optional
from urllib.parse import urlparse


class ProxyConfig:
    """Proxy configuration manager"""

    def __init__(
        self,
        http_proxy: Optional[str] = None,
        https_proxy: Optional[str] = None,
        no_proxy: Optional[str] = None,
    ):
        """
        Initialize proxy configuration

        Args:
            http_proxy: HTTP proxy URL (e.g., "http://proxy:8080")
            https_proxy: HTTPS proxy URL
            no_proxy: Comma-separated list of hosts to bypass proxy
        """
        self.http_proxy = http_proxy
        self.https_proxy = https_proxy
        self.no_proxy = no_proxy

        # Apply to environment
        if http_proxy:
            os.environ["HTTP_PROXY"] = http_proxy
            os.environ["http_proxy"] = http_proxy

        if https_proxy:
            os.environ["HTTPS_PROXY"] = https_proxy
            os.environ["https_proxy"] = https_proxy

        if no_proxy:
            os.environ["NO_PROXY"] = no_proxy
            os.environ["no_proxy"] = no_proxy

    @classmethod
    def from_env(cls) -> "ProxyConfig":
        """
        Create proxy config from environment variables

        Reads:
        - HTTP_PROXY / http_proxy
        - HTTPS_PROXY / https_proxy
        - NO_PROXY / no_proxy

        Returns:
            ProxyConfig instance
        """
        http_proxy = os.getenv("HTTP_PROXY") or os.getenv("http_proxy")
        https_proxy = os.getenv("HTTPS_PROXY") or os.getenv("https_proxy")
        no_proxy = os.getenv("NO_PROXY") or os.getenv("no_proxy")

        return cls(http_proxy=http_proxy, https_proxy=https_proxy, no_proxy=no_proxy)

    def get_proxies_dict(self) -> dict:
        """
        Get proxies in httpx/requests format

        Returns:
            Dict with 'http' and 'https' keys
        """
        proxies = {}

        if self.http_proxy:
            proxies["http://"] = self.http_proxy

        if self.https_proxy:
            proxies["https://"] = self.https_proxy

        return proxies

    def should_use_proxy(self, url: str) -> bool:
        """
        Check if proxy should be used for a URL

        Args:
            url: URL to check

        Returns:
            True if proxy should be used
        """
        if not self.http_proxy and not self.https_proxy:
            return False

        if not self.no_proxy:
            return True

        # Parse URL
        parsed = urlparse(url)
        host = parsed.hostname

        if not host:
            return True

        # Check NO_PROXY
        no_proxy_hosts = [h.strip() for h in self.no_proxy.split(",")]

        for no_proxy_host in no_proxy_hosts:
            # Exact match
            if host == no_proxy_host:
                return False

            # Suffix match (for domains like ".example.com")
            if no_proxy_host.startswith(".") and host.endswith(no_proxy_host):
                return False

            # Wildcard match
            if no_proxy_host == "*":
                return False

        return True

    def __repr__(self) -> str:
        return (
            f"ProxyConfig(http={self.http_proxy}, "
            f"https={self.https_proxy}, "
            f"no_proxy={self.no_proxy})"
        )


def configure_proxy(
    http_proxy: Optional[str] = None,
    https_proxy: Optional[str] = None,
    no_proxy: Optional[str] = None,
) -> ProxyConfig:
    """
    Configure global proxy settings

    Args:
        http_proxy: HTTP proxy URL
        https_proxy: HTTPS proxy URL
        no_proxy: Hosts to bypass proxy

    Returns:
        ProxyConfig instance
    """
    return ProxyConfig(http_proxy=http_proxy, https_proxy=https_proxy, no_proxy=no_proxy)


def get_proxy_for_httpx() -> Optional[dict]:
    """
    Get proxy configuration for httpx

    Returns:
        Proxy dict or None
    """
    config = ProxyConfig.from_env()
    proxies = config.get_proxies_dict()

    return proxies if proxies else None


def configure_pywebview_proxy(proxy: str) -> None:
    """
    Configure PyWebView to use proxy

    Note: PyWebView uses the system's web engine (WebView2/WebKit/QtWebEngine),
    which may respect environment variables or require OS-level configuration.

    Args:
        proxy: Proxy URL (e.g., "http://proxy:8080")
    """
    # Set environment variables (works for most web engines)
    if proxy.startswith("http://"):
        os.environ["HTTP_PROXY"] = proxy
        os.environ["http_proxy"] = proxy
        os.environ["HTTPS_PROXY"] = proxy
        os.environ["https_proxy"] = proxy
    elif proxy.startswith("https://"):
        os.environ["HTTPS_PROXY"] = proxy
        os.environ["https_proxy"] = proxy

    # Platform-specific configuration
    import platform

    system = platform.system()

    if system == "Windows":
        # EdgeWebView2: Uses system proxy settings by default
        # Can also be configured via environment variables
        pass

    elif system == "Linux":
        # WebKitGTK: Respects HTTP_PROXY environment variable
        pass

    elif system == "Darwin":
        # macOS WebKit: Respects system proxy settings
        pass
