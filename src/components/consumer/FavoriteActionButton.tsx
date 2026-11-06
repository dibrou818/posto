"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginPrompt } from "@/components/consumer/LoginPrompt";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <path d="M5 3.5h10a1 1 0 0 1 1 1v12l-6-3.6-6 3.6v-12a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
    </svg>
  );
}

/** The one "keep this" control shared by place pages (Suivre) and event
 * pages (Enregistrer) — same shape, same icon, same colours, so the two
 * read as the same gesture. Solid brand blue while there's something to
 * do, outlined once done; the only blue button on those pages, which is
 * what sets it apart from the neutral info/link buttons around it. */
export function FavoriteActionButton({
  userId,
  active,
  labels,
  ariaLabels,
  prompt,
  onToggle,
  tone = "primary",
}: {
  userId: string | null;
  active: boolean;
  labels: { off: string; on: string };
  ariaLabels: { off: string; on: string };
  prompt: { title: string; description: string };
  onToggle: (supabase: ReturnType<typeof createClient>, userId: string, active: boolean) => PromiseLike<{ error: unknown }>;
  tone?: "primary" | "secondary";
}) {
  const [on, setOn] = useState(active);
  // Bumped each time the button turns on, to replay the small "pop" on its
  // icon (the key remounts it).
  const [popKey, setPopKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (!userId) {
      setPromptOpen(true);
      return;
    }
    // Optimistic: the button answers the tap immediately and is put back
    // only if the save fails — waiting on the network made it feel dead.
    const previous = on;
    setError(null);
    setOn(!previous);
    if (!previous) setPopKey((key) => key + 1);
    try {
      const result = await onToggle(createClient(), userId, previous);
      if (result.error) throw result.error;
      router.refresh();
    } catch {
      setOn(previous);
      setError("Impossible d’enregistrer ce changement. Réessayez.");
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? ariaLabels.on : ariaLabels.off}
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium whitespace-nowrap transition-[transform,background-color,border-color] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 active:scale-[0.98] ${
          on
            ? "border-brand bg-white text-brand hover:bg-gray-50"
            : tone === "primary"
              ? "border-brand bg-brand text-on-accent hover:bg-brand-hover"
              : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
        }`}
      >
        <span key={popKey} className={popKey > 0 ? "posto-pop" : undefined}>
          <BookmarkIcon filled={on} />
        </span>
        {on ? labels.on : labels.off}
      </button>
      {error && <p role="alert" className="max-w-64 text-sm text-red-700">{error}</p>}
      {promptOpen && (
        <LoginPrompt title={prompt.title} description={prompt.description} onClose={() => setPromptOpen(false)} />
      )}
    </div>
  );
}
