import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/**
 * Minimal, safe Markdown renderer for CMS copy (legal docs, FAQ answers, help articles, resources).
 * Supports headings, paragraphs, bullet / numbered lists, blockquotes, rules and inline
 * **bold**, *italic*, `code` and [links](url). No raw HTML is ever injected.
 */

export type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "rule" };

type ListBlock = { kind: "ul" | "ol"; items: string[] };

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const cur: { para: string[]; list: ListBlock | null; quote: string[] } = { para: [], list: null, quote: [] };

  const flush = () => {
    if (cur.para.length) blocks.push({ kind: "paragraph", text: cur.para.join(" ") });
    if (cur.list) blocks.push(cur.list);
    if (cur.quote.length) blocks.push({ kind: "quote", text: cur.quote.join(" ") });
    cur.para = [];
    cur.list = null;
    cur.quote = [];
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2].replace(/#+\s*$/, "").trim() });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flush();
      blocks.push({ kind: "rule" });
      continue;
    }
    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    const item = bullet ?? numbered;
    if (item) {
      const kind: ListBlock["kind"] = bullet ? "ul" : "ol";
      if (cur.para.length || cur.quote.length || (cur.list && cur.list.kind !== kind)) flush();
      const list: ListBlock = cur.list ?? { kind, items: [] };
      list.items.push(item[1]);
      cur.list = list;
      continue;
    }
    if (trimmed.startsWith(">")) {
      if (cur.para.length || cur.list) flush();
      cur.quote.push(trimmed.replace(/^>\s?/, ""));
      continue;
    }
    if (cur.list && /^\s{2,}/.test(raw)) {
      // continuation of the previous list item
      cur.list.items[cur.list.items.length - 1] += ` ${trimmed}`;
      continue;
    }
    if (cur.list || cur.quote.length) flush();
    cur.para.push(trimmed);
  }
  flush();
  return blocks;
}

function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(h) || (h.startsWith("/") && !h.startsWith("//")) || h.startsWith("#")) return h;
  return null;
}

/** Inline formatting: links, bold, italic, code. */
export function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(`([^`]+)`)|(\*([^*]+)\*)|(_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${n++}`;
    if (m[1]) {
      const href = safeHref(m[3]);
      out.push(
        href ? (
          <a
            key={key}
            href={href}
            className="font-medium text-brand-navy underline underline-offset-2 hover:text-brand-teal"
            {...(/^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {m[2]}
          </a>
        ) : (
          m[2]
        ),
      );
    } else if (m[4] || m[6]) {
      out.push(
        <strong key={key} className="font-semibold text-neutral-900">
          {m[5] ?? m[7]}
        </strong>,
      );
    } else if (m[8]) {
      out.push(
        <code key={key} className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.9em] text-neutral-900">
          {m[9]}
        </code>,
      );
    } else {
      out.push(<em key={key}>{m[11] ?? m[13]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Slug used for heading anchors (legal table of contents). */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Plain-text version of a Markdown string, for excerpts. */
export function markdownToText(src: string | null | undefined): string {
  if (!src) return "";
  return src
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(src: string | null | undefined, max = 180): string {
  const text = markdownToText(src);
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function Markdown({
  source,
  className,
  size = "md",
  skipFirstH1 = false,
}: {
  source: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
  /** Drop a leading `# Title` when the page already shows the title. */
  skipFirstH1?: boolean;
}) {
  let blocks = parseMarkdown(source ?? "");
  if (skipFirstH1 && blocks[0]?.kind === "heading" && blocks[0].level === 1) blocks = blocks.slice(1);
  const body = size === "sm" ? "text-[15px] leading-relaxed" : "text-[16px] leading-[1.7]";
  return (
    <div className={cx("space-y-4 text-neutral-700", body, className)}>
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        switch (b.kind) {
          case "heading": {
            const id = headingId(b.text);
            if (b.level <= 1)
              return (
                <h2 key={key} id={id} className="scroll-mt-24 pt-2 text-h1 text-neutral-900">
                  {renderInline(b.text, key)}
                </h2>
              );
            if (b.level === 2)
              return (
                <h2 key={key} id={id} className="scroll-mt-24 pt-4 text-h2 text-neutral-900">
                  {renderInline(b.text, key)}
                </h2>
              );
            return (
              <h3 key={key} id={id} className="scroll-mt-24 pt-2 text-[17px] font-semibold text-neutral-900">
                {renderInline(b.text, key)}
              </h3>
            );
          }
          case "paragraph":
            return <p key={key}>{renderInline(b.text, key)}</p>;
          case "ul":
            return (
              <ul key={key} className="list-disc space-y-1.5 pl-6 marker:text-neutral-400">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="list-decimal space-y-1.5 pl-6 marker:text-neutral-500">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={key} className="border-l-4 border-brand-teal/40 pl-4 italic text-neutral-600">
                {renderInline(b.text, key)}
              </blockquote>
            );
          case "rule":
            return <hr key={key} className="border-neutral-200" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
