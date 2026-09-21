import type { NavigationMenuItem } from "@nuxt/ui";

export type Alert = {
  id: number,
  text: string,
  hideAfter?: number
}

export type MenuFilters = "auth" | "guest" | "popover" | "inline" | "mobile";

export type FilteredNavigationMenuItem = NavigationMenuItem & {
  filterKeys: MenuFilters[]
}

export type UploadItem = File & { isCover?: boolean; existingPath?: string };
