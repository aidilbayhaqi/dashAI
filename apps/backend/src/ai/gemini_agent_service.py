import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.gemini_schema import (
    GeminiAgentChatResponse,
)
from src.core.config import settings
from src.modules.dashboard.service_dashboard import (
    DashboardPeriod,
    build_dashboard_summary,
    filter_dashboard_summary_for_permissions,
)
from src.security.dependencies import CurrentUser


logger = logging.getLogger(__name__)


GEMINI_SYSTEM_INSTRUCTION = """
Anda adalah DashAI ERP Analyst.

Tujuan Anda adalah menjelaskan kondisi bisnis
dengan bahasa Indonesia yang profesional,
ringkas, dan mudah dipahami oleh pemilik usaha.

ATURAN DATA:

1. Gunakan hanya informasi dari ERP tool.
2. Jangan mengarang angka atau kondisi bisnis.
3. Jangan menyebut:
   - nama tabel database;
   - nama kolom database;
   - UUID;
   - primary key;
   - endpoint API;
   - query SQL;
   - nama fungsi atau tool internal;
   - source_module;
   - source_entity_type;
   - struktur JSON internal.
4. Jangan menulis kalimat seperti:
   "berdasarkan data database",
   "berdasarkan field",
   atau "berdasarkan status internal".
5. Ubah istilah teknis menjadi bahasa bisnis
   yang mudah dipahami.
6. Nilai uang harus menggunakan format Rupiah.
7. Jangan menampilkan angka yang tidak relevan.
8. Jangan menjelaskan proses internal aplikasi.

ATURAN FORMAT JAWABAN:

Gunakan struktur berikut:

## Ringkasan

Maksimal dua paragraf singkat mengenai kondisi
bisnis secara keseluruhan.

## Hal yang Perlu Diperhatikan

Maksimal tiga poin risiko atau kondisi penting.

## Rekomendasi

Maksimal tiga langkah yang dapat dilakukan.

Gunakan Markdown dengan heading, bold, dan daftar.
Jangan menulis paragraf yang terlalu panjang.
Jangan mengulang data yang sama.

ATURAN KEAMANAN:

1. Anda hanya memiliki akses read-only.
2. Jangan mencoba mengakses company atau branch lain.
3. Jangan mengubah transaksi, stok, invoice,
   payroll, CRM, atau automation.
4. Jangan mengklaim telah melakukan perubahan data.
5. Semua keputusan penting membutuhkan review manusia.
"""


async def run_gemini_erp_agent(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    company_id: UUID,
    branch_id: UUID | None,
    allowed_branch_ids: set[UUID] | None,
    period: DashboardPeriod,
    question: str,
) -> GeminiAgentChatResponse:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY belum dikonfigurasi.",
        )

    summary = await build_dashboard_summary(
        db=db,
        company_id=company_id,
        exact_branch_id=branch_id,
        allowed_branch_ids=allowed_branch_ids,
        period=period,
    )

    filtered_summary = (
        filter_dashboard_summary_for_permissions(
            summary,
            permissions=current_user.permissions,
            is_superuser=current_user.is_superuser,
        )
    )

    tools_used: list[str] = []

    snapshot = {
        "generated_at": (
            filtered_summary.generated_at.isoformat()
        ),
        "period": filtered_summary.period.model_dump(
            mode="json"
        ),
        "scope": filtered_summary.scope.model_dump(
            mode="json"
        ),
        "revenue_basis": (
            filtered_summary.revenue_basis
        ),
        "expense_basis": (
            filtered_summary.expense_basis
        ),
        "kpis": filtered_summary.kpis.model_dump(
            mode="json"
        ),
        "cashflow_series": [
            item.model_dump(mode="json")
            for item in (
                filtered_summary.cashflow_series[-31:]
            )
        ],
        "crm_pipeline": [
            item.model_dump(mode="json")
            for item in filtered_summary.crm_pipeline
        ],
    }

    alerts = [
        item.model_dump(mode="json")
        for item in (
            filtered_summary.operational_alerts
        )
    ]

    def get_business_snapshot() -> dict[str, Any]:
        """
        Mengambil ringkasan metrik ERP untuk company,
        branch, periode, dan permission pengguna aktif.

        Returns:
            Ringkasan KPI, cashflow, CRM pipeline,
            revenue basis, dan expense basis.
        """

        tools_used.append("get_business_snapshot")
        return snapshot

    def get_operational_alerts() -> dict[str, Any]:
        """
        Mengambil alert operasional ERP sesuai company,
        branch, periode, dan permission pengguna aktif.

        Returns:
            Daftar alert stok, invoice, finance, CRM,
            HR, dan automation yang tersedia.
        """

        tools_used.append("get_operational_alerts")

        return {
            "period": (
                filtered_summary.period.model_dump(
                    mode="json"
                )
            ),
            "alerts": alerts,
        }

    client = genai.Client(
        api_key=settings.GEMINI_API_KEY,
    )

    config = types.GenerateContentConfig(
        system_instruction=(
            GEMINI_SYSTEM_INSTRUCTION
        ),
        tools=[
            get_business_snapshot,
            get_operational_alerts,
        ],
        temperature=(
            settings.GEMINI_AGENT_TEMPERATURE
        ),
        max_output_tokens=(
            settings.GEMINI_AGENT_MAX_OUTPUT_TOKENS
        ),
    )

    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=question,
                config=config,
            ),
            timeout=(
                settings.GEMINI_AGENT_TIMEOUT_SECONDS
            ),
        )

    except TimeoutError as exc:
        logger.warning(
            "Gemini timeout user=%s company=%s",
            current_user.user_id,
            company_id,
        )

        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Gemini melewati batas waktu.",
        ) from exc

    except Exception as exc:
        logger.exception(
            "Gemini agent failed user=%s company=%s",
            current_user.user_id,
            company_id,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "Gemini sedang tidak tersedia "
                "atau kuota Free Tier telah habis."
            ),
        ) from exc

    answer = (response.text or "").strip()

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Gemini menghasilkan jawaban kosong."
            ),
        )

    unique_tools = list(
        dict.fromkeys(tools_used)
    )

    if not unique_tools:
        logger.warning(
            "Gemini answered without ERP tool "
            "user=%s company=%s",
            current_user.user_id,
            company_id,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Gemini tidak menggunakan ERP tool. "
                "Jawaban ditolak untuk keamanan."
            ),
        )

    evidence = _build_evidence(
        snapshot=snapshot,
        alerts=alerts,
    )

    suggested_links = _build_suggested_links(
        alerts=alerts,
    )

    return GeminiAgentChatResponse(
        generated_at=datetime.now(timezone.utc),
        model=settings.GEMINI_MODEL,
        company_id=company_id,
        branch_id=branch_id,
        question=question,
        answer=answer,
        confidence=(
            "high"
            if unique_tools
            else "low"
        ),
        tools_used=unique_tools,
        evidence=evidence,
        suggested_links=suggested_links,
        needs_human_review=True,
    )

def _format_rupiah(
    value: Any,
) -> str:
    try:
        numeric_value = float(value)
    except (
        TypeError,
        ValueError,
    ):
        return str(value)

    formatted = (
        f"{numeric_value:,.0f}"
        .replace(",", ".")
    )

    return f"Rp{formatted}"

def _build_evidence(
    *,
    snapshot: dict[str, Any],
    alerts: list[dict[str, Any]],
) -> list[str]:
    evidence: list[str] = []

    kpis = snapshot.get("kpis")

    if isinstance(kpis, dict):
        labels = {
            "revenue": "Pendapatan",
            "expense": "Pengeluaran",
            "net_cashflow": "Arus kas bersih",
            "outstanding_invoice": (
                "Piutang belum dibayar"
            ),
        }

        for key, label in labels.items():
            value = kpis.get(key)

            if value is None:
                continue

            evidence.append(
                f"{label}: {_format_rupiah(value)}"
            )

    if alerts:
        evidence.append(
            f"Alert operasional aktif: "
            f"{len(alerts)}"
        )

    return evidence[:8]
    
def _build_suggested_links(
    *,
    alerts: list[dict[str, Any]],
) -> list[str]:
    links: list[str] = [
        "/dashboard",
    ]

    for alert in alerts:
        href = alert.get("href")

        if (
            isinstance(href, str)
            and href.startswith("/")
        ):
            links.append(href)

    return list(
        dict.fromkeys(links)
    )[:8]