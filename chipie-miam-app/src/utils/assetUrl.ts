/** Prefix a root-relative path with Vite's base URL (needed for GitHub Pages). */
export function assetUrl(path: string): string {
  if (path.startsWith('/') && !path.startsWith('//')) {
    return `${import.meta.env.BASE_URL}${path.slice(1)}`
  }
  return path
}
