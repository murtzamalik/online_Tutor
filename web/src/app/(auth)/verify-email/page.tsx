import { Suspense } from "react";
import { AuthCard } from "@/components/shell/AuthLayout";
import { LoadingState } from "@/components/ui/states";
import VerifyEmailPage from "./VerifyEmailClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <AuthCard audience="family" title="Check your inbox">
          <LoadingState label="Loading…" />
        </AuthCard>
      }
    >
      <VerifyEmailPage />
    </Suspense>
  );
}
