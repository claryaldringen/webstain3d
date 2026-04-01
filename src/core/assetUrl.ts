/** Prefix a relative asset path with Vite's base URL (e.g. '/wolf3d/'). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}${path.startsWith('/') ? path.slice(1) : path}`;
}
