import { Suspense } from "react";
import Client from "./DiagnosticClient";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-12">Loading…</main>}>
      <Client />
    </Suspense>
  );
}
