from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from src.ai.agent_action_schema import FinancialReportType


class ReportExtraction(BaseModel):
    report_type: Literal[
        "profit_loss",
        "cashflow",
        "balance_sheet",
    ]


REPORT_EXTRACTION_INSTRUCTION = """
Klasifikasikan permintaan laporan keuangan menjadi tepat satu jenis:
profit_loss untuk laba rugi, cashflow untuk arus kas, atau balance_sheet
untuk neraca. Jangan menghasilkan jenis lain.
"""


def fallback_report_type(instruction: str) -> FinancialReportType | None:
    normalized = instruction.lower()
    if any(keyword in normalized for keyword in ("cashflow", "cash flow", "arus kas")):
        return "cashflow"
    if any(keyword in normalized for keyword in ("neraca", "balance sheet", "posisi keuangan")):
        return "balance_sheet"
    if any(keyword in normalized for keyword in ("laba rugi", "profit loss", "pendapatan", "beban")):
        return "profit_loss"
    return None


def build_report_title(
    *,
    report_type: FinancialReportType,
    start_date,
    end_date,
    report_date,
) -> str:
    if report_type == "balance_sheet":
        return f"Neraca per {report_date:%d/%m/%Y}"

    title = (
        "Laporan Laba Rugi"
        if report_type == "profit_loss"
        else "Laporan Arus Kas"
    )
    return f"{title} {start_date:%d/%m/%Y} - {end_date:%d/%m/%Y}"
