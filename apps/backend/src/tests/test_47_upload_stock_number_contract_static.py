from pathlib import Path


SRC = Path(__file__).resolve().parents[1]
BACKEND = Path(__file__).resolve().parents[2]
FRONTEND = BACKEND.parent / "frontend"


def test_upload_verifies_file_after_write_and_exposes_storage_health():
    source = (SRC / "modules/files/route_file.py").read_text(encoding="utf-8")
    assert "file_path.stat().st_size != total_size" in source
    assert '"railway_volume_mount_path"' in source
    assert "os.access(public_root, os.W_OK)" in source


def test_form_numbers_use_plain_decimal_parser():
    source = (FRONTEND / "lib/module-crud.ts").read_text(encoding="utf-8")
    helper = (FRONTEND / "lib/number.ts").read_text(encoding="utf-8")
    modal = (
        FRONTEND / "components/modules/record-modal/helpers.ts"
    ).read_text(encoding="utf-8")
    assert "parseFormNumber" in source
    assert "export function parseFormNumber" in helper
    assert "formatNumberInputValue" in modal


def test_sales_automation_uses_stocked_branch_resolution():
    client = (
        FRONTEND / "features/automation/client.tsx"
    ).read_text(encoding="utf-8")
    stock = (
        FRONTEND / "features/automation/stock.ts"
    ).read_text(encoding="utf-8")
    assert "buildAutomationStockIndex" in client
    assert "getBranchesWithEnoughAutomationStock" in client
    assert "index.set(key, (index.get(key) ?? 0) + available)" in stock
