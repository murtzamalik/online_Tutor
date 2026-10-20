import type { ReactNode } from "react";

/** Renders inline **bold** only; everything else stays plain text (no HTML injection). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

/**
 * Minimal, safe markdown for report narratives: "## heading", "**Section**" lines, "- bullets", paragraphs.
 */
export function Narrative({ markdown }: { markdown: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5 text-neutral-700">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    flush();
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(
        <h3 key={blocks.length} className="text-[17px] font-semibold text-neutral-900">
          {inline(heading[1])}
        </h3>,
      );
    } else if (/^\*\*[^*]+\*\*$/.test(line)) {
      blocks.push(
        <p key={blocks.length} className="pt-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">
          {line.slice(2, -2)}
        </p>,
      );
    } else {
      blocks.push(
        <p key={blocks.length} className="leading-relaxed text-neutral-800">
          {inline(line)}
        </p>,
      );
    }
  }
  flush();
  return <div className="space-y-3 text-[15px]">{blocks}</div>;
}
