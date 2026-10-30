/**
 * Returns null when the text cannot be made into valid JSON.
 */
export function repairToolCallJson(raw: string): string | null {
  let text = raw.trim();
  if (!text)
    return null;

  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1])
    text = fenced[1].trim();

  const tryParse = (candidate: string): string | null => {
    try {
      JSON.parse(candidate);
      return candidate;
    }
    catch {
      return null;
    }
  };

  const direct = tryParse(text);
  if (direct)
    return direct;

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start)
    return null;

  let slice = text.slice(start, end + 1);
  const parsedSlice = tryParse(slice);
  if (parsedSlice)
    return parsedSlice;

  // Trailing commas before } or ]
  slice = slice.replace(/,\s*([}\]])/g, '$1');
  const noTrailing = tryParse(slice);
  if (noTrailing)
    return noTrailing;

  // Unescaped newlines inside strings to spaces
  const noNewlines = tryParse(slice.replace(/[\r\n]+/g, ' '));
  if (noNewlines)
    return noNewlines;

  return null;
}