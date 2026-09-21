/** Only internal absolute paths may be used after authentication. */
export function safeAuthRedirect(path?: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u0020]/.test(path)) return "/account";
  return path;
}
