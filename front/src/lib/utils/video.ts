export function getVideoEmbedUrl(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./,'');
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|shorts|v|live)\/([^/]+)/)?.[1] || null;
    }
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
  } catch { /* Existing embed providers keep their original URL. */ }
  return value;
}
