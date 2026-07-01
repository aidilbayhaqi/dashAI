import {
  BadgeDollarSign,
  BarChart3,
  BrainCircuit,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardCheck,
  Contact,
  FileText,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Megaphone,
  Package,
  PackageCheck,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  Tags,
  TrendingUp,
  UserCheck,
  UserRoundCog,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

export const dashboardNavigation = [
  {
    group: "Command Center",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "AI Analysis",
        href: "/ai-report",
        icon: BrainCircuit,
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        title: "Products",
        href: "/products",
        icon: Package,
      },
      {
        title: "Categories",
        href: "/products/categories",
        icon: Tags,
      },
      {
        title: "Stock Control",
        href: "/products/stock",
        icon: Warehouse,
      },
      {
        title: "Suppliers",
        href: "/products/suppliers",
        icon: PackageCheck,
      },
    ],
  },
  {
    group: "Finance",
    items: [
      {
        title: "Overview",
        href: "/finance",
        icon: Wallet,
      },
      {
        title: "Transactions",
        href: "/finance/transactions",
        icon: ReceiptText,
      },
      {
        title: "Invoices",
        href: "/finance/invoices",
        icon: FileText,
      },
      {
        title: "Cashflow",
        href: "/finance/cashflow",
        icon: TrendingUp,
      },
      {
        title: "Taxes",
        href: "/finance/taxes",
        icon: Landmark,
      },
      {
        title: "General Ledger",
        href: "/finance/ledger",
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    group: "Human Capital",
    items: [
      {
        title: "Overview",
        href: "/hr",
        icon: Users,
      },
      {
        title: "Employees",
        href: "/hr/employees",
        icon: UserCheck,
      },
      {
        title: "Attendance",
        href: "/hr/attendance",
        icon: CalendarCheck,
      },
      {
        title: "Leave Management",
        href: "/hr/leave",
        icon: ClipboardCheck,
      },
      {
        title: "KPI",
        href: "/hr/kpi",
        icon: BarChart3,
      },
      {
        title: "Payroll",
        href: "/hr/payroll",
        icon: BadgeDollarSign,
      },
    ],
  },
  {
    group: "Customers",
    items: [
      {
        title: "CRM Overview",
        href: "/crm",
        icon: Contact,
      },
      {
        title: "Leads",
        href: "/crm/leads",
        icon: ShoppingBasket,
      },
      {
        title: "Customers",
        href: "/crm/customers",
        icon: HandCoins,
      },
      {
        title: "Pipeline",
        href: "/crm/pipeline",
        icon: ChartNoAxesCombined,
      },
      {
        title: "Campaigns",
        href: "/crm/campaigns",
        icon: Megaphone,
      },
    ],
  },
  {
    group: "Administration",
    items: [
      {
        title: "Companies",
        href: "/companies",
        icon: Building2,
      },
      {
        title: "Users & Roles",
        href: "/users",
        icon: ShieldCheck,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: UserRoundCog,
      },
    ],
  },
];

export type DashboardNavigation = typeof dashboardNavigation;