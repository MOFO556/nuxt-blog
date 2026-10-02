import { defineProvider } from "@nuxt/image/runtime";
import { encodePath } from "ufo";

export default defineProvider({
  getImage(src, { modifiers }) {
    const path = encodePath(src.replace(/^\//, ""));
    const params = new URLSearchParams();

    if (modifiers.width) 
      params.set("w", String(modifiers.width));
    if (modifiers.height) 
      params.set("h", String(modifiers.height));
    if (modifiers.quality) 
      params.set("q", String(modifiers.quality));
    if (modifiers.format && modifiers.format !== "auto")
      params.set("f", String(modifiers.format));
    if (modifiers.fit) 
      params.set("fit", String(modifiers.fit));

    const qs = params.toString();
    return { url: `/_img/${path}${qs ? `?${qs}` : ""}` };
  },
});
