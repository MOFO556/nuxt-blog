const TOOL_LABELS: Record<string, string> = {
  get_current_time: 'Checking the date…',
  search_web: 'Searching the web…',
  list_posts: 'Looking up posts…',
  search_posts_semantic: 'Searching related posts…',
  get_post: 'Opening post details…',
  list_tags: 'Loading tags…',
  propose_navigation: 'Suggesting a page…',
  propose_form_patch: 'Drafting form changes…',
  search_images: 'Searching images…',
  propose_stage_image: 'Suggesting an image…',
  propose_stage_images: 'Suggesting images…',
};

export function assistantToolLabel(toolName: string): string {
  const normalized = toolName.replace(/^tool-/, '').trim();
  return TOOL_LABELS[normalized] ?? 'Working…';
}