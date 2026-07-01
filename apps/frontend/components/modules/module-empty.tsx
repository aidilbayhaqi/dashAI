export function ModuleEmpty({ message = "Belum ada data." }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-950/50">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {message}
      </p>
    </div>
  );
}