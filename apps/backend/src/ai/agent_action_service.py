"""Compatibility facade for AI-assisted business actions.

The implementation is split by responsibility so invoice parsing, invoice
execution, and financial report generation can be reused independently.
Existing imports keep working through this module.
"""

from src.ai.invoice_action_service import (
    build_invoice_draft,
    confirm_invoice_draft,
)
from src.ai.invoice_parser import (
    fallback_invoice_extraction as _fallback_invoice_extraction,
    parse_indonesian_amount as _parse_indonesian_amount,
)
from src.ai.report_action_service import (
    build_report_draft,
    confirm_report_draft,
)
from src.ai.report_parser import fallback_report_type as _fallback_report_type


__all__ = [
    "build_invoice_draft",
    "confirm_invoice_draft",
    "build_report_draft",
    "confirm_report_draft",
]
