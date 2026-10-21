import { redirect } from "next/navigation";

/** Old and in-app "voice tutor" links: voice sessions live at /voice/{id}; /voice/new starts one. */
export default function TutorVoiceRedirect() {
  redirect("/voice/new");
}
