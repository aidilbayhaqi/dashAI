# DashAI Agent Demo

Implementasi ini sengaja menambah kemampuan AI tanpa refactor besar pada modul ERP yang sudah berjalan.

## Kemampuan

1. **Business Analyst** — membaca dashboard yang sudah difilter oleh company, branch, dan permission.
2. **Invoice Assistant** — mengubah instruksi bahasa Indonesia menjadi draft invoice, menampilkan preview, lalu membuat invoice `draft` setelah konfirmasi.
3. **Financial Report Assistant** — memilih laba rugi, arus kas, atau neraca; menampilkan parameter; lalu memakai service finance existing setelah konfirmasi.
4. **Rule fallback** — ketika Gemini belum dikonfigurasi, kuota habis, model tidak tersedia, atau timeout, analisis dan parser lokal menjaga demo tetap dapat digunakan.

## Guardrails

- AI tidak menerima `company_id` atau `branch_id` sebagai tool parameter.
- Scope ditentukan backend dari user aktif.
- Data sensitif dan identifier internal dibuang sebelum konteks dikirim ke provider.
- Invoice dan report tidak dibuat pada tahap ekstraksi.
- Confirmation endpoint memerlukan permission finance terkait.
- Confirmation endpoint memakai `Idempotency-Key`.
- Action token terikat pada user, company, branch, jenis aksi, dan waktu kedaluwarsa.
- Nilai invoice dihitung ulang dan divalidasi backend.

## Konfigurasi minimum

```env
AI_AGENT_ENABLED=true
AI_AGENT_ALLOW_RULE_FALLBACK=true
AI_AGENT_ACTIONS_ENABLED=true
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
AI_ACTION_TOKEN_TTL_SECONDS=900
AI_INVOICE_DEFAULT_DUE_DAYS=14
```

Tanpa `GEMINI_API_KEY`, UI tetap dapat didemokan menggunakan rule fallback. Untuk demo Gemini asli, isi API key dari Google AI Studio.

## Contoh instruksi

Invoice:

```text
Buat invoice untuk PT Maju Bersama senilai 5 juta, PPN 11%, jatuh tempo 14 hari
```

Laporan:

```text
Buat laporan laba rugi untuk periode bulan ini
```

## Endpoint

```text
POST /api/v1/ai/analytics/agent/chat
POST /api/v1/ai/analytics/agent/invoice/draft
POST /api/v1/ai/analytics/agent/invoice/confirm
POST /api/v1/ai/analytics/agent/report/draft
POST /api/v1/ai/analytics/agent/report/confirm
```

## Pola reusable

- `gemini_provider.py`: seluruh ketergantungan SDK Google dan klasifikasi error.
- `agent_action_schema.py`: kontrak draft/confirm yang dapat dipakai frontend lain.
- `action_token.py`: approval token singkat tanpa menambah migration database.
- `agent_action_service.py`: orkestrasi AI dan pemanggilan service domain existing.
- Modul finance tetap menjadi sumber kebenaran untuk kalkulasi dan persistensi.
