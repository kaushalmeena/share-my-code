import { StreamLanguage, type LanguageSupport } from "@codemirror/language";

/**
 * Language registry.
 *
 * Every grammar is behind a dynamic import so the initial bundle carries none
 * of them — a room only downloads the one it is actually set to, and switching
 * languages fetches the new grammar on demand.
 */

export type LanguageDefinition = {
  id: string;
  label: string;
  /** Extensions used to guess a language from a pasted filename. */
  extensions: string[];
  load: () => Promise<
    LanguageSupport | ReturnType<typeof StreamLanguage.define>
  >;
};

/** Wrap a CodeMirror 5 style legacy mode as a modern language. */
const legacy =
  (load: () => Promise<Parameters<typeof StreamLanguage.define>[0]>) =>
  async () =>
    StreamLanguage.define(await load());

export const LANGUAGES: LanguageDefinition[] = [
  {
    id: "plaintext",
    label: "Plain text",
    extensions: ["txt"],
    load: async () =>
      StreamLanguage.define({ token: (stream) => (stream.next(), null) })
  },
  {
    id: "javascript",
    label: "JavaScript",
    extensions: ["js", "mjs", "cjs", "jsx"],
    load: async () =>
      (await import("@codemirror/lang-javascript")).javascript({ jsx: true })
  },
  {
    id: "typescript",
    label: "TypeScript",
    extensions: ["ts", "mts", "tsx"],
    load: async () =>
      (await import("@codemirror/lang-javascript")).javascript({
        typescript: true,
        jsx: true
      })
  },
  {
    id: "python",
    label: "Python",
    extensions: ["py"],
    load: async () => (await import("@codemirror/lang-python")).python()
  },
  {
    id: "html",
    label: "HTML",
    extensions: ["html", "htm"],
    load: async () => (await import("@codemirror/lang-html")).html()
  },
  {
    id: "css",
    label: "CSS",
    extensions: ["css"],
    load: async () => (await import("@codemirror/lang-css")).css()
  },
  {
    id: "json",
    label: "JSON",
    extensions: ["json"],
    load: async () => (await import("@codemirror/lang-json")).json()
  },
  {
    id: "markdown",
    label: "Markdown",
    extensions: ["md", "markdown"],
    load: async () => (await import("@codemirror/lang-markdown")).markdown()
  },
  {
    id: "rust",
    label: "Rust",
    extensions: ["rs"],
    load: async () => (await import("@codemirror/lang-rust")).rust()
  },
  {
    id: "go",
    label: "Go",
    extensions: ["go"],
    load: async () => (await import("@codemirror/lang-go")).go()
  },
  {
    id: "java",
    label: "Java",
    extensions: ["java"],
    load: async () => (await import("@codemirror/lang-java")).java()
  },
  {
    id: "cpp",
    label: "C / C++",
    extensions: ["c", "h", "cc", "cpp", "hpp"],
    load: async () => (await import("@codemirror/lang-cpp")).cpp()
  },
  {
    id: "php",
    label: "PHP",
    extensions: ["php"],
    load: async () => (await import("@codemirror/lang-php")).php()
  },
  {
    id: "sql",
    label: "SQL",
    extensions: ["sql"],
    load: async () => (await import("@codemirror/lang-sql")).sql()
  },
  {
    id: "xml",
    label: "XML",
    extensions: ["xml", "svg"],
    load: async () => (await import("@codemirror/lang-xml")).xml()
  },
  {
    id: "yaml",
    label: "YAML",
    extensions: ["yml", "yaml"],
    load: async () => (await import("@codemirror/lang-yaml")).yaml()
  },
  {
    id: "shell",
    label: "Shell",
    extensions: ["sh", "bash", "zsh"],
    load: legacy(
      async () => (await import("@codemirror/legacy-modes/mode/shell")).shell
    )
  },
  {
    id: "ruby",
    label: "Ruby",
    extensions: ["rb"],
    load: legacy(
      async () => (await import("@codemirror/legacy-modes/mode/ruby")).ruby
    )
  },
  {
    id: "swift",
    label: "Swift",
    extensions: ["swift"],
    load: legacy(
      async () => (await import("@codemirror/legacy-modes/mode/swift")).swift
    )
  },
  {
    id: "kotlin",
    label: "Kotlin",
    extensions: ["kt", "kts"],
    load: legacy(
      async () => (await import("@codemirror/legacy-modes/mode/clike")).kotlin
    )
  },
  {
    id: "csharp",
    label: "C#",
    extensions: ["cs"],
    load: legacy(
      async () => (await import("@codemirror/legacy-modes/mode/clike")).csharp
    )
  },
  {
    id: "lua",
    label: "Lua",
    extensions: ["lua"],
    load: legacy(
      async () => (await import("@codemirror/legacy-modes/mode/lua")).lua
    )
  },
  {
    id: "toml",
    label: "TOML",
    extensions: ["toml"],
    load: legacy(
      async () => (await import("@codemirror/legacy-modes/mode/toml")).toml
    )
  },
  {
    id: "dockerfile",
    label: "Dockerfile",
    extensions: ["dockerfile"],
    load: legacy(
      async () =>
        (await import("@codemirror/legacy-modes/mode/dockerfile")).dockerFile
    )
  },
  {
    id: "diff",
    label: "Diff",
    extensions: ["diff", "patch"],
    load: legacy(
      async () => (await import("@codemirror/legacy-modes/mode/diff")).diff
    )
  }
];

export const DEFAULT_LANGUAGE_ID = "javascript";

const byId = new Map(LANGUAGES.map((language) => [language.id, language]));

export function findLanguage(id: string | undefined): LanguageDefinition {
  return (
    (id ? byId.get(id) : undefined) ??
    byId.get(DEFAULT_LANGUAGE_ID) ??
    // The registry is never empty, but the type system does not know that.
    (LANGUAGES[0] as LanguageDefinition)
  );
}
