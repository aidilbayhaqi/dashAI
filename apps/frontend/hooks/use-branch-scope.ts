"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getSelectedBranchId,
  subscribeBranchScope,
  type BranchScopeValue,
} from "@/lib/branch-scope";

export function useBranchScope() {
  const [branchId, setBranchId] =
    useState<BranchScopeValue>(() =>
      getSelectedBranchId(),
    );

  useEffect(() => {
    return subscribeBranchScope(() => {
      setBranchId(
        getSelectedBranchId(),
      );
    });
  }, []);

  return branchId;
}