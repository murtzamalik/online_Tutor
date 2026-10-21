import { redirect } from "next/navigation";

/** Flashcard decks live at /revise/decks/[deckId]; keep /revise/flashcards/[id] as a working URL. */
export default async function FlashcardsRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/revise/decks/${encodeURIComponent(id)}`);
}
