"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { errorMessage, isForbidden } from "./format";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "forbidden" }
  | { status: "ready"; data: T };

/**
 * Loads data once per `deps` change and tracks loading / error / forbidden (403) / ready.
 * `setData` lets a page swap in the result of a mutation without refetching.
 */
export function useLoad<T>(
  load: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  fallbackError: string,
): { state: LoadState<T>; reload: () => Promise<void>; retry: () => void; setData: (data: T) => void } {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const loadRef = useRef(load);
  loadRef.current = load;
  const seq = useRef(0);

  const run = useCallback(
    async (showLoading: boolean) => {
      const mine = ++seq.current;
      if (showLoading) setState({ status: "loading" });
      try {
        const data = await loadRef.current();
        if (mine === seq.current) setState({ status: "ready", data });
      } catch (err) {
        if (mine !== seq.current) return;
        setState(isForbidden(err) ? { status: "forbidden" } : { status: "error", message: errorMessage(err, fallbackError) });
      }
    },
    [fallbackError],
  );

  useEffect(() => {
    void run(true);
    return () => {
      seq.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => run(false), [run]);
  const retry = useCallback(() => void run(true), [run]);
  const setData = useCallback((data: T) => setState({ status: "ready", data }), []);
  return { state, reload, retry, setData };
}

/** Renders the non-ready states; calls `children` with the data once ready. */
export function LoadView<T>({
  state,
  onRetry,
  forbiddenBody = "This page is only available to the parent account linked to this child.",
  loadingLines,
  children,
}: {
  state: LoadState<T>;
  onRetry?: () => void;
  forbiddenBody?: string;
  loadingLines?: number;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "loading") return <LoadingState lines={loadingLines} />;
  if (state.status === "forbidden") return <ForbiddenState body={forbiddenBody} />;
  if (state.status === "error")
    return (
      <ErrorState
        body={state.message}
        action={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
      />
    );
  return <>{children(state.data)}</>;
}
