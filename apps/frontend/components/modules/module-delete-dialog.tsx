"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import type { ModuleRow } from "@/types/modules";

import {
  getRecordSubtitle,
  getRecordTitle,
} from "./module-record-utils";

export function ModuleDeleteDialog({
  open,
  moduleTitle,
  row,
  isDeleting,
  onClose,
  onConfirm,
  error,
}: {
  open: boolean;
  moduleTitle: string;
  row: ModuleRow | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  error?: string | null;
}) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleting, onClose, open]);

  if (!open || !row) return null;

  const recordTitle = getRecordTitle(row);
  const recordSubtitle = getRecordSubtitle(row);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !isDeleting) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-rose-200/80 bg-white shadow-2xl shadow-rose-950/20 dark:border-rose-950 dark:bg-[#050816]">
        <div className="relative overflow-hidden border-b border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-6 dark:border-rose-950 dark:from-rose-950/40 dark:via-[#050816] dark:to-amber-950/20">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-rose-200/30 blur-3xl dark:bg-rose-700/10" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-900/20">
                <Trash2 size={23} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600 dark:text-rose-400">
                  Dangerous Action
                </p>
                <h2
                  id="delete-dialog-title"
                  className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white"
                >
                  Hapus {moduleTitle}?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Data akan dihapus dari sistem dan tidak dapat dipulihkan melalui tampilan ini.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-white/80 text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-950 dark:bg-[#02040a] dark:hover:bg-slate-900"
              aria-label="Tutup konfirmasi delete"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-900 dark:bg-[#02040a]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Record yang akan dihapus
            </p>
            <p className="mt-2 break-words text-lg font-black text-slate-950 dark:text-white">
              {recordTitle}
            </p>
            <p className="mt-1 break-words text-sm text-slate-500">
              {recordSubtitle}
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-200">
            <ShieldAlert size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black">Periksa relasi data terlebih dahulu</p>
              <p className="mt-1 text-xs leading-5 opacity-80">
                Record yang sudah digunakan transaksi, invoice, payroll, atau modul lain dapat ditolak backend demi menjaga integritas data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle size={15} />
            Pastikan record yang dipilih sudah benar.
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/80 p-5 dark:border-slate-900 dark:bg-[#02040a]/80 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-[#050816] dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-lg shadow-rose-900/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Trash2 size={17} />
            )}
            {isDeleting ? "Menghapus..." : "Ya, Hapus Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
