// Page size for the home page's "Voir plus" pagination (see HomeExplorer
// and app/actions/explore.ts) — one call per click, not the whole catalog
// on first paint. 9 keeps a full last row on the 3-column desktop grid
// (lg:grid-cols-3) instead of a dangling 1-2 item row.
//
// Plain constant, not defined in app/actions/explore.ts itself: a file with
// the "use server" directive can only export async functions (same reason
// the dashboard's action files keep their shared sync helpers in a
// separate actions/shared.ts rather than inline).
export const EXPLORE_PAGE_SIZE = 9;
