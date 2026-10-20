"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { ForbiddenState, LoadingState } from "@/components/ui/states";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/w3";

type PhotoState = { status: "ready" } | { status: "disabled" } | { status: "forbidden"; message: string };

/** D-06 — Photograph paper (PRA-06 answers FEATURE_DISABLED until the camera pipeline ships). */
export default function Page() {
  const [state, setState] = useState<PhotoState | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const token = sessionStorage.getItem("accessToken") ?? undefined;
    api
      .photoPractice({}, token)
      .then(() => setState({ status: "ready" }))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) setState({ status: "forbidden", message: e.message });
        else setState({ status: "disabled" });
      });
  }, []);

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Practice" title="Photo marking" description="Snap a handwritten answer and get it marked against the mark scheme." />

      {!state ? (
        <LoadingState label="Checking photo marking…" />
      ) : state.status === "forbidden" ? (
        <ForbiddenState body={state.message || "Photo marking isn’t available on this account."} />
      ) : (
        <Card className="animate-rise p-6 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            {state.status === "ready" ? <CheckCircle size={26} weight="fill" className="text-brand-teal" /> : <Camera size={26} />}
          </span>
          <div className="mt-4 flex justify-center">
            <Badge tone={state.status === "ready" ? "teal" : "neutral"}>{state.status === "ready" ? "Available" : "Coming soon"}</Badge>
          </div>
          <h2 className="mt-3 text-h2">{state.status === "ready" ? "Photo marking is ready" : "Photo marking isn’t ready yet"}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-neutral-600">
            {state.status === "ready"
              ? "Your photo was accepted."
              : "We’re still building the camera step. Until then, type your answers and they’re marked straight away."}
          </p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/practice">Practise by typing</ButtonLink>
          </div>
        </Card>
      )}
    </AppPage>
  );
}
