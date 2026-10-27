import type {
  ContentImageRewriteMaps,
  StagedUploadFile,
  UploadedWithTemp,
} from '~/types/posts';
import type { UploadMethodResultItem } from '~/types/forms';
import { collectContentImageIds } from '~~/shared/utils/collectContentImageIds';

function asUploadedWithTemp(
  items: UploadMethodResultItem[] | undefined,
): UploadedWithTemp[] {
  return items ?? [];
}

function realImageId(meta: UploadedWithTemp): number | undefined {
  if (typeof meta.id === 'number')
    return meta.id;
  
  if (typeof meta.fileId === 'number')
    return meta.fileId;
  
  return undefined;
}

export function buildClientTempIdMap(
  uploaded: Partial<Record<string, UploadMethodResultItem[]>>,
  staged: StagedUploadFile[],
): Record<string, number> {
  const idMap: Record<string, number> = {};
  const bags: UploadedWithTemp[] = [
    ...asUploadedWithTemp(uploaded.cover),
    ...asUploadedWithTemp(uploaded.contentImages),
    ...asUploadedWithTemp(uploaded.images),
  ];

  for (const meta of bags) {
    const id = realImageId(meta);
    if (meta.clientTempId && id !== undefined)
      idMap[meta.clientTempId] = id;    
  }

  for (const meta of bags) {
    const id = realImageId(meta);
    if (id === undefined)
      continue;
    
    const match = staged.find(file =>
      !idMap[file.clientTempId ?? '']
      && ((file.originalName || file.name) === meta.name || file.name === meta.name),
    );
    if (match?.clientTempId) {
      idMap[match.clientTempId] = id;
      match.fileId = id;
    }
  }

  return idMap;
}

export function annotateStagedFileIds(
  uploaded: Partial<Record<string, UploadMethodResultItem[]>>,
  staged: Array<Pick<StagedUploadFile, 'clientTempId' | 'fileId' | 'originalName' | 'name'>>,
): void {
  const bags: UploadedWithTemp[] = [
    ...asUploadedWithTemp(uploaded.cover),
    ...asUploadedWithTemp(uploaded.contentImages),
    ...asUploadedWithTemp(uploaded.images),
  ];

  for (const meta of bags) {
    const id = realImageId(meta);
    if (id === undefined)
      continue;
    
    const match = staged.find(file =>
      (meta.clientTempId && file.clientTempId === meta.clientTempId)
      || (file.originalName || file.name) === meta.name
      || file.name === meta.name,
    );
    if (match)
      match.fileId = id;
  }
}

export function publicImagePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function buildContentImageRewriteMaps(
  uploaded: Partial<Record<string, UploadMethodResultItem[]>>,
  staged: StagedUploadFile[],
): ContentImageRewriteMaps {
  const idMap = buildClientTempIdMap(uploaded, staged);
  const bags: UploadedWithTemp[] = [
    ...asUploadedWithTemp(uploaded.cover),
    ...asUploadedWithTemp(uploaded.contentImages),
    ...asUploadedWithTemp(uploaded.images),
  ];

  const pathById = new Map<number, string>();
  for (const meta of bags) {
    const id = realImageId(meta);
    if (id !== undefined && meta.path)
      pathById.set(id, publicImagePath(meta.path));
  }

  const pathMap: Record<string, string> = {};
  for (const [tempId, realId] of Object.entries(idMap)) {
    const path = pathById.get(realId);
    if (path)
      pathMap[tempId] = path;
  }

  const blobSrcMap: Record<string, string> = {};
  for (const file of staged) {
    const tempId = file.clientTempId;
    if (!tempId || !file.previewUrl)
      continue;
    const path = pathMap[tempId];
    if (path)
      blobSrcMap[file.previewUrl] = path;
  }

  return { idMap, pathMap, blobSrcMap };
}

export function buildLegacyAttachmentPayload(
  images: StagedUploadFile[],
): PostAttachmentPayload[] {
  return images
    .filter((file): file is StagedUploadFile & { fileId: number } => typeof file.fileId === 'number')
    .map(file => ({ id: file.fileId, postCover: !!file.postCover }));
}

export function buildFormattedAttachmentPayload(args: {
  contentJson: string;
  contentImages: StagedUploadFile[];
  cover: StagedUploadFile | undefined;
}): PostAttachmentPayload[] {
  const ids = new Set<number>(collectContentImageIds(args.contentJson));

  for (const file of args.contentImages) {
    if (typeof file.fileId === 'number')
      ids.add(file.fileId);
  }

  const coverId = args.cover?.fileId;
  if (typeof coverId === 'number')
    ids.add(coverId);

  return [...ids].map(imageId => ({
    id: imageId,
    postCover: coverId === imageId,
  }));
}

export function newClientTempId(): string {
  return `client:${crypto.randomUUID()}`;
}

export function toStagedUploadFile(
  file: File,
  extras: Omit<Partial<StagedUploadFile>, keyof File> = {},
): StagedUploadFile {
  return Object.assign(file, extras);
}

export function withClientTempId(file: File, tempId: string): StagedUploadFile {
  return toStagedUploadFile(file, { clientTempId: tempId });
}

export function coverFilesFromUploadValue(
  value: File | Blob | File[] | null | undefined,
): StagedUploadFile[] {
  if (!value)
    return [];
  
  if (Array.isArray(value))
    return value
      .filter((file): file is File => file instanceof File)
      .slice(0, 1)
      .map(file => toStagedUploadFile(file));
      
  if (value instanceof File)
    return [toStagedUploadFile(value)];
  
  return [toStagedUploadFile(
    new File([value], 'cover', { type: value.type || 'application/octet-stream' }),
  )];
}