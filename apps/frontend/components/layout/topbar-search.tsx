"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Command,
  Search,
  X,
} from "lucide-react";

import { dashboardNavigation } from "@/lib/navigation";

const navigationSearchAliases: Record<string, string[]> = {
  "/dashboard": [
    "beranda",
    "ringkasan",
    "pusat kendali",
  ],
  "/ai-report": [
    "ai",
    "analisis ai",
    "laporan ai",
    "insight",
    "rekomendasi",
  ],
  "/products": [
    "produk",
    "barang",
    "katalog",
  ],
  "/sales-orders": [
    "sales order",
    "pesanan penjualan",
    "penjualan",
    "otomasi penjualan",
  ],
  "/products/categories": [
    "kategori",
    "kategori produk",
  ],
  "/products/stock": [
    "stok",
    "persediaan",
    "gudang",
    "kontrol stok",
  ],
  "/products/suppliers": [
    "supplier",
    "pemasok",
    "vendor",
  ],
  "/finance": [
    "keuangan",
    "ringkasan keuangan",
  ],
  "/finance/transactions": [
    "transaksi",
    "transaksi keuangan",
    "pemasukan",
    "pengeluaran",
    "kas",
  ],
  "/finance/invoices": [
    "invoice",
    "faktur",
    "tagihan",
  ],
  "/finance/cashflow": [
    "cash flow",
    "arus kas",
    "aliran kas",
  ],
  "/finance/taxes": [
    "tax",
    "pajak",
    "perpajakan",
  ],
  "/finance/ledger": [
    "ledger",
    "buku besar",
    "jurnal umum",
    "general ledger",
  ],
  "/hr": [
    "sdm",
    "sumber daya manusia",
    "human resource",
  ],
  "/hr/employees": [
    "pegawai",
    "karyawan",
    "staff",
  ],
  "/hr/attendance": [
    "absensi",
    "kehadiran",
    "presensi",
  ],
  "/hr/leave": [
    "cuti",
    "izin",
    "leave",
  ],
  "/hr/kpi": [
    "performa",
    "kinerja",
    "penilaian",
  ],
  "/hr/payroll": [
    "gaji",
    "penggajian",
    "payroll",
  ],
  "/crm": [
    "pelanggan",
    "customer relationship",
  ],
  "/crm/leads": [
    "prospek",
    "calon pelanggan",
  ],
  "/crm/customers": [
    "pelanggan",
    "customer",
    "klien",
  ],
  "/crm/pipeline": [
    "sales pipeline",
    "alur penjualan",
  ],
  "/crm/campaigns": [
    "kampanye",
    "promosi",
    "marketing",
  ],
  "/companies": [
    "perusahaan",
    "company",
    "tenant",
  ],
  "/users": [
    "pengguna",
    "user",
    "role",
    "hak akses",
  ],
  "/settings": [
    "pengaturan",
    "konfigurasi",
    "setting",
  ],
};

export type NavigationCommand = {
  title: string;
  group: string;
  href: string;
  keywords: string;
  icon: (typeof dashboardNavigation)[number]["items"][number]["icon"];
};

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ");
}

export const navigationCommands: NavigationCommand[] = dashboardNavigation.flatMap(
  (group) =>
    group.items.map((item) => {
      const aliases = navigationSearchAliases[item.href] ?? [];

      return {
        title: item.title,
        group: group.group,
        href: item.href,
        keywords: normalizeSearchText(
          [
            group.group,
            item.title,
            item.href,
            ...aliases,
          ].join(" "),
        ),
        icon: item.icon,
      };
    }),
);

export function filterNavigationCommands(
  query: string,
): NavigationCommand[] {
  const normalized = normalizeSearchText(query);

  if (!normalized) return navigationCommands.slice(0, 10);

  const queryTokens = normalized.split(" ").filter(Boolean);

  return navigationCommands
    .filter((command) =>
      queryTokens.every((token) => command.keywords.includes(token)),
    )
    .sort((left, right) => {
      const leftTitle = normalizeSearchText(left.title);
      const rightTitle = normalizeSearchText(right.title);
      const leftExact = leftTitle === normalized ? 1 : 0;
      const rightExact = rightTitle === normalized ? 1 : 0;

      if (leftExact !== rightExact) return rightExact - leftExact;

      const leftStarts = left.keywords.startsWith(normalized) ? 1 : 0;
      const rightStarts = right.keywords.startsWith(normalized) ? 1 : 0;

      return rightStarts - leftStarts;
    })
    .slice(0, 12);
}

export function TopbarSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => filterNavigationCommands(query), [query]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }

      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);

    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (activeIndex < results.length) return;
    setActiveIndex(Math.max(0, results.length - 1));
  }, [activeIndex, results.length]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka pencarian global"
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-50 px-3 text-slate-600 shadow-sm transition hover:border-indigo-200 hover:from-indigo-100 hover:text-indigo-700 xl:min-w-64 dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-950 dark:text-slate-300 dark:hover:border-indigo-900"
      >
        <Search size={17} className="shrink-0" />
        <span className="hidden min-w-0 flex-1 truncate text-left text-sm font-semibold xl:block">
          Cari menu atau modul...
        </span>
        <span className="hidden items-center gap-1 rounded-lg border border-indigo-100 bg-white/80 px-1.5 py-1 text-[10px] font-black text-slate-400 xl:flex dark:border-slate-700 dark:bg-slate-950">
          <Command size={11} />K
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[140] flex items-start justify-center bg-slate-950/55 px-3 pt-[max(5rem,12vh)] backdrop-blur-sm">
              <button
                type="button"
                aria-label="Tutup pencarian"
                className="absolute inset-0 cursor-default"
                onClick={() => setOpen(false)}
              />
              <section className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/20 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.38)] dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <Search size={19} className="shrink-0 text-indigo-500" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setActiveIndex((current) =>
                          Math.min(results.length - 1, current + 1),
                        );
                      }

                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setActiveIndex((current) => Math.max(0, current - 1));
                      }

                      if (event.key === "Enter" && results[activeIndex]) {
                        event.preventDefault();
                        navigate(results[activeIndex].href);
                      }
                    }}
                    placeholder="Cari transaksi, stok, pajak, payroll..."
                    className="h-11 min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Tutup"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {results.length > 0 ? (
                    results.map((command, index) => {
                      const Icon = command.icon;
                      const active = index === activeIndex;

                      return (
                        <button
                          key={command.href}
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => navigate(command.href)}
                          className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
                            active
                              ? "bg-indigo-600 text-white"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              active
                                ? "bg-white/15"
                                : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
                            }`}
                          >
                            <Icon size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black">
                              {command.title}
                            </span>
                            <span
                              className={`block truncate text-xs ${
                                active ? "text-indigo-100" : "text-slate-400"
                              }`}
                            >
                              {command.group} · {command.href}
                            </span>
                          </span>
                          <ArrowRight size={17} className="shrink-0 opacity-70" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-5 py-12 text-center">
                      <p className="font-black text-slate-900 dark:text-white">
                        Menu tidak ditemukan
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Coba kata kunci seperti transaksi, stok, invoice, pajak,
                        atau payroll.
                      </p>
                    </div>
                  )}
                </div>

                <footer className="flex flex-wrap items-center gap-4 border-t border-slate-200 px-4 py-3 text-[11px] font-bold text-slate-400 dark:border-slate-800">
                  <span>Up/Down navigasi</span>
                  <span>Enter buka</span>
                  <span>Esc tutup</span>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
