"use client";

import type { Tag } from "@/lib/queries";
import { SaveButton } from "@/components/ui/SaveButton";

export function TagsForm({
  allTags,
  selectedTagIds,
  action,
}: {
  allTags: Tag[];
  selectedTagIds: string[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => (
          <label
            key={tag.id}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-sm transition-colors has-[:checked]:border-gray-900 has-[:checked]:bg-gray-900 has-[:checked]:text-white"
          >
            <input
              type="checkbox"
              name="tag_ids"
              value={tag.id}
              defaultChecked={selectedTagIds.includes(tag.id)}
              className="hidden"
            />
            {tag.label}
          </label>
        ))}
      </div>
      <SaveButton className="self-start" savedLabel="Tags enregistrés">
        Enregistrer les tags
      </SaveButton>
    </form>
  );
}
