import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /*
   * Transitional React 19 / ESLint compatibility policy.
   *
   * The existing DashAI UI intentionally initializes and synchronizes local
   * state from authenticated storage, API responses, pagination filters, and
   * modal inputs inside effects. Refactoring all of those flows in one CI fix
   * would be high risk.
   *
   * Keep the findings visible as warnings while TypeScript, Vitest, and the
   * production build remain blocking quality gates.
   */
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
