import { Suspense } from "react";

import {
  CompanyDetailPage,
} from "@/features/companies/company-detail-page";

function CompanyDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-44 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-900" />

      <div className="h-96 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-900" />
    </div>
  );
}

export default function CompanyDetailRoutePage() {
  return (
    <Suspense
      fallback={<CompanyDetailLoading />}
    >
      <CompanyDetailPage />
    </Suspense>
  );
}