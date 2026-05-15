const REGEX_META = /[\\.[\]*^$()+?{}|]/g;
const NEVER_MATCH = /(?!)/;
const LINE_SPLIT = /\r?\n/;
// oxlint-disable-next-line no-control-regex -- intentional: stripping ANSI escape codes
const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function escapeRegex(input: string): string {
  return input.replace(REGEX_META, "\\$&");
}

function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}

type FilterOpts = { anchored?: boolean };

// Lookahead requires the char after the matched path to NOT be a path-name char, so
// `Bad.ts` does not falsely match `Bad.tsgo.ts`. Allowed delimiters: anything outside
// `[A-Za-z0-9_./-]` (typical tool output: `(`, `:`, `"`, space, etc.) or end-of-line.
const PATH_BOUNDARY = "(?=[^A-Za-z0-9_./\\-]|$)";

export function makePathFilter(files: string[], opts: FilterOpts = {}): RegExp {
  const anchored = opts.anchored !== false;
  if (files.length === 0) return NEVER_MATCH;
  const alt = files.map((f) => escapeRegex(normalize(f))).join("|");
  return new RegExp(`${anchored ? "^" : ""}(${alt})${PATH_BOUNDARY}`);
}

// Strip ANSI and normalise path separators before regex test, but keep the original line
// in the output so users see the tool's colored output unchanged. Tools like tsgo prefix
// every error line with `\x1b[96m` when `FORCE_COLOR=1`, which breaks anchored regexes
// (`^<path>`) because the line starts with the escape byte, not the path. On Windows
// some tools emit paths with backslashes while `makePathFilter` normalises to forward
// slashes — normalise the line too so the regex matches either form.
export function filterLines(text: string, re: RegExp): string {
  return text
    .split(LINE_SPLIT)
    .filter((line) => re.test(normalize(line.replace(ANSI_RE, ""))))
    .join("\n");
}
