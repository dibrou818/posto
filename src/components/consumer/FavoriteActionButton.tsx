"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginPrompt } from "@/components/consumer/LoginPrompt";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
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
}: {
  userId: string | null;
  active: boolean;
  labels: { off: string; on: string };
  ariaLabels: { off: string; on: string };
  prompt: { title: string; description: string };
  onToggle: (supabase: ReturnType<typeof createClient>, userId: string, active: boolean) => PromiseLike<{ error: unknown }>;
}) {
  const [on, setOn] = useState(active);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (!userId) {
      setPromptOpen(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await onToggle(createClient(), userId, on);
      if (result.error) throw result.error;
      setOn((value) => !value);
      router.refresh();
    } catch {
      setError("Impossible d’enregistrer ce changement. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-busy={pending}
        aria-pressed={on}
        aria-label={on ? ariaLabels.on : ariaLabels.off}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60 ${
          on
            ? "border-brand bg-white text-brand hover:bg-gray-50"
            : "border-brand bg-brand text-white hover:bg-brand-hover"
        }`}
      >
        <BookmarkIcon filled={on} />
        {on ? labels.on : labels.off}
      </button>
      {error && <p role="alert" className="max-w-64 text-sm text-red-700">{error}</p>}
      {promptOpen && (
        <LoginPrompt title={prompt.title} description={prompt.description} onClose={() => setPromptOpen(false)} />
      )}
    </div>
  );
}
