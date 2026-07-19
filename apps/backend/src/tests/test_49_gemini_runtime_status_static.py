from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def test_gemini_status_route_is_available_and_protected():
    source = (BACKEND_ROOT / "ai" / "route_ai.py").read_text(encoding="utf-8")
    assert '"/provider/status"' in source
    assert "GeminiProviderStatusResponse" in source
    assert "require_permission(AI_ANALYTICS_VIEW)" in source
    assert "await gemini_provider.probe()" in source


def test_runtime_config_supports_both_key_names_and_normalizes_values():
    source = (BACKEND_ROOT / "core" / "config.py").read_text(encoding="utf-8")
    assert "GOOGLE_API_KEY: str | None = None" in source
    assert "def effective_gemini_api_key" in source
    assert "GEMINI_API_KEY=" in source
    assert "gemini-3.1-flash-lite-preview" in source
    assert '"gemini-3.1-flash-lite"' in source


def test_provider_uses_effective_key_and_exposes_safe_probe():
    source = (BACKEND_ROOT / "ai" / "gemini_provider.py").read_text(
        encoding="utf-8"
    )
    assert "settings.effective_gemini_api_key" in source
    assert "def configuration_status" in source
    assert "async def probe" in source
    assert "key_fingerprint" in source
    assert "api_key=api_key" in source
