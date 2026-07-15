"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  Sparkles,
  Trash2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CompanyScopeFilter } from "@/components/modules/company-scope-filter";
import {
  FeedbackToast,
  type FeedbackToastState,
} from "@/components/ui/feedback-toast";
import {
  getCurrentCompanyId,
  isCurrentUserSuperAdmin,
} from "@/lib/auth-scope";
import {
  ALL_COMPANIES_VALUE,
  useCompanyScope,
} from "@/lib/company-scope";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";

import {
  confirmSalesOrderPayment,
  createSalesOrder,
  getAutomationContext,
  getAutomationEvents,
  getAutomationMonitoring,
  getSalesOrders,
  processSalesOrder,
} from "./api";
import {
  getCompatibleBranchIds,
  isProductAvailableInBranch,
} from "@/lib/product-branch";
import type {
  AutomationContext,
  AutomationMonitoringRow,
  DomainEvent,
  SalesOrder,
} from "./types";
import { AutomationMonitoringTable } from "./monitoring-table";
import { makeAutomationLine, type AutomationFormLine } from "./form-utils";
import {
  AutomationEmptyState,
  AutomationFlowNode,
  automationStatusClass,
  formatAutomationDate,
  formatAutomationMoney,
} from "./ui";

function extractError(error: unknown) {
  return getApiErrorMessage(error);
}

export function SalesAutomationClient() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompanyScope();
  const currentCompanyId = getCurrentCompanyId();
  const isSuperAdmin = isCurrentUserSuperAdmin();
  const companyId =
    currentCompanyId ||
    (selectedCompanyId !== ALL_COMPANIES_VALUE ? selectedCompanyId : null);

  const [customerName, setCustomerName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [autoProcess, setAutoProcess] = useState(true);
  const [lines, setLines] = useState<AutomationFormLine[]>([makeAutomationLine()]);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<FeedbackToastState>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const contextQuery = useQuery({
    queryKey: ["automation", "context", companyId],
    queryFn: () => getAutomationContext(companyId as string),
    enabled: Boolean(companyId),
    staleTime: 30_000,
  });

  const ordersQuery = useQuery({
    queryKey: ["automation", "orders", companyId],
    queryFn: () => getSalesOrders(companyId as string),
    enabled: Boolean(companyId),
    refetchInterval: 15_000,
  });

  const eventsQuery = useQuery({
    queryKey: ["automation", "events", companyId],
    queryFn: () => getAutomationEvents(companyId as string),
    enabled: Boolean(companyId),
    refetchInterval: 10_000,
  });


  const monitoringQuery = useQuery({
    queryKey: ["automation", "monitoring", companyId],
    queryFn: () => getAutomationMonitoring(companyId as string),
    enabled: Boolean(companyId),
    refetchInterval: 10_000,
  });

  const context: AutomationContext = contextQuery.data ?? {
    products: [],
    stocks: [],
    branches: [],
  };
  const rawOrders = useMemo(
    () => ordersQuery.data ?? [],
    [ordersQuery.data],
  );
  const orders = useMemo(
    () =>
      [...rawOrders].sort(
        (left, right) =>
          new Date(right.updated_at).getTime() -
          new Date(left.updated_at).getTime()
      ),
    [rawOrders]
  );
  const events = eventsQuery.data ?? [];
  const monitoringRows = monitoringQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: createSalesOrder,
    onSuccess: async (order, variables) => {
      setCustomerName("");
      setDueDate("");
      setNotes("");
      setLines([makeAutomationLine()]);
      setFormError("");
      setToast({
        type: "success",
        title: variables.auto_process
          ? "Sales automation berhasil"
          : "Sales Order disimpan sebagai draft",
        description: variables.auto_process
          ? `${order.order_no} berhasil membuat transaksi dan invoice secara otomatis.`
          : `${order.order_no} siap diproses ketika sudah disetujui.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["automation"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
        queryClient.invalidateQueries({ queryKey: ["finance"] }),
      ]);
    },
    onError: (error) => {
      const message = extractError(error);
      setFormError(message);
      setToast({
        type: "error",
        title: "Sales automation gagal",
        description: message,
      });
    },
  });

  const processMutation = useMutation({
    mutationFn: processSalesOrder,
    onMutate: (variables) => setProcessingOrderId(variables.orderId),
    onSuccess: async (order) => {
      setToast({
        type: "success",
        title: "Draft berhasil diproses",
        description: `${order.order_no} sudah menghasilkan transaksi dan invoice.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["automation"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
        queryClient.invalidateQueries({ queryKey: ["finance"] }),
      ]);
    },
    onError: (error) =>
      setToast({
        type: "error",
        title: "Draft gagal diproses",
        description: extractError(error),
      }),
    onSettled: () => setProcessingOrderId(null),
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: confirmSalesOrderPayment,
    onMutate: (variables) => setConfirmingOrderId(variables.orderId),
    onSuccess: async (result) => {
      setToast({
        type: "success",
        title: "Pembayaran berhasil dikonfirmasi",
        description: `${result.invoice_no ?? result.order_no} telah ditandai lunas.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["automation"] }),
        queryClient.invalidateQueries({ queryKey: ["finance"] }),
      ]);
    },
    onError: (error) =>
      setToast({
        type: "error",
        title: "Konfirmasi pembayaran gagal",
        description: extractError(error),
      }),
    onSettled: () => setConfirmingOrderId(null),
  });

  const metrics = useMemo(() => {
    const totalValue = orders.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );
    return {
      total: orders.length,
      fulfilled: orders.filter((order) => order.status === "fulfilled").length,
      draft: orders.filter((order) => order.status === "draft").length,
      totalValue,
    };
  }, [orders]);

  const stockIndex = useMemo(() => {
    const map = new Map<string, number>();
    context.stocks.forEach((stock) => {
      const available =
        Number(stock.quantity_on_hand || 0) - Number(stock.reserved_quantity || 0);
      map.set(`${stock.branch_id}:${stock.product_id}`, available);
    });
    return map;
  }, [context.stocks]);

  const allBranchIds = useMemo(
    () => context.branches.map((branch) => branch.id),
    [context.branches],
  );

  const selectedProductIds = useMemo(
    () => lines.map((line) => line.product_id).filter(Boolean),
    [lines],
  );

  const compatibleBranchIds = useMemo(
    () => getCompatibleBranchIds(
      context.products,
      context.stocks,
      allBranchIds,
      selectedProductIds,
    ),
    [allBranchIds, context.products, context.stocks, selectedProductIds],
  );

  const compatibleBranches = useMemo(
    () => context.branches.filter((branch) => compatibleBranchIds.includes(branch.id)),
    [compatibleBranchIds, context.branches],
  );

  const productsForSelectedBranch = useMemo(() => {
    if (!branchId) {
      return context.products.filter((product) =>
        getCompatibleBranchIds(
          context.products,
          context.stocks,
          allBranchIds,
          [product.id],
        ).length > 0
      );
    }

    return context.products.filter((product) =>
      isProductAvailableInBranch(
        product,
        branchId,
        context.stocks,
        allBranchIds,
      )
    );
  }, [allBranchIds, branchId, context.products, context.stocks]);

  useEffect(() => {
    if (compatibleBranches.length === 1 && !branchId) {
      setBranchId(compatibleBranches[0].id);
      return;
    }

    if (branchId && !compatibleBranchIds.includes(branchId)) {
      setBranchId("");
    }
  }, [branchId, compatibleBranchIds, compatibleBranches]);

  const estimatedTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const product = context.products.find(
        (candidate) => candidate.id === line.product_id
      );
      const price = Number(line.unit_price || product?.selling_price || 0);
      const quantity = Number(line.quantity || 0);
      const discount = Number(line.discount_amount || 0);
      const tax = Number(line.tax_amount || 0);
      return sum + Math.max(price * quantity - discount + tax, 0);
    }, 0);
  }, [context.products, lines]);

  function updateLine(localId: string, patch: Partial<AutomationFormLine>) {
    setLines((current) =>
      current.map((line) =>
        line.localId === localId ? { ...line, ...patch } : line
      )
    );
  }

  function removeLine(localId: string) {
    setLines((current) =>
      current.length === 1
        ? current
        : current.filter((line) => line.localId !== localId)
    );
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!companyId) {
      setFormError("Pilih company terlebih dahulu.");
      return;
    }
    if (!branchId || !customerName.trim()) {
      setFormError("Customer dan branch wajib diisi.");
      return;
    }
    if (lines.some((line) => !line.product_id || Number(line.quantity) <= 0)) {
      setFormError("Setiap item harus memiliki produk dan quantity yang valid.");
      return;
    }

    const productIds = lines.map((line) => line.product_id);
    if (new Set(productIds).size !== productIds.length) {
      setFormError("Produk yang sama tidak boleh dimasukkan lebih dari satu kali.");
      return;
    }

    const insufficientStock = lines.find((line) => {
      const product = context.products.find((item) => item.id === line.product_id);
      if (!autoProcess || !product?.track_stock || product.product_type !== "physical") {
        return false;
      }
      const available = stockIndex.get(`${branchId}:${line.product_id}`) ?? 0;
      return available < Number(line.quantity);
    });

    if (insufficientStock) {
      const product = context.products.find((item) => item.id === insufficientStock.product_id);
      setFormError(`Stok ${product?.name ?? "produk"} tidak mencukupi pada branch yang dipilih.`);
      return;
    }

    try {
      await createMutation.mutateAsync({
        company_id: companyId,
        branch_id: branchId,
        customer_name: customerName.trim(),
        due_date: dueDate || undefined,
        auto_process: autoProcess,
        notes: notes.trim() || undefined,
        items: lines.map(({ localId, ...line }) => {
          void localId;

          return {
            ...line,
            unit_price: line.unit_price?.trim() || undefined,
            discount_amount: line.discount_amount || "0",
            tax_amount: line.tax_amount || "0",
          };
        }),
      });
    } catch {
      // Mutation onError already exposes a user-facing message.
    }
  }

  if (!companyId) {
    return (
      <div className="space-y-5">
        {isSuperAdmin ? <CompanyScopeFilter /> : null}
        <AutomationEmptyState
          title="Pilih company untuk memulai"
          description="Automation membutuhkan scope company agar produk, stok, transaksi, dan invoice tidak tercampur antar tenant."
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-7">
      <FeedbackToast toast={toast} onClose={() => setToast(null)} />
      <section className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-2xl shadow-slate-900/10 sm:rounded-[2rem] sm:p-7 dark:border-slate-800">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">
              <Sparkles size={14} /> Business Automation
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Product to Cash Flow
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Satu Sales Order dapat mengurangi stok, membuat transaksi penjualan,
              membuat invoice, dan mencatat domain event tanpa input berulang.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void ordersQuery.refetch();
              void eventsQuery.refetch();
              void contextQuery.refetch();
              void monitoringQuery.refetch();
            }}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/15 sm:w-fit"
          >
            <RefreshCw size={16} /> Refresh realtime result
          </button>
        </div>
      </section>

      {isSuperAdmin ? <CompanyScopeFilter /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            { label: "Total Orders", value: metrics.total, icon: Workflow },
            { label: "Fulfilled", value: metrics.fulfilled, icon: CheckCircle2 },
            { label: "Waiting", value: metrics.draft, icon: Loader2 },
            {
              label: "Automated Value",
              value: formatAutomationMoney(metrics.totalValue),
              icon: CircleDollarSign,
            },
          ] satisfies Array<{
            label: string;
            value: string | number;
            icon: LucideIcon;
          }>
        ).map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <Icon size={18} className="text-slate-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 2xl:flex 2xl:items-center">
        <AutomationFlowNode
          icon={PackageCheck}
          title="1. Product & Stock"
          description="Harga diambil dari product dan stok divalidasi per branch."
        />
        <ArrowRight className="hidden shrink-0 text-slate-300 2xl:block" />
        <AutomationFlowNode
          icon={Workflow}
          title="2. Sales Order"
          description="Subtotal, discount, tax, dan total dihitung otomatis."
        />
        <ArrowRight className="hidden shrink-0 text-slate-300 2xl:block" />
        <AutomationFlowNode
          icon={ReceiptText}
          title="3. Transaction"
          description="Income transaction berstatus posted dibuat dari source order."
        />
        <ArrowRight className="hidden shrink-0 text-slate-300 2xl:block" />
        <AutomationFlowNode
          icon={FileText}
          title="4. Invoice"
          description="Invoice sent dibuat dengan source link dan audit event."
        />
      </section>


      {contextQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          Data produk, stok, atau branch gagal dimuat: {extractError(contextQuery.error)}
        </div>
      ) : null}

      <section className="grid min-w-0 gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
        <form
          onSubmit={submitOrder}
          className="min-w-0 rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6 dark:border-slate-800 dark:bg-slate-900/70"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
                New Sales Order
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                Create once, flow automatically
              </h2>
            </div>
            <div className="w-fit rounded-2xl bg-slate-100 px-3 py-2 text-left sm:text-right dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Estimated total
              </p>
              <p className="font-black text-slate-950 dark:text-white">
                {formatAutomationMoney(estimatedTotal)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Customer name
              </span>
              <input
                aria-label="Customer name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                placeholder="PT Customer Indonesia"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Branch / warehouse
              </span>
              <select
                aria-label="Branch / warehouse"
                value={branchId}
                onChange={(event) => {
                  const nextBranchId = event.target.value;
                  let removedProduct = false;

                  setBranchId(nextBranchId);
                  setLines((current) => current.map((line) => {
                    if (!line.product_id || !nextBranchId) return line;
                    const product = context.products.find(
                      (candidate) => candidate.id === line.product_id,
                    );
                    if (!product || isProductAvailableInBranch(
                      product,
                      nextBranchId,
                      context.stocks,
                      allBranchIds,
                    )) return line;

                    removedProduct = true;
                    return { ...line, product_id: "", unit_price: "" };
                  }));

                  if (removedProduct) {
                    setFormError(
                      "Produk yang tidak tersedia di branch baru telah dikosongkan. Pilih produk yang sesuai.",
                    );
                  } else {
                    setFormError("");
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select compatible branch</option>
                {compatibleBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}{branch.code ? ` (${branch.code})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs font-semibold text-slate-400">
                {compatibleBranches.length} branch mendukung produk yang dipilih.
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Due date
              </span>
              <input
                aria-label="Due date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-900/70 dark:bg-indigo-950/40">
              <input
                type="checkbox"
                checked={autoProcess}
                onChange={(event) => setAutoProcess(event.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span>
                <span className="block text-sm font-black text-indigo-950 dark:text-indigo-200">
                  Auto process
                </span>
                <span className="text-xs text-indigo-700 dark:text-indigo-400">
                  Stock → transaction → invoice
                </span>
              </span>
            </label>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-950 dark:text-white">Order items</h3>
              <button
                type="button"
                onClick={() => setLines((current) => [...current, makeAutomationLine()])}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Plus size={14} /> Add item
              </button>
            </div>

            {lines.map((line, index) => {
              const selectedProduct = context.products.find(
                (product) => product.id === line.product_id
              );
              const available = branchId && line.product_id
                ? stockIndex.get(`${branchId}:${line.product_id}`)
                : undefined;

              return (
                <div
                  key={line.localId}
                  className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Item {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeLine(line.localId)}
                      disabled={lines.length === 1}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <select
                      aria-label={`Product item ${index + 1}`}
                      value={line.product_id}
                      onChange={(event) => {
                        const nextProductId = event.target.value;
                        const product = context.products.find(
                          (candidate) => candidate.id === nextProductId
                        );
                        const nextProductIds = lines
                          .map((candidate) => (
                            candidate.localId === line.localId
                              ? nextProductId
                              : candidate.product_id
                          ))
                          .filter(Boolean);
                        const nextCompatibleBranchIds = getCompatibleBranchIds(
                          context.products,
                          context.stocks,
                          allBranchIds,
                          nextProductIds,
                        );

                        if (nextProductId && nextCompatibleBranchIds.length === 0) {
                          setFormError(
                            "Produk ini tidak memiliki branch yang sama dengan item lain pada Sales Order.",
                          );
                          return;
                        }

                        updateLine(line.localId, {
                          product_id: nextProductId,
                          unit_price: String(product?.selling_price ?? ""),
                        });

                        if (
                          nextProductId
                          && (!branchId || !nextCompatibleBranchIds.includes(branchId))
                        ) {
                          setBranchId(
                            nextCompatibleBranchIds.length === 1
                              ? nextCompatibleBranchIds[0]
                              : "",
                          );
                        }
                        setFormError("");
                      }}
                      className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm sm:col-span-2 xl:col-span-2 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">Select product</option>
                      {productsForSelectedBranch.map((product) => {
                        const selectedElsewhere = lines.some(
                          (candidate) => candidate.localId !== line.localId && candidate.product_id === product.id,
                        );
                        return (
                        <option key={product.id} value={product.id} disabled={selectedElsewhere}>
                          {product.sku} — {product.name}
                        </option>
                        );
                      })}
                    </select>
                    <input
                      aria-label={`Quantity item ${index + 1}`}
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.localId, { quantity: event.target.value })
                      }
                      className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm sm:col-span-2 xl:col-span-2 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="Qty"
                    />
                    <input
                      aria-label={`Unit price item ${index + 1}`}
                      type="number"
                      min="0"
                      value={line.unit_price}
                      onChange={(event) =>
                        updateLine(line.localId, { unit_price: event.target.value })
                      }
                      className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm sm:col-span-2 xl:col-span-2 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="Price"
                    />
                    <input
                      aria-label={`Discount item ${index + 1}`}
                      type="number"
                      min="0"
                      value={line.discount_amount}
                      onChange={(event) =>
                        updateLine(line.localId, {
                          discount_amount: event.target.value,
                        })
                      }
                      className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm sm:col-span-2 xl:col-span-2 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="Discount"
                    />
                    <input
                      aria-label={`Tax item ${index + 1}`}
                      type="number"
                      min="0"
                      value={line.tax_amount}
                      onChange={(event) =>
                        updateLine(line.localId, { tax_amount: event.target.value })
                      }
                      className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm sm:col-span-2 xl:col-span-2 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="Tax"
                    />
                  </div>

                  {selectedProduct ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-900">
                        Default price: {formatAutomationMoney(selectedProduct.selling_price)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1",
                          available !== undefined && available >= Number(line.quantity)
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        )}
                      >
                        Available stock: {available ?? "select branch"}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="Optional business note"
            />
          </label>

          {formError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {formError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950"
          >
            {createMutation.isPending ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Sparkles size={17} />
            )}
            {autoProcess ? "Create & automate flow" : "Save as draft"}
          </button>
        </form>

        <div className="space-y-6">
          <section className="rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Recent Results
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  Sales orders
                </h2>
              </div>
              {ordersQuery.isFetching ? (
                <Loader2 className="animate-spin text-slate-400" size={18} />
              ) : null}
            </div>

            <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1 sm:max-h-[42rem]">
              {orders.length === 0 ? (
                <AutomationEmptyState
                  title="No sales orders yet"
                  description="Create the first order to see the automated result."
                />
              ) : (
                orders.map((order: SalesOrder) => (
                  <article
                    key={order.id}
                    className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950 dark:text-white">
                          {order.order_no}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {order.customer_name} · {formatAutomationDate(order.created_at)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider",
                          automationStatusClass(order.status)
                        )}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white p-3 dark:bg-slate-900">
                        <p className="text-xs text-slate-500">Order total</p>
                        <p className="mt-1 font-black text-slate-950 dark:text-white">
                          {formatAutomationMoney(order.total_amount)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 dark:bg-slate-900">
                        <p className="text-xs text-slate-500">Automation mode</p>
                        <p className="mt-1 font-black text-slate-950 dark:text-white">
                          {order.auto_process ? "Automatic" : "Manual approval"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className={cn("rounded-full border px-3 py-1 font-bold", order.transaction_id ? automationStatusClass("processed") : automationStatusClass("pending"))}>
                        Transaction {order.transaction_id ? "created" : "waiting"}
                      </span>
                      <span className={cn("rounded-full border px-3 py-1 font-bold", order.invoice_id ? automationStatusClass("processed") : automationStatusClass("pending"))}>
                        Invoice {order.invoice_id ? "created" : "waiting"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {order.items.length} item(s)
                      </span>
                    </div>

                    {order.status === "draft" ? (
                      <button
                        type="button"
                        disabled={processingOrderId === order.id}
                        onClick={() =>
                          processMutation.mutate({ companyId, orderId: order.id })
                        }
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-500 disabled:opacity-60"
                      >
                        {processingOrderId === order.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Workflow size={16} />
                        )}
                        Process draft automatically
                      </button>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Domain Event Stream
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  Business timeline
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black dark:bg-slate-800">
                {events.length} events
              </span>
            </div>

            <div className="mt-5 max-h-96 space-y-3 overflow-y-auto pr-1">
              {events.length === 0 ? (
                <p className="text-sm text-slate-500">No domain event recorded yet.</p>
              ) : (
                events.map((event: DomainEvent) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                          {event.event_type}
                        </p>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black uppercase", automationStatusClass(event.status))}>
                          {event.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatAutomationDate(event.occurred_at)} · attempts {event.attempts}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>

      <AutomationMonitoringTable
        rows={monitoringRows}
        isLoading={monitoringQuery.isLoading}
        confirmingOrderId={confirmingOrderId}
        onConfirmPayment={(row: AutomationMonitoringRow) => {
          if (!companyId) return;
          confirmPaymentMutation.mutate({
            companyId,
            orderId: row.order_id,
          });
        }}
      />
    </div>
  );
}
