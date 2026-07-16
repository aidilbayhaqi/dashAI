import { getApiErrorMessage } from "@/lib/api-error";
import type { ModuleRow } from "@/types/modules";

export type ImportBatchFailure = {
  rowNumber: number;
  row: ModuleRow;
  message: string;
};

export type ImportBatchResult = {
  successCount: number;
  failures: ImportBatchFailure[];
};

export async function runSequentialImport(
  rows: ModuleRow[],
  createRecord: (row: ModuleRow) => Promise<unknown>,
): Promise<ImportBatchResult> {
  const failures: ImportBatchFailure[] = [];
  let successCount = 0;

  for (const [index, row] of rows.entries()) {
    try {
      await createRecord(row);
      successCount += 1;
    } catch (error: unknown) {
      failures.push({
        rowNumber: index + 2,
        row,
        message: getApiErrorMessage(
          error,
          "Baris gagal diproses oleh backend.",
        ),
      });
    }
  }

  return { successCount, failures };
}
