export function normalizeHtmlStyles(html: string): string {
  return html.replace(
    /(\b(?:color|background(?:-color)?|font-weight|font-size|font-style|text-align|text-decoration|width|height|max-width|margin(?:-\w+)?|padding(?:-\w+)?|line-height|opacity|border(?:-\w+)?|display|gap|flex(?:-\w+)?)\s*:\s*)(['"])(.*?)\2/gi,
    '$1$3',
  );
}
