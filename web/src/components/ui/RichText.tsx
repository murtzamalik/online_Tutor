"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/contrib/mhchem";
import "katex/dist/katex.min.css";

/**
 * Renders tutor / question text with chemistry and maths: `\ce{...}` (mhchem), `$...$` and `\(...\)`.
 * Plain text segments are escaped by React; only the formula segments go through KaTeX
 * (trust: false, so no raw HTML/links from model output).
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => split(text ?? ""), [text]);
  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {parts.map((p, i) =>
        p.math ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: render(p.value) }} />
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </span>
  );
}

type Part = { math: boolean; value: string };

function split(text: string): Part[] {
  const out: Part[] = [];
  let i = 0;
  let buf = "";
  while (i < text.length) {
    if (text.startsWith("\\ce{", i)) {
      const end = matchBrace(text, i + 3);
      if (end > 0) {
        if (buf) out.push({ math: false, value: buf });
        buf = "";
        out.push({ math: true, value: text.slice(i, end + 1) });
        i = end + 1;
        continue;
      }
    }
    if (text[i] === "$" && text[i + 1] !== "$") {
      const end = text.indexOf("$", i + 1);
      if (end > i + 1 && !text.slice(i + 1, end).includes("\n")) {
        if (buf) out.push({ math: false, value: buf });
        buf = "";
        out.push({ math: true, value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text.startsWith("\\(", i)) {
      const end = text.indexOf("\\)", i + 2);
      if (end > 0) {
        if (buf) out.push({ math: false, value: buf });
        buf = "";
        out.push({ math: true, value: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  if (buf) out.push({ math: false, value: buf });
  return out;
}

function matchBrace(text: string, open: number): number {
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === "{") depth++;
    else if (text[j] === "}") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

function render(tex: string): string {
  try {
    return katex.renderToString(tex, { throwOnError: false, trust: false, output: "html" });
  } catch {
    return tex.replace(/[<>&]/g, "");
  }
}
