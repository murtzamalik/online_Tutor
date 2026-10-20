import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe Markdown for approved revision notes: headings (#, ##, ###), bullet / numbered lists,
 * paragraphs, **bold** and *italic*. Text is rendered as React text nodes — never as HTML.
 */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        if (b.type === "h1") return <h2 key={i} className="mt-6 text-h2 first:mt-0">{inline(b.text)}</h2>;
        if (b.type === "h2") return <h3 key={i} className="mt-6 text-[18px] font-semibold text-neutral-900 first:mt-0">{inline(b.text)}</h3>;
        if (b.type === "h3") return <h4 key={i} className="mt-5 text-[16px] font-semibold text-neutral-900 first:mt-0">{inline(b.text)}</h4>;
        if (b.type === "ul")
          return (
            <ul key={i} className="mt-3 list-disc space-y-1.5 pl-5 text-neutral-800">
              {b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}
            </ul>
          );
        if (b.type === "ol")
          return (
            <ol key={i} className="mt-3 list-decimal space-y-1.5 pl-5 text-neutral-800">
              {b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}
            </ol>
          );
        return <p key={i} className="mt-3 leading-relaxed text-neutral-800 first:mt-0">{inline((b as { text: string }).text)}</p>;
      })}
    </div>
  );
}

type Block =
  | { type: "h1" | "h2" | "h3" | "p"; text: string }
  | { type: "ul" | "ol"; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const level = h[1].length;
      out.push({ type: level === 1 ? "h1" : level === 2 ? "h2" : "h3", text: h[2] });
      continue;
    }
    const ul = /^[-*•]\s+(.*)$/.exec(line);
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flush();
      const type: "ul" | "ol" = ul ? "ul" : "ol";
      const text = ul ? ul[1] : ol ? ol[1] : "";
      const last = out[out.length - 1];
      if (last && (last.type === "ul" || last.type === "ol") && last.type === type) last.items.push(text);
      else out.push({ type, items: [text] });
      continue;
    }
    para.push(line);
  }
  flush();
  return out;
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i} className="font-semibold text-neutral-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
