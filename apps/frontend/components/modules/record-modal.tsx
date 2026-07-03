"use client";

import { useMemo, useState } from "react";
import { Calculator, X } from "lucide-react";
import type { ModuleColumn, ModuleRow } from "@/types/modules";

type RecordModalProps = {
  open: boolean;
  title: string;
  moduleKey?: string;
  columns: ModuleColumn[];
  onClose: () => void;
  onSubmit: (row: ModuleRow) => void;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RecordModal({
  open,
  title,
  moduleKey,
  columns,
  onClose,
  onSubmit,
}: RecordModalProps) {
  const isTax =
    moduleKey === "taxes" ||
    title.toLowerCase().includes("tax") ||
    title.toLowerCase().includes("taxes");

  const initialValues = useMemo(() => {
    const values: ModuleRow = {};

    columns.forEach((column) => {
      if (column.key.toLowerCase().includes("status")) {
        values[column.key] = "Active";
      } else {
        values[column.key] = "";
      }
    });

    return values;
  }, [columns]);

  const [values, setValues] = useState<ModuleRow>(initialValues);

  const [taxBase, setTaxBase] = useState("10000000");
  const [ppnRate, setPpnRate] = useState("11");
  const [pphRate, setPphRate] = useState("2");

  if (!open) return null;

  const baseAmount = Number(taxBase || 0);
  const ppnAmount = Math.round((baseAmount * Number(ppnRate || 0)) / 100);
  const pphAmount = Math.round((baseAmount * Number(pphRate || 0)) / 100);
  const totalTax = ppnAmount + pphAmount;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isTax) {
      const taxRow: ModuleRow = {
        ...values,
        type: values.type || "PPN + PPh",
        period: values.period || new Date().toLocaleDateString("id-ID"),
        amount: formatRupiah(totalTax),
        due: values.due || "-",
        status: values.status || "Review",
      };

      onSubmit(taxRow);
      onClose();
      return;
    }

    onSubmit(values);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-900 dark:bg-[#050816]"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">
              New Record
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Tambah data {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-500">
              Data sementara masuk ke local table. Nanti bisa diganti ke POST
              API backend.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-[#02040a]"
          >
            <X size={18} />
          </button>
        </div>

        {isTax ? (
          <div className="mb-6 rounded-[1.5rem] border border-blue-100 bg-blue-50 p-5 dark:border-blue-950/50 dark:bg-blue-950/20">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700 text-white">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  Tax Calculator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Hitung PPN, PPh, dan total pajak otomatis.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-black text-slate-500">
                  DPP / Tax Base
                </label>
                <input
                  value={taxBase}
                  onChange={(e) => setTaxBase(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black text-slate-500">
                  PPN %
                </label>
                <input
                  value={ppnRate}
                  onChange={(e) => setPpnRate(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black text-slate-500">
                  PPh %
                </label>
                <input
                  value={pphRate}
                  onChange={(e) => setPphRate(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4 dark:bg-[#02040a]">
                <p className="text-xs font-bold text-slate-500">PPN</p>
                <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                  {formatRupiah(ppnAmount)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 dark:bg-[#02040a]">
                <p className="text-xs font-bold text-slate-500">PPh</p>
                <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                  {formatRupiah(pphAmount)}
                </p>
              </div>

              <div className="rounded-2xl bg-[#0f2a5f] p-4 text-white">
                <p className="text-xs font-bold text-blue-100">Total Tax</p>
                <p className="mt-1 text-lg font-black">
                  {formatRupiah(totalTax)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {columns.map((column) => (
            <div key={column.key}>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {column.label}
              </label>

              <input
                value={values[column.key] ?? ""}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    [column.key]: e.target.value,
                  }))
                }
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-600 dark:border-slate-900 dark:bg-[#02040a] dark:text-white"
                placeholder={`Input ${column.label}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-900 dark:bg-[#02040a] dark:text-slate-400"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-2xl bg-[#0f2a5f] px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Save Record
          </button>
        </div>
      </form>
    </div>
  );
}