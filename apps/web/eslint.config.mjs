import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/**", "coverage/**"] },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      globals: { describe: "readonly", expect: "readonly", it: "readonly" }
    }
  }
];

export default config;
