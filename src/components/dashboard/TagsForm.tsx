"use client";

import type { Tag } from "@/lib/queries";
import { Button } from "@/components/ui/Button";

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
            className="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-sm has-[:checked]:border-gray-900 has-[:checked]:bg-gray-900 has-[:checked]:text-white"
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
      <Button type="submit" className="self-start">
        Enregistrer les tags
      </Button>
    </form>
  );
}
