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

export function makePathFilter(files: string[], opts: FilterOpts = {}): RegExp {
  const anchored = opts.anchored !== false;
  if (files.length === 0) return NEVER_MATCH;
  const alt = files.map((f) => escapeRegex(normalize(f))).join("|");
  return new RegExp(`${anchored ? "^" : ""}(${alt})`);
}

// Strip ANSI before regex test, but keep the original line in the output so users see
// the tool's colored output unchanged. Tools like tsgo prefix every error line with
// `\x1b[96m` when `FORCE_COLOR=1`, which breaks anchored regexes (`^<path>`) because the
// line starts with the escape byte, not the path.
export function filterLines(text: string, re: RegExp): string {
  return text
    .split(LINE_SPLIT)
    .filter((line) => re.test(line.replace(ANSI_RE, "")))
    .join("\n");
}
