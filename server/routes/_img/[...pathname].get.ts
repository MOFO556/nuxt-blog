import { blob } from "hub:blob";
import {
  createError,
  eventHandler,
  getQuery,
  getRouterParam,
  setHeader,
} from "h3";
import sharp from "sharp";

const FIT_MAP = {
  cover: "cover",
  contain: "contain",
  fill: "fill",
  inside: "inside",
  outside: "outside",
} as const;

type Fit = keyof typeof FIT_MAP;

function asPositiveInt(value: unknown): number | undefined {
  const n = typeof value === "string" || typeof value === "number" 
    ? Number(value) 
    : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

export default eventHandler(async (event) => {
  const pathname = getRouterParam(event, "pathname");
  if (!pathname)
    throw createError({ statusCode: 404, statusMessage: "Not Found" });

  const file = await blob.get(pathname);
  if (!file)
    throw createError({ statusCode: 404, statusMessage: "Not Found" });

  const query = getQuery(event);
  const width = asPositiveInt(query.w);
  const height = asPositiveInt(query.h);
  const quality = asPositiveInt(query.q) ?? 80;
  const format = typeof query.f === "string" ? query.f : undefined;
  const fitKey = typeof query.fit === "string" && query.fit in FIT_MAP
    ? (query.fit as Fit)
    : "inside";

  const input = Buffer.from(await file.arrayBuffer());
  let pipeline = sharp(input, { failOn: "none" });

  if (width || height) {
    pipeline = pipeline.resize({
      width,
      height,
      fit: FIT_MAP[fitKey],
      withoutEnlargement: true,
    });
  }

  switch (format) {
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality });
      break;
    case "jpeg":
    case "jpg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png();
      break;
    default:
      break;
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  setHeader(event, "Content-Type", `image/${info.format}`);
  setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");

  return data;
});
