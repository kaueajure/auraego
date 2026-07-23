import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**", "**/generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
    }
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: { window: "readonly", document: "readonly", localStorage: "readonly", navigator: "readonly", requestAnimationFrame: "readonly", HTMLInputElement: "readonly", setTimeout: "readonly" } }
  },
  {
    files: ["apps/server/**/*.ts"],
    languageOptions: { globals: { process: "readonly", Buffer: "readonly", console: "readonly", setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly" } }
  }
);
