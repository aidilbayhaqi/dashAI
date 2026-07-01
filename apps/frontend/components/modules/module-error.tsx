export function ModuleError() {
  return (
    <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
      <h2 className="text-lg font-black">Gagal memuat data</h2>
      <p className="mt-2 text-sm">
        Terjadi kesalahan saat mengambil data module. Coba refresh halaman atau
        cek koneksi backend.
      </p>
    </div>
  );
}