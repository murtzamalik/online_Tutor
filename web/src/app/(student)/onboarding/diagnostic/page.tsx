import { Suspense } from "react";
import { AppPage } from "@/components/ui/AppPage";
import { LoadingState } from "@/components/ui/states";
import Client from "./DiagnosticClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <AppPage width="content">
          <LoadingState label="Loading…" />
        </AppPage>
      }
    >
      <Client />
    </Suspense>
  );
}
