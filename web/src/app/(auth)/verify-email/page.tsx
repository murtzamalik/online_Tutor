import { Suspense } from "react";
import VerifyEmailPage from "./VerifyEmailClient";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-12">Loading…</main>}>
      <VerifyEmailPage />
    </Suspense>
  );
}
