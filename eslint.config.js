import js from "@eslint/js";
import betterTailwind from "eslint-plugin-better-tailwindcss";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      eqeqeq: ["error", "always"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" }
      ]
    }
  },
  {
    // Build and check scripts are CLIs — printing to stdout is their job.
    files: ["scripts/**", "server.js"],
    rules: { "no-console": "off" }
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig
      }
    }
  },
  {
    // Tailwind class linting. `entryPoint` points the plugin at the real
    // stylesheet so the theme and any custom utilities in `app.css` are
    // recognised instead of being reported as unknown classes.
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.ts"],
    plugins: { "better-tailwindcss": betterTailwind },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app.css",
        // `.control`, `.field`, `.label` and friends are defined in
        // `@layer components` in the entry stylesheet. Without this they are
        // reported as unknown classes.
        detectComponentClasses: true
      }
    },
    rules: {
      ...betterTailwind.configs["recommended-warn"].rules,

      // Class ordering used to be handled by prettier-plugin-tailwindcss.
      // It lives here now, so keep it an error to preserve that guarantee.
      "better-tailwindcss/enforce-consistent-class-order": "error",

      // Correctness rather than style, so these fail the build.
      // `no-conflicting-classes` catches two utilities fighting over the same
      // property, where stylesheet order silently decides the winner.
      "better-tailwindcss/no-conflicting-classes": "error",
      "better-tailwindcss/no-unknown-classes": "error",

      // Prettier owns formatting — letting this rule wrap class lists too
      // would give two tools authority over the same bytes.
      "better-tailwindcss/enforce-consistent-line-wrapping": "off"
    }
  },
  {
    ignores: [
      "build/",
      ".svelte-kit/",
      "node_modules/",
      "static/",
      ".data/",
      "*.min.js"
    ]
  }
);
