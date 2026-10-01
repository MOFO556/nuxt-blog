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

export interface Pagination<T>{
  data: T
  pagination: {
    page: number,
    total: number
    limit: number
  }
}

export type ItemUploadMeta = File & { fileId?: number; existingPath?: string; description?: string };
export type ImageMeta = { name: string, path: string, description?: string };
