// Types admis par .claude/loop.md ; sujets en français, en minuscules sauf noms propres et identifiants.
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "content",
        "seo",
        "a11y",
      ],
    ],
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 200],
  },
};

export default config;
