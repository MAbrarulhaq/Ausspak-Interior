/** Image URLs from the API are relative (/media/...). Prefix the API origin when the frontend is served from another origin. */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${import.meta.env.VITE_API_BASE_URL || ''}${url}`;
}
