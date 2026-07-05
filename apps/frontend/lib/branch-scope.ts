const SELECTED_BRANCH_KEY = "dashai_selected_branch_id";
const BRANCH_SCOPE_EVENT = "dashai_branch_scope_changed";

export type BranchScopeValue = string;

export function getSelectedBranchId(): BranchScopeValue {
  if (typeof window === "undefined") return "all";

  return localStorage.getItem(SELECTED_BRANCH_KEY) || "all";
}

export function setSelectedBranchId(branchId: BranchScopeValue) {
  if (typeof window === "undefined") return;

  localStorage.setItem(SELECTED_BRANCH_KEY, branchId || "all");
  window.dispatchEvent(new Event(BRANCH_SCOPE_EVENT));
}

export function subscribeBranchScope(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(BRANCH_SCOPE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(BRANCH_SCOPE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}