// import {
//   BadgeDollarSign,
//   BarChart3,
//   BrainCircuit,
//   Building2,
//   CalendarCheck,
//   ChartNoAxesCombined,
//   ClipboardCheck,
//   Contact,
//   FileText,
//   HandCoins,
//   Landmark,
//   Megaphone,
//   Package,
//   PackageCheck,
//   ReceiptText,
//   Settings,
//   ShieldCheck,
//   ShoppingBasket,
//   Tags,
//   TrendingUp,
//   UserCheck,
//   Users,
//   Wallet,
//   Warehouse,
// } from "lucide-react";
// import type { ModulePage } from "@/components/modules/module-page";

// export const modulePages = {
//   products: {
//     badge: "Operations / Inventory",
//     title: "Product Management",
//     description:
//       "Kelola produk, SKU, kategori, stok, supplier, harga, dan performa inventory.",
//     icon: Package,
//     metrics: [
//       { label: "Active SKU", value: "342", helper: "24 SKU butuh perhatian stok", trend: "+8.4%" },
//       { label: "Stock Value", value: "Rp 4.8 M", helper: "Estimasi nilai inventory aktif" },
//       { label: "Low Stock", value: "18", helper: "Item masuk reorder threshold" },
//     ],
//     columns: [
//       { key: "name", label: "Product" },
//       { key: "sku", label: "SKU" },
//       { key: "stock", label: "Stock" },
//       { key: "price", label: "Price" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { name: "ERP Premium License", sku: "ERP-001", stock: "84", price: "Rp 2.500.000", status: "Active" },
//       { name: "AI Agent Add-on", sku: "AI-022", stock: "24", price: "Rp 1.800.000", status: "Active" },
//       { name: "Inventory Scanner", sku: "INV-310", stock: "6", price: "Rp 850.000", status: "Low Stock" },
//     ],
//     aiNotes: [
//       "Produk AI Agent memiliki growth tertinggi dan cocok diprioritaskan di campaign berikutnya.",
//       "Inventory Scanner sudah masuk zona low stock, rekomendasi reorder minggu ini.",
//       "SKU dengan margin tinggi bisa dipaketkan dengan ERP Premium License.",
//     ],
//   },

//   productCategories: {
//     badge: "Operations / Product Categories",
//     title: "Product Categories",
//     description:
//       "Atur kategori produk agar katalog, reporting, dan analisis inventory lebih terstruktur.",
//     icon: Tags,
//     metrics: [
//       { label: "Categories", value: "18", helper: "Kategori aktif" },
//       { label: "Top Category", value: "Software", helper: "Kontribusi revenue tertinggi" },
//       { label: "Unmapped SKU", value: "7", helper: "Produk belum punya kategori" },
//     ],
//     columns: [
//       { key: "name", label: "Category" },
//       { key: "products", label: "Products" },
//       { key: "revenue", label: "Revenue" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { name: "Software", products: "122", revenue: "Rp 8.2 M", status: "Active" },
//       { name: "Hardware", products: "74", revenue: "Rp 2.1 M", status: "Active" },
//       { name: "Services", products: "43", revenue: "Rp 4.7 M", status: "Review" },
//     ],
//     aiNotes: [
//       "Kategori Software mendominasi revenue, cocok dibuatkan paket bundling.",
//       "Beberapa SKU belum dipetakan kategori sehingga reporting belum sepenuhnya akurat.",
//     ],
//   },

//   productStock: {
//     badge: "Operations / Stock Control",
//     title: "Stock Control",
//     description:
//       "Monitor stok, reorder point, warehouse, dan item yang butuh restock.",
//     icon: Warehouse,
//     metrics: [
//       { label: "Total Stock", value: "12,840", helper: "Across all warehouses" },
//       { label: "Reorder Needed", value: "18", helper: "Below minimum threshold" },
//       { label: "Warehouse", value: "4", helper: "Active storage locations" },
//     ],
//     columns: [
//       { key: "item", label: "Item" },
//       { key: "warehouse", label: "Warehouse" },
//       { key: "stock", label: "Stock" },
//       { key: "minimum", label: "Minimum" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { item: "Inventory Scanner", warehouse: "Jakarta", stock: "6", minimum: "15", status: "Low Stock" },
//       { item: "POS Terminal", warehouse: "Bandung", stock: "21", minimum: "10", status: "Active" },
//       { item: "Barcode Label", warehouse: "Jakarta", stock: "240", minimum: "100", status: "Active" },
//     ],
//     aiNotes: [
//       "Inventory Scanner perlu reorder segera untuk menghindari lost sales.",
//       "Warehouse Jakarta memiliki movement tertinggi dalam 30 hari terakhir.",
//     ],
//   },

//   productSuppliers: {
//     badge: "Operations / Suppliers",
//     title: "Suppliers",
//     description:
//       "Kelola supplier, lead time, status kontrak, dan performa procurement.",
//     icon: PackageCheck,
//     metrics: [
//       { label: "Suppliers", value: "26", helper: "Vendor aktif" },
//       { label: "Avg Lead Time", value: "5.2 Days", helper: "Rata-rata pengiriman" },
//       { label: "Pending PO", value: "9", helper: "Purchase order aktif" },
//     ],
//     columns: [
//       { key: "name", label: "Supplier" },
//       { key: "category", label: "Category" },
//       { key: "leadTime", label: "Lead Time" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { name: "PT Sumber Digital", category: "Software", leadTime: "2 days", status: "Active" },
//       { name: "CV Prima Hardware", category: "Hardware", leadTime: "6 days", status: "Review" },
//       { name: "Nusantara Service", category: "Services", leadTime: "4 days", status: "Active" },
//     ],
//     aiNotes: [
//       "Supplier hardware memiliki lead time lebih panjang, perlu buffer stock tambahan.",
//       "Vendor software punya performa stabil dan bisa dijadikan partner prioritas.",
//     ],
//   },

//   finance: {
//     badge: "Finance / Accounting",
//     title: "Finance Overview",
//     description:
//       "Pantau revenue, expense, invoice, cashflow, pajak, approval, dan general ledger perusahaan.",
//     icon: Wallet,
//     metrics: [
//       { label: "Monthly Revenue", value: "Rp 128.5 M", helper: "+18.2% dibanding bulan lalu", trend: "+18.2%" },
//       { label: "Pending Invoice", value: "32", helper: "Menunggu pembayaran" },
//       { label: "Cashflow", value: "+Rp 42.7 M", helper: "Positif dalam periode berjalan" },
//     ],
//     columns: [
//       { key: "transaction", label: "Transaction" },
//       { key: "type", label: "Type" },
//       { key: "amount", label: "Amount" },
//       { key: "date", label: "Date" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { transaction: "Enterprise ERP Payment", type: "Income", amount: "Rp 48.000.000", date: "01 Jul 2026", status: "Paid" },
//       { transaction: "Cloud Infrastructure", type: "Expense", amount: "Rp 8.500.000", date: "30 Jun 2026", status: "Approved" },
//       { transaction: "Vendor Invoice", type: "Expense", amount: "Rp 12.200.000", date: "29 Jun 2026", status: "Pending" },
//     ],
//     aiNotes: [
//       "Cashflow masih positif, namun expense infrastruktur meningkat.",
//       "Invoice enterprise menjadi kontributor revenue terbesar bulan ini.",
//       "Perlu follow-up invoice pending agar DSO tetap sehat.",
//     ],
//   },

//   financeTransactions: {
//     badge: "Finance / Transactions",
//     title: "Transactions",
//     description:
//       "Kelola pemasukan, pengeluaran, approval transaksi, dan histori finance.",
//     icon: ReceiptText,
//     metrics: [
//       { label: "Transactions", value: "1,284", helper: "Bulan berjalan" },
//       { label: "Income", value: "Rp 128.5 M", helper: "Total pemasukan" },
//       { label: "Expense", value: "Rp 85.8 M", helper: "Total pengeluaran" },
//     ],
//     columns: [
//       { key: "code", label: "Code" },
//       { key: "description", label: "Description" },
//       { key: "amount", label: "Amount" },
//       { key: "category", label: "Category" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { code: "TRX-1001", description: "Client subscription", amount: "Rp 24.000.000", category: "Revenue", status: "Completed" },
//       { code: "TRX-1002", description: "Server payment", amount: "Rp 6.500.000", category: "Infrastructure", status: "Approved" },
//       { code: "TRX-1003", description: "Marketing campaign", amount: "Rp 10.000.000", category: "Marketing", status: "Review" },
//     ],
//     aiNotes: [
//       "Marketing expense perlu dibandingkan dengan pipeline CRM.",
//       "Transaksi subscription stabil dan bisa dijadikan baseline forecasting.",
//     ],
//   },

//   financeInvoices: {
//     badge: "Finance / Invoices",
//     title: "Invoices",
//     description:
//       "Monitor invoice, due date, payment status, dan aging receivable.",
//     icon: FileText,
//     metrics: [
//       { label: "Total Invoice", value: "86", helper: "Bulan berjalan" },
//       { label: "Paid", value: "54", helper: "Sudah dibayar" },
//       { label: "Overdue", value: "6", helper: "Butuh follow-up" },
//     ],
//     columns: [
//       { key: "invoice", label: "Invoice" },
//       { key: "client", label: "Client" },
//       { key: "amount", label: "Amount" },
//       { key: "due", label: "Due Date" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { invoice: "INV-2026-001", client: "PT Nusantara Retail", amount: "Rp 32.000.000", due: "08 Jul 2026", status: "Paid" },
//       { invoice: "INV-2026-002", client: "CV Prima Jaya", amount: "Rp 18.500.000", due: "11 Jul 2026", status: "Pending" },
//       { invoice: "INV-2026-003", client: "PT Global Mandiri", amount: "Rp 42.000.000", due: "28 Jun 2026", status: "Overdue" },
//     ],
//     aiNotes: [
//       "Invoice overdue perlu diprioritaskan agar cashflow tidak terganggu.",
//       "Client enterprise memiliki invoice value tertinggi bulan ini.",
//     ],
//   },

//   financeCashflow: {
//     badge: "Finance / Cashflow",
//     title: "Cashflow",
//     description:
//       "Pantau arus kas masuk dan keluar agar bisnis tetap sehat.",
//     icon: TrendingUp,
//     metrics: [
//       { label: "Net Cashflow", value: "+Rp 42.7 M", helper: "Periode berjalan" },
//       { label: "Cash In", value: "Rp 128.5 M", helper: "Total inflow" },
//       { label: "Cash Out", value: "Rp 85.8 M", helper: "Total outflow" },
//     ],
//     columns: [
//       { key: "period", label: "Period" },
//       { key: "cashIn", label: "Cash In" },
//       { key: "cashOut", label: "Cash Out" },
//       { key: "net", label: "Net" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { period: "Week 1", cashIn: "Rp 32.5 M", cashOut: "Rp 18.4 M", net: "+Rp 14.1 M", status: "Positive" },
//       { period: "Week 2", cashIn: "Rp 28.2 M", cashOut: "Rp 21.0 M", net: "+Rp 7.2 M", status: "Positive" },
//       { period: "Week 3", cashIn: "Rp 20.0 M", cashOut: "Rp 24.5 M", net: "-Rp 4.5 M", status: "Risk" },
//     ],
//     aiNotes: [
//       "Week 3 menunjukkan cashflow negatif, perlu cek expense besar.",
//       "Forecast cashflow masih aman jika invoice pending dibayar tepat waktu.",
//     ],
//   },

//   financeTaxes: {
//     badge: "Finance / Taxes",
//     title: "Taxes",
//     description:
//       "Kelola PPN, PPh, tax report, dan compliance keuangan.",
//     icon: Landmark,
//     metrics: [
//       { label: "Tax Payable", value: "Rp 14.2 M", helper: "Estimasi bulan ini" },
//       { label: "PPN Output", value: "Rp 9.7 M", helper: "Dari invoice penjualan" },
//       { label: "Due Soon", value: "3 Days", helper: "Deadline pelaporan" },
//     ],
//     columns: [
//       { key: "type", label: "Tax Type" },
//       { key: "period", label: "Period" },
//       { key: "amount", label: "Amount" },
//       { key: "due", label: "Due" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { type: "PPN", period: "Jun 2026", amount: "Rp 9.700.000", due: "05 Jul 2026", status: "Review" },
//       { type: "PPh 23", period: "Jun 2026", amount: "Rp 2.400.000", due: "10 Jul 2026", status: "Ready" },
//       { type: "PPh 21", period: "Jun 2026", amount: "Rp 2.100.000", due: "10 Jul 2026", status: "Pending" },
//     ],
//     aiNotes: [
//       "PPN perlu direview sebelum deadline agar tidak terlambat submit.",
//       "PPh payroll bisa dihubungkan dengan modul HR Payroll nanti.",
//     ],
//   },

//   financeLedger: {
//     badge: "Finance / General Ledger",
//     title: "General Ledger",
//     description:
//       "Pantau jurnal umum, akun, debit, kredit, dan balance accounting.",
//     icon: ChartNoAxesCombined,
//     metrics: [
//       { label: "Journal Entries", value: "284", helper: "Bulan berjalan" },
//       { label: "Balanced", value: "278", helper: "Entry sudah balance" },
//       { label: "Need Review", value: "6", helper: "Entry perlu validasi" },
//     ],
//     columns: [
//       { key: "account", label: "Account" },
//       { key: "debit", label: "Debit" },
//       { key: "credit", label: "Credit" },
//       { key: "period", label: "Period" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { account: "Cash", debit: "Rp 24.000.000", credit: "-", period: "Jun 2026", status: "Balanced" },
//       { account: "Revenue", debit: "-", credit: "Rp 24.000.000", period: "Jun 2026", status: "Balanced" },
//       { account: "Marketing Expense", debit: "Rp 10.000.000", credit: "-", period: "Jun 2026", status: "Review" },
//     ],
//     aiNotes: [
//       "Beberapa jurnal expense perlu validasi kategori.",
//       "Ledger bisa dijadikan source utama untuk AI financial reporting.",
//     ],
//   },

//   hr: {
//     badge: "Human Capital",
//     title: "Human Resource",
//     description:
//       "Kelola employee, attendance, leave request, KPI, performance review, dan payroll.",
//     icon: Users,
//     metrics: [
//       { label: "Employees", value: "48", helper: "6 divisi aktif" },
//       { label: "Attendance Rate", value: "96%", helper: "Rata-rata bulan ini", trend: "+2.1%" },
//       { label: "Leave Request", value: "7", helper: "Menunggu approval HR" },
//     ],
//     columns: [
//       { key: "employee", label: "Employee" },
//       { key: "division", label: "Division" },
//       { key: "role", label: "Role" },
//       { key: "kpi", label: "KPI" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { employee: "Andi Saputra", division: "Sales", role: "Sales Lead", kpi: "92%", status: "Active" },
//       { employee: "Nadia Putri", division: "Finance", role: "Accountant", kpi: "88%", status: "Active" },
//       { employee: "Riko Pratama", division: "Ops", role: "Warehouse", kpi: "74%", status: "Review" },
//     ],
//     aiNotes: [
//       "KPI Ops perlu perhatian karena berada di bawah rata-rata perusahaan.",
//       "Attendance rate stabil dan berdampak positif ke productivity score.",
//     ],
//   },

//   hrEmployees: {
//     badge: "Human Capital / Employees",
//     title: "Employees",
//     description:
//       "Kelola data karyawan, jabatan, divisi, status, dan performa.",
//     icon: UserCheck,
//     metrics: [
//       { label: "Total Employees", value: "48", helper: "Karyawan aktif" },
//       { label: "New Hire", value: "4", helper: "Bulan ini" },
//       { label: "Probation", value: "3", helper: "Dalam evaluasi" },
//     ],
//     columns: [
//       { key: "name", label: "Name" },
//       { key: "division", label: "Division" },
//       { key: "position", label: "Position" },
//       { key: "joined", label: "Joined" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { name: "Andi Saputra", division: "Sales", position: "Sales Lead", joined: "Jan 2024", status: "Active" },
//       { name: "Nadia Putri", division: "Finance", position: "Accountant", joined: "Mar 2024", status: "Active" },
//       { name: "Riko Pratama", division: "Ops", position: "Warehouse Staff", joined: "May 2026", status: "Probation" },
//     ],
//     aiNotes: [
//       "Karyawan probation perlu performance review berkala.",
//       "Data employee nantinya terhubung ke attendance, payroll, dan KPI.",
//     ],
//   },

//   hrAttendance: {
//     badge: "Human Capital / Attendance",
//     title: "Attendance",
//     description:
//       "Monitor kehadiran, keterlambatan, overtime, dan pola absensi karyawan.",
//     icon: CalendarCheck,
//     metrics: [
//       { label: "Attendance", value: "96%", helper: "Rata-rata bulan ini" },
//       { label: "Late Check-in", value: "12", helper: "Kejadian minggu ini" },
//       { label: "Overtime", value: "84h", helper: "Total overtime" },
//     ],
//     columns: [
//       { key: "employee", label: "Employee" },
//       { key: "checkIn", label: "Check In" },
//       { key: "checkOut", label: "Check Out" },
//       { key: "hours", label: "Hours" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { employee: "Andi Saputra", checkIn: "08:02", checkOut: "17:08", hours: "9h 6m", status: "Active" },
//       { employee: "Nadia Putri", checkIn: "08:14", checkOut: "17:00", hours: "8h 46m", status: "Late" },
//       { employee: "Riko Pratama", checkIn: "07:58", checkOut: "18:10", hours: "10h 12m", status: "Overtime" },
//     ],
//     aiNotes: [
//       "Late check-in meningkat pada divisi Finance minggu ini.",
//       "Overtime Ops perlu dicek apakah karena shortage staff atau workload naik.",
//     ],
//   },

//   hrLeave: {
//     badge: "Human Capital / Leave",
//     title: "Leave Management",
//     description:
//       "Kelola pengajuan cuti, approval, balance cuti, dan kalender absensi.",
//     icon: ClipboardCheck,
//     metrics: [
//       { label: "Leave Request", value: "7", helper: "Menunggu approval" },
//       { label: "Approved", value: "18", helper: "Bulan berjalan" },
//       { label: "Rejected", value: "2", helper: "Bulan berjalan" },
//     ],
//     columns: [
//       { key: "employee", label: "Employee" },
//       { key: "type", label: "Type" },
//       { key: "date", label: "Date" },
//       { key: "duration", label: "Duration" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { employee: "Andi Saputra", type: "Annual Leave", date: "08 Jul 2026", duration: "2 days", status: "Pending" },
//       { employee: "Nadia Putri", type: "Sick Leave", date: "01 Jul 2026", duration: "1 day", status: "Approved" },
//       { employee: "Riko Pratama", type: "Annual Leave", date: "12 Jul 2026", duration: "3 days", status: "Review" },
//     ],
//     aiNotes: [
//       "Approval cuti sebaiknya memperhatikan kalender operasional dan beban kerja tim.",
//       "Data leave bisa dipakai untuk forecast kapasitas kerja mingguan.",
//     ],
//   },

//   hrKpi: {
//     badge: "Human Capital / KPI",
//     title: "KPI",
//     description:
//       "Pantau target, actual, performance score, dan evaluasi karyawan.",
//     icon: BarChart3,
//     metrics: [
//       { label: "Avg KPI", value: "86%", helper: "Rata-rata perusahaan" },
//       { label: "Top Division", value: "Finance", helper: "Score tertinggi" },
//       { label: "Need Review", value: "5", helper: "KPI di bawah target" },
//     ],
//     columns: [
//       { key: "employee", label: "Employee" },
//       { key: "target", label: "Target" },
//       { key: "actual", label: "Actual" },
//       { key: "score", label: "Score" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { employee: "Andi Saputra", target: "100", actual: "92", score: "92%", status: "Active" },
//       { employee: "Nadia Putri", target: "100", actual: "88", score: "88%", status: "Active" },
//       { employee: "Riko Pratama", target: "100", actual: "74", score: "74%", status: "Review" },
//     ],
//     aiNotes: [
//       "AI bisa memberikan rekomendasi coaching untuk karyawan dengan KPI rendah.",
//       "KPI Sales kuat, namun Ops butuh analisis root cause.",
//     ],
//   },

//   hrPayroll: {
//     badge: "Human Capital / Payroll",
//     title: "Payroll",
//     description:
//       "Kelola salary, allowance, deduction, tax, dan approval payroll.",
//     icon: BadgeDollarSign,
//     metrics: [
//       { label: "Payroll Batch", value: "Rp 284 M", helper: "Estimasi bulan ini" },
//       { label: "Pending Approval", value: "1", helper: "Batch menunggu approval" },
//       { label: "Employees Paid", value: "44/48", helper: "Progress payroll" },
//     ],
//     columns: [
//       { key: "employee", label: "Employee" },
//       { key: "salary", label: "Salary" },
//       { key: "allowance", label: "Allowance" },
//       { key: "deduction", label: "Deduction" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { employee: "Andi Saputra", salary: "Rp 12.000.000", allowance: "Rp 1.200.000", deduction: "Rp 400.000", status: "Ready" },
//       { employee: "Nadia Putri", salary: "Rp 10.500.000", allowance: "Rp 900.000", deduction: "Rp 350.000", status: "Ready" },
//       { employee: "Riko Pratama", salary: "Rp 6.500.000", allowance: "Rp 500.000", deduction: "Rp 120.000", status: "Review" },
//     ],
//     aiNotes: [
//       "Payroll bisa dihubungkan dengan attendance dan leave untuk perhitungan otomatis.",
//       "Batch payroll menunggu approval final sebelum disubmit.",
//     ],
//   },

//   crm: {
//     badge: "Customers / Sales",
//     title: "CRM Overview",
//     description:
//       "Kelola leads, customer, pipeline, campaign, dan follow-up sales berbasis data.",
//     icon: Contact,
//     metrics: [
//       { label: "Active Leads", value: "184", helper: "27 leads masuk minggu ini", trend: "+14.3%" },
//       { label: "Conversion Rate", value: "18.6%", helper: "+4.2% dibanding bulan lalu" },
//       { label: "Pipeline Value", value: "Rp 2.4 M", helper: "Estimasi deal aktif" },
//     ],
//     columns: [
//       { key: "lead", label: "Lead" },
//       { key: "company", label: "Company" },
//       { key: "value", label: "Value" },
//       { key: "stage", label: "Stage" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { lead: "Budi Santoso", company: "PT Retail Maju", value: "Rp 240.000.000", stage: "Proposal", status: "Hot" },
//       { lead: "Sinta Dewi", company: "CV Digital Prima", value: "Rp 85.000.000", stage: "Discovery", status: "Review" },
//       { lead: "Raka Putra", company: "PT Global Karya", value: "Rp 180.000.000", stage: "Negotiation", status: "Active" },
//     ],
//     aiNotes: [
//       "Lead enterprise punya peluang conversion tertinggi bulan ini.",
//       "Follow-up cepat disarankan untuk lead dengan stage Proposal dan Negotiation.",
//     ],
//   },

//   crmLeads: {
//     badge: "Customers / Leads",
//     title: "Leads",
//     description:
//       "Kelola prospek, lead scoring, source, dan prioritas follow-up.",
//     icon: ShoppingBasket,
//     metrics: [
//       { label: "New Leads", value: "27", helper: "Minggu ini" },
//       { label: "Hot Leads", value: "12", helper: "High priority" },
//       { label: "Avg Score", value: "78", helper: "Lead scoring rata-rata" },
//     ],
//     columns: [
//       { key: "name", label: "Name" },
//       { key: "source", label: "Source" },
//       { key: "score", label: "Score" },
//       { key: "owner", label: "Owner" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { name: "Budi Santoso", source: "Website", score: "92", owner: "Sales A", status: "Hot" },
//       { name: "Sinta Dewi", source: "Instagram", score: "76", owner: "Sales B", status: "Review" },
//       { name: "Raka Putra", source: "Referral", score: "88", owner: "Sales A", status: "Active" },
//     ],
//     aiNotes: [
//       "Lead dari Website punya score paling tinggi dan harus difollow-up lebih cepat.",
//       "Referral lead memiliki conversion probability stabil.",
//     ],
//   },

//   crmCustomers: {
//     badge: "Customers / Database",
//     title: "Customers",
//     description:
//       "Kelola database pelanggan, segmentasi, nilai transaksi, dan engagement.",
//     icon: HandCoins,
//     metrics: [
//       { label: "Customers", value: "536", helper: "Customer aktif" },
//       { label: "Enterprise", value: "84", helper: "Segment high value" },
//       { label: "Retention", value: "91%", helper: "Simulasi retention rate" },
//     ],
//     columns: [
//       { key: "customer", label: "Customer" },
//       { key: "segment", label: "Segment" },
//       { key: "revenue", label: "Revenue" },
//       { key: "lastActivity", label: "Last Activity" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { customer: "PT Retail Maju", segment: "Enterprise", revenue: "Rp 840.000.000", lastActivity: "Today", status: "Active" },
//       { customer: "CV Digital Prima", segment: "SMB", revenue: "Rp 120.000.000", lastActivity: "2 days ago", status: "Active" },
//       { customer: "PT Global Karya", segment: "Enterprise", revenue: "Rp 520.000.000", lastActivity: "7 days ago", status: "Review" },
//     ],
//     aiNotes: [
//       "Customer enterprise perlu program retention khusus.",
//       "Customer dengan last activity rendah bisa masuk campaign reactivation.",
//     ],
//   },

//   crmPipeline: {
//     badge: "Customers / Pipeline",
//     title: "Pipeline",
//     description:
//       "Monitor deal stage, value, probability, dan forecasting revenue.",
//     icon: ChartNoAxesCombined,
//     metrics: [
//       { label: "Pipeline Value", value: "Rp 2.4 M", helper: "Total active deals" },
//       { label: "Win Probability", value: "42%", helper: "Forecast rata-rata" },
//       { label: "Negotiation", value: "18", helper: "Deal di tahap negotiation" },
//     ],
//     columns: [
//       { key: "deal", label: "Deal" },
//       { key: "client", label: "Client" },
//       { key: "value", label: "Value" },
//       { key: "stage", label: "Stage" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { deal: "ERP Enterprise Rollout", client: "PT Retail Maju", value: "Rp 840.000.000", stage: "Proposal", status: "Hot" },
//       { deal: "AI Reporting Add-on", client: "PT Global Karya", value: "Rp 260.000.000", stage: "Negotiation", status: "Active" },
//       { deal: "CRM Implementation", client: "CV Prima", value: "Rp 120.000.000", stage: "Discovery", status: "Review" },
//     ],
//     aiNotes: [
//       "Deal proposal bernilai tinggi sebaiknya diberi executive follow-up.",
//       "Pipeline bisa dipakai untuk forecast cashflow di modul finance.",
//     ],
//   },

//   crmCampaigns: {
//     badge: "Customers / Campaigns",
//     title: "Campaigns",
//     description:
//       "Kelola campaign marketing, channel, budget, dan performa konversi.",
//     icon: Megaphone,
//     metrics: [
//       { label: "Active Campaigns", value: "8", helper: "Campaign berjalan" },
//       { label: "Leads Generated", value: "327", helper: "Bulan ini" },
//       { label: "Cost per Lead", value: "Rp 42k", helper: "Rata-rata CPL" },
//     ],
//     columns: [
//       { key: "campaign", label: "Campaign" },
//       { key: "channel", label: "Channel" },
//       { key: "budget", label: "Budget" },
//       { key: "leads", label: "Leads" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { campaign: "ERP Awareness Q3", channel: "LinkedIn", budget: "Rp 18.000.000", leads: "84", status: "Active" },
//       { campaign: "AI Agent Launch", channel: "Instagram", budget: "Rp 12.000.000", leads: "146", status: "Active" },
//       { campaign: "Enterprise Webinar", channel: "Email", budget: "Rp 8.000.000", leads: "97", status: "Scheduled" },
//     ],
//     aiNotes: [
//       "Instagram menghasilkan lead terbanyak namun perlu dicek kualitas score-nya.",
//       "LinkedIn cocok untuk enterprise campaign bernilai tinggi.",
//     ],
//   },

//   aiReport: {
//     badge: "Intelligence / Smart Reporting",
//     title: "AI Business Intelligence",
//     description:
//       "Generate insight otomatis dari data ERP: finance, inventory, HR, CRM, dan KPI perusahaan.",
//     icon: BrainCircuit,
//     metrics: [
//       { label: "Generated Reports", value: "27", helper: "12 insight minggu ini" },
//       { label: "Critical Findings", value: "3", helper: "Butuh perhatian manajemen" },
//       { label: "Automation Score", value: "82%", helper: "Readiness AI workflow" },
//     ],
//     columns: [
//       { key: "report", label: "Report" },
//       { key: "module", label: "Module" },
//       { key: "impact", label: "Impact" },
//       { key: "created", label: "Created" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { report: "Cashflow anomaly", module: "Finance", impact: "High", created: "Today", status: "Critical" },
//       { report: "Low stock prediction", module: "Inventory", impact: "Medium", created: "Today", status: "Review" },
//       { report: "Lead priority ranking", module: "CRM", impact: "High", created: "Yesterday", status: "Ready" },
//     ],
//     aiNotes: [
//       "AI Report nanti akan terhubung ke backend endpoint `/api/v1/ai/reports`.",
//       "Qdrant bisa dipakai untuk menyimpan context dokumen dan data reporting.",
//       "Smart Reporting akan jadi pembeda utama DashAI dibanding ERP biasa.",
//     ],
//   },

//   companies: {
//     badge: "Administration / Companies",
//     title: "Companies",
//     description:
//       "Kelola perusahaan, tenant, branch, workspace, dan konfigurasi multi-company.",
//     icon: Building2,
//     metrics: [
//       { label: "Companies", value: "4", helper: "Workspace aktif" },
//       { label: "Branches", value: "12", helper: "Cabang terdaftar" },
//       { label: "Active Plan", value: "Pro", helper: "Subscription berjalan" },
//     ],
//     columns: [
//       { key: "company", label: "Company" },
//       { key: "industry", label: "Industry" },
//       { key: "branches", label: "Branches" },
//       { key: "plan", label: "Plan" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { company: "Main Company", industry: "Technology", branches: "4", plan: "Pro", status: "Active" },
//       { company: "Retail Subsidiary", industry: "Retail", branches: "6", plan: "Business", status: "Active" },
//       { company: "Ops Partner", industry: "Service", branches: "2", plan: "Starter", status: "Review" },
//     ],
//     aiNotes: [
//       "Multi-company perlu dipisahkan berdasarkan tenant dan permission.",
//       "Setiap perusahaan bisa punya konfigurasi modul yang berbeda.",
//     ],
//   },

//   users: {
//     badge: "Administration / Access Control",
//     title: "Users & Roles",
//     description:
//       "Kelola user, role, permission, akses modul, dan keamanan sistem.",
//     icon: ShieldCheck,
//     metrics: [
//       { label: "Users", value: "64", helper: "User aktif" },
//       { label: "Roles", value: "8", helper: "Role terdaftar" },
//       { label: "Pending Invite", value: "5", helper: "Invite belum diterima" },
//     ],
//     columns: [
//       { key: "user", label: "User" },
//       { key: "email", label: "Email" },
//       { key: "role", label: "Role" },
//       { key: "lastLogin", label: "Last Login" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { user: "Super Admin", email: "superadmin@dashai.test", role: "Super Admin", lastLogin: "Today", status: "Active" },
//       { user: "Finance Admin", email: "finance@dashai.test", role: "Finance", lastLogin: "Yesterday", status: "Active" },
//       { user: "HR Manager", email: "hr@dashai.test", role: "HR", lastLogin: "3 days ago", status: "Review" },
//     ],
//     aiNotes: [
//       "Permission harus granular per modul dan action.",
//       "Audit log penting untuk aktivitas finance dan user management.",
//     ],
//   },

//   settings: {
//     badge: "Administration / Settings",
//     title: "Settings",
//     description:
//       "Kelola konfigurasi sistem, workspace, notification, branding, dan integrasi.",
//     icon: Settings,
//     metrics: [
//       { label: "Integrations", value: "6", helper: "Connected service" },
//       { label: "Notifications", value: "Active", helper: "System alert enabled" },
//       { label: "Security", value: "Good", helper: "Basic security active" },
//     ],
//     columns: [
//       { key: "setting", label: "Setting" },
//       { key: "category", label: "Category" },
//       { key: "value", label: "Value" },
//       { key: "updated", label: "Updated" },
//       { key: "status", label: "Status" },
//     ],
//     rows: [
//       { setting: "Company Branding", category: "Workspace", value: "DashAI", updated: "Today", status: "Active" },
//       { setting: "Email Notification", category: "Notification", value: "Enabled", updated: "Yesterday", status: "Active" },
//       { setting: "AI Reporting", category: "Intelligence", value: "Beta", updated: "Today", status: "Review" },
//     ],
//     aiNotes: [
//       "Settings nanti perlu dibagi antara global config dan tenant config.",
//       "AI Reporting sebaiknya bisa diaktifkan per company/module.",
//     ],
//   },
// } satisfies Record<string, ModulePageProps>;

// export type ModulePageKey = keyof typeof modulePages;