import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen text-slate-950 dark:text-slate-100">
      <Sidebar />

      <section className="ml-76 min-h-screen">
        <Topbar />

        <div className="p-6 lg:p-8">{children}</div>
      </section>
    </main>
  );
}