import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["**/out", "**/dist", "**/*.d.ts", "**/examples"],
  },
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 6,
      sourceType: "module",
    },

    rules: {
      "@typescript-eslint/naming-convention": "off",
      curly: "off",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
      semi: "off",
    },
  },
];
