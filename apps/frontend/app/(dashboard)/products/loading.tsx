import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function ProductsLoading() {
  return <TableSkeleton rows={8} columns={6} />;
}