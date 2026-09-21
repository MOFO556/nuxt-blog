export async function urlToFile(rawUrl: string, filename?: string): Promise<File> {
  
  const url = rawUrl.startsWith('http')
    ? rawUrl
    : '/' + rawUrl.replace(/^\/+/, '');
    
  const res = await fetch(url);
  if (!res.ok) 
    throw new Error(`Failed to fetch ${url}`);
  const blob = await res.blob();
  const name = filename ?? decodeURIComponent(url.split('/').pop() || 'image');
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}