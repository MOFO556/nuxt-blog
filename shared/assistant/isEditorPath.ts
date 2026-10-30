export function isAssistantEditorPath(path: string | undefined | null): boolean {
  if (!path)
    return false;
  const pathname = path.split('?')[0] ?? path;
  return /^\/office\/posts\/create\/?$/.test(pathname)
    || /^\/office\/posts\/\d+\/edit\/?$/.test(pathname);
}