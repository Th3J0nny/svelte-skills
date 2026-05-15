import { delimiter, resolve } from "node:path";
import { $ } from "dax";
import { logSkip } from "../lib/dax-helpers.ts";
import { filterLines } from "../lib/filter-output.ts";
import { runChunked, runParallel } from "../lib/grouped.ts";
import { collectTestFiles } from "../lib/paths.ts";

const BIN_DIR = resolve("node_modules/.bin");
if (!process.env.PATH?.includes(BIN_DIR)) {
  process.env.PATH = `${BIN_DIR}${delimiter}${process.env.PATH ?? ""}`;
}
if (!process.env.FORCE_COLOR) process.env.FORCE_COLOR = "1";

// Configurable defaults — override via env vars if your project uses different paths/configs.
const TEST_GLOBS = (
  process.env.TEST_GLOBS ?? "src/**/*.test.ts,tests/**/*.test.ts"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const KNIP_TESTS_CONFIG = process.env.KNIP_TESTS_CONFIG ?? "knip.tests.jsonc";
const TSCONFIG_TESTS = process.env.TSCONFIG_TESTS ?? "tsconfig.tests.json";
const SVELTE_CHECK_FLAGS = (
  process.env.SVELTE_CHECK_FLAGS ?? "--tsgo --threshold error"
).split(" ");

const TEST_FILE_RE = /\.test\.ts/;

export async function lintTests(): Promise<boolean> {
  const files = await collectTestFiles();
  if (files.length === 0) {
    const reason = `no test files matched TEST_GLOBS=${TEST_GLOBS.join(",")}`;
    logSkip("oxlint", reason);
    logSkip("eslint", reason);
    logSkip("knip", reason);
    logSkip("svelte-check", reason);
    return true;
  }

  // oxlint does not expand globs from CLI args — must enumerate files. Chunked to fit
  // Windows cmd.exe limits. Runs as its own phase before runParallel because it spawns
  // N concurrent invocations that don't fit the "one task = one CommandBuilder" shape
  // of runParallel.
  const oxlintResult = await runChunked("oxlint", "oxlint", files);

  // Pass the resolved file list (not raw globs) so ESLint never sees a glob that matches
  // zero files. ESLint exits 1 on unmatched globs even when other globs do match — a
  // footgun when `TEST_GLOBS` includes both `src/**/*.test.ts` and `tests/**/*.test.ts`
  // and the project only has one of those dirs. `--no-warn-ignored` silences ESLint's
  // "File ignored because of a matching ignore pattern" warning for files covered by
  // `.gitignore` or excluded in `eslint.config.js`.
  const { ok: parallelOk } = await runParallel([
    { name: "eslint", cmd: $`eslint --no-warn-ignored ${files}` },
    {
      name: "knip",
      cmd: $`knip --config ${KNIP_TESTS_CONFIG} --include files,exports`,
    },
    {
      name: "svelte-check",
      cmd: $`svelte-check --tsconfig ${TSCONFIG_TESTS} ${SVELTE_CHECK_FLAGS}`,
      filter: (out) => filterLines(out, TEST_FILE_RE),
      ok: (filtered) => filtered.length === 0,
    },
  ]);

  return oxlintResult.ok && parallelOk;
}
