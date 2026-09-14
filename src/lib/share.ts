// Builds the multi-line body ShareButton hands to the native share sheet on
// mobile (see its own comment for why desktop skips straight to a plain
// clipboard copy instead) — kept here rather than inlined at each call site
// since the place and event detail pages both need the same "what/when/
// where" shape.

export function placeShareText(name: string, address: string | null): string {
  const lines = [`Regarde cet endroit sur Posto : ${name}`];
  if (address) lines.push(address);
  return lines.join("\n");
}

export function eventShareText(title: string, dateLabel: string, address: string | null): string {
  const lines = [`Regarde cet événement sur Posto : ${title}`, dateLabel];
  if (address) lines.push(address);
  return lines.join("\n");
}
