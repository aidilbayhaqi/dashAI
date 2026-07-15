from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def test_gemini_agent_exposes_read_only_tools():
    source = (
        BACKEND_ROOT
        / "src"
        / "ai"
        / "gemini_agent_service.py"
    ).read_text(encoding="utf-8")

    assert "get_business_snapshot" in source
    assert "get_operational_alerts" in source

    forbidden_tools = [
        "create_transaction",
        "update_stock",
        "pay_invoice",
        "delete_record",
        "approve_payroll",
        "run_automation",
    ]

    for tool_name in forbidden_tools:
        assert tool_name not in source


def test_tenant_scope_is_not_a_tool_parameter():
    source = (
        BACKEND_ROOT
        / "src"
        / "ai"
        / "gemini_agent_service.py"
    ).read_text(encoding="utf-8")

    assert (
        "def get_business_snapshot()"
        in source
    )
    assert (
        "def get_operational_alerts()"
        in source
    )


def test_agent_rejects_answer_without_tool():
    source = (
        BACKEND_ROOT
        / "src"
        / "ai"
        / "gemini_agent_service.py"
    ).read_text(encoding="utf-8")

    assert "if not unique_tools" in source
    assert (
        "Gemini tidak menggunakan ERP tool"
        in source
    )