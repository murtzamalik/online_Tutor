"use client";
import { ChangeEvent, useState } from "react";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { Camera } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Card, Checkbox, PageHeader } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/RichText";
import { cx } from "@/components/ui/cx";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/w4";

const MAX_SIDE = 1600;
const MAX_BYTES = 3 * 1024 * 1024;

type Step = { stepNo: number; guidance: string; promptToStudent: string };

/** Downscales in the browser so only a small JPEG leaves the device. */
async function toJpegDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function approxBytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((b64.length * 3) / 4);
}

/** F-08 Photo-of-stuck walkthrough — the student covers personal details, then gets hints one step at a time. */
export default function TutorPhotoPage() {
  const [image, setImage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [shown, setShown] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await toJpegDataUrl(file);
      if (approxBytes(dataUrl) > MAX_BYTES) {
        setError("That photo is too large. Try a closer photo of just the question.");
        return;
      }
      setImage(dataUrl);
    } catch {
      setError("We couldn't read that file. Please choose a JPEG or PNG photo.");
    }
  }

  async function submit() {
    if (!image || !confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.photoWalkthrough({
        imageBase64: image,
        maskReport: { header_masked: true, user_confirmed_crop: true, regions: [] },
      });
      setResult(r);
      setShown(1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else setError(e instanceof ApiError ? e.message : "Walkthrough failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const steps: Step[] = result?.steps ?? [];

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Tutor"
        title="Stuck on a question?"
        description="Take a photo of a question you haven't answered yet. You'll get one hint at a time — never the full answer."
      />
      {forbidden ? (
        <ForbiddenState body="The tutor has been turned off by your parent." />
      ) : (
        <Card className="p-6">
          <label
            htmlFor="photo-input"
            className={cx(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 text-center transition-colors duration-fast",
              image ? "border-neutral-200 p-3" : "border-neutral-200 py-10 hover:border-brand-navy hover:bg-brand-navySoft/40",
            )}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Preview of your photo" className="max-h-80 rounded-md" />
            ) : (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navySoft text-brand-navy"><Camera size={24} /></span>
                <span className="mt-3 font-semibold text-neutral-900">Take or choose a photo</span>
                <span className="mt-1 text-caption text-neutral-600">JPEG or PNG · crop it to just the question</span>
              </>
            )}
            <input id="photo-input" className="sr-only" type="file" accept="image/jpeg,image/png" capture="environment" onChange={onFile} disabled={busy} />
          </label>
          {image && (
            <p className="mt-2 text-center text-caption text-neutral-600">
              <label htmlFor="photo-input" className="cursor-pointer font-semibold text-brand-navy underline">Choose a different photo</label>
            </p>
          )}
          <Checkbox
            className="mt-5"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            label="I've cropped or covered my name, school and candidate number — only the question is showing."
          />
          <div className="mt-5 flex justify-end">
            <Button onClick={submit} loading={busy} disabled={!image || !confirmed}>Get help with this question</Button>
          </div>
        </Card>
      )}
      {busy && <div className="mt-6"><LoadingState label="Reading your question…" /></div>}
      {error && <div className="mt-6"><ErrorState body={error} /></div>}
      {result && result.blocked && (
        <Callout tone="brand" className="mt-6 whitespace-pre-wrap">{result.walkthrough}</Callout>
      )}
      {result && !result.blocked && (
        <section className="mt-6 space-y-4 animate-slide-up" aria-live="polite">
          <Card className="p-5">
            <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">I think the question asks</p>
            <p className="mt-1.5 text-body-lg text-neutral-900"><RichText text={result.questionUnderstoodAs} /></p>
            {result.askStudentToConfirm && (
              <Callout tone="warning" className="mt-3">The photo was hard to read — check this matches your question before you go on.</Callout>
            )}
          </Card>
          <ol className="space-y-3">
            {steps.slice(0, shown).map((s) => (
              <li key={s.stepNo} className="flex gap-3 rounded-lg border border-brand-teal/20 bg-brand-tealSoft p-4 animate-slide-up">
                <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-teal text-caption font-bold text-white">{s.stepNo}</span>
                <div>
                  <p className="font-semibold text-neutral-900"><RichText text={s.guidance} /></p>
                  <p className="mt-1 text-[14px] text-neutral-700"><RichText text={s.promptToStudent} /></p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            {shown < steps.length ? (
              <Button variant="secondary" onClick={() => setShown((n) => n + 1)}>Show next hint ({shown}/{steps.length})</Button>
            ) : (
              <p className="text-[14px] text-neutral-600">That&apos;s every hint — now have a go at the final answer yourself.</p>
            )}
            <ButtonLink href="/tutor" variant="tertiary">Talk it through with the tutor</ButtonLink>
          </div>
        </section>
      )}
    </AppPage>
  );
}
