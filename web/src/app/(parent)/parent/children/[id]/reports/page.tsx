import { redirect } from "next/navigation";

/** Weekly reports are listed on the child overview; keep /reports as a working URL. */
export default async function ReportsIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/parent/children/${id}#reports`);
}
