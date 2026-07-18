from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from pydantic import BaseModel, Field


MONEY_QUANT = Decimal("0.01")
SAFE_AI_INVOICE_NOTE = "Invoice dibuat melalui DashAI Invoice Assistant."


class InvoiceExtraction(BaseModel):
    client_name: str | None = Field(default=None, max_length=200)
    subtotal_amount: Decimal | None = Field(default=None, gt=0)
    tax_rate_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    due_days: int | None = Field(default=None, ge=0, le=180)
    notes: str | None = Field(default=None, max_length=500)


INVOICE_EXTRACTION_INSTRUCTION = """
Ekstrak instruksi invoice berbahasa Indonesia menjadi data terstruktur.
Jangan mengarang client atau nominal. Nominal harus berupa Rupiah numerik.
Jika pajak tidak disebutkan, gunakan 0. Jika jatuh tempo tidak disebutkan,
kembalikan null. Notes harus singkat, generik, dan tidak menyalin data sensitif
atau seluruh prompt pengguna.
"""


def money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def parse_indonesian_amount(raw_value: str, suffix: str | None) -> Decimal | None:
    normalized = raw_value.strip().lower().replace(" ", "")
    normalized_suffix = suffix.lower() if suffix else None
    multiplier = Decimal("1")

    if normalized_suffix in {"juta", "jt"}:
        multiplier = Decimal("1000000")
    elif normalized_suffix in {"ribu", "rb", "k"}:
        multiplier = Decimal("1000")

    try:
        if multiplier != 1:
            normalized = normalized.replace(".", "").replace(",", ".")
            return money(Decimal(normalized) * multiplier)

        # Rupiah biasanya bilangan bulat. Pemisah satu atau dua digit di akhir
        # dianggap desimal; selain itu titik/koma dianggap pemisah ribuan.
        if re.fullmatch(r"\d+[,.]\d{1,2}", normalized):
            normalized = normalized.replace(",", ".")
        else:
            normalized = normalized.replace(".", "").replace(",", "")

        return money(Decimal(normalized))
    except (InvalidOperation, ValueError):
        return None


_AMOUNT_VALUE = r"(?P<amount>\d[\d.,]*)(?:\s*(?P<suffix>juta|jt|ribu|rb|k))?"


def _find_amount(compact: str) -> re.Match[str] | None:
    """Find an invoice amount without accidentally using dates or tax rates."""

    patterns = (
        # Highest confidence: an explicit business amount keyword.
        rf"(?:senilai|sebesar|sejumlah|(?:dengan\s+)?nominal|total(?:nya)?(?:\s+sebesar)?)\s+(?:rp\.?\s*)?{_AMOUNT_VALUE}",
        # Explicit Rupiah marker.
        rf"(?:rp\.?\s*){_AMOUNT_VALUE}",
        # Indonesian scale suffix, for example 5 juta or 750 ribu.
        r"(?P<amount>\d[\d.,]*)\s*(?P<suffix>juta|jt|ribu|rb|k)\b",
    )

    for pattern in patterns:
        match = re.search(pattern, compact, re.IGNORECASE)
        if match:
            return match

    return None



def _find_client(compact: str) -> str | None:
    # Stop only at amount/tax/due-date markers that are followed by the
    # expected value. This keeps names such as "PT Nominal" intact.
    stop = (
        r"(?=\s+(?:senilai|sebesar|sejumlah)\b"
        r"|\s+(?:dengan\s+)?nominal\s+(?:rp\.?\s*)?\d"
        r"|\s+total(?:nya)?(?:\s+sebesar)?\s+(?:rp\.?\s*)?\d"
        r"|\s+rp\.?\s*\d"
        r"|\s+\d[\d.,]*\s*(?:juta|jt|ribu|rb|k)\b"
        r"|\s+(?:ppn|pajak)\b"
        r"|\s+(?:jatuh\s*tempo|tempo)\b"
        r"|[,.;]|$)"
    )
    match = re.search(
        rf"(?:untuk|kepada|client|pelanggan)\s+(.+?){stop}",
        compact,
        re.IGNORECASE,
    )
    if not match:
        return None

    client_name = match.group(1).strip(" -")
    return client_name or None


def fallback_invoice_extraction(instruction: str) -> InvoiceExtraction:
    compact = " ".join(instruction.strip().split())
    amount_match = _find_amount(compact)
    subtotal = (
        parse_indonesian_amount(
            amount_match.group("amount"),
            amount_match.group("suffix"),
        )
        if amount_match
        else None
    )

    tax_match = re.search(
        r"(?:pajak|ppn)\s*(\d+(?:[.,]\d+)?)\s*%?",
        compact,
        re.IGNORECASE,
    )
    tax_rate = Decimal("0")
    if tax_match:
        tax_rate = Decimal(tax_match.group(1).replace(",", "."))

    due_match = re.search(
        r"(?:jatuh\s*tempo|tempo)\s*(?:dalam\s+)?(\d+)\s*hari",
        compact,
        re.IGNORECASE,
    )

    return InvoiceExtraction(
        client_name=_find_client(compact),
        subtotal_amount=subtotal,
        tax_rate_percent=tax_rate,
        due_days=int(due_match.group(1)) if due_match else None,
        notes=SAFE_AI_INVOICE_NOTE,
    )
