import { z } from 'zod';
import type { UploadMethodResultItem } from '~/types/forms';
import type {
  ImagePreviewModalState,
  Post,
  PostEditorExpose,
  PostFormData,
  PostFormProps,
  PostImageMeta,
  PostModeOption,
  Tag,
} from '~/types/posts';
import { PostMode, POST_MODE_VALUES } from '~~/shared/types/posts';
import { slugify } from '~~/shared/utils/slugify';
import { rewriteContentImageIds } from '~~/shared/utils/rewriteContentImageIds';
import { resolveModeSwitch, resolveModeSwitchFiles } from '~/utils/postContentMode';
import {
  annotateStagedFileIds,
  buildContentImageRewriteMaps,
  buildFormattedAttachmentPayload,
  buildLegacyAttachmentPayload,
  coverFilesFromUploadValue,
  newClientTempId,
  toStagedUploadFile,
  withClientTempId,
} from '~/utils/postUploadIds';

const postFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  url: z.string().min(1, 'URL is required'),
  images: z.array(z.instanceof(Object)).optional(),
  cover: z.array(z.instanceof(Object)).optional(),
  contentImages: z.array(z.instanceof(Object)).optional(),
  description: z.string().optional(),
  contentHtml: z.string().optional(),
  mode: z.enum(POST_MODE_VALUES),
});

export async function usePostForm(props: PostFormProps) {
  const {
    title = '',
    content = '',
    url = '',
    contentHtml = '',
    description = '',
    mode: initialMode = PostMode.Legacy,
    images,
    tags = [],
    id,
  } = props;

  const { $api } = useNuxtApp();
  const coverIndex = ref<number | null>(null);
  const editorRef = ref<PostEditorExpose | null>(null);

  const imagePreviewModal = reactive<ImagePreviewModalState>({
    open: false,
  });

  const modeLocked = computed(() => !!id);
  const modeItems: PostModeOption[] = [
    { label: 'Legacy', value: PostMode.Legacy },
    { label: 'Formatted', value: PostMode.Formatted },
  ];

  const { data: fetchedTags } = await useAsyncData(
    `all-tags-on-post-${id}-edit`,
    $api.tags.all,
    { default: (): Tag[] => [] },
  );

  const allTags = ref<Tag[]>([...(fetchedTags.value ?? [])]);

  const form = useForm<PostFormData, Post>(
    {
      title,
      content,
      url,
      images: [],
      cover: [],
      contentImages: [],
      description: description ?? '',
      contentHtml: contentHtml ?? '',
      mode: initialMode,
      tags,
      ...(id ? { id } : {}),
    },
    'id',
    async (res) => {
      const postId = id ?? res?.id;
      if (!postId)
        return;
      if (id)
        await refreshNuxtData(`office-post-${id}`);
      await navigateTo(`/office/posts/${postId}`);
    },
    postFormSchema,
  );

  const isFormatted = computed(() => form.value.mode === PostMode.Formatted);

  const coverModel = computed<File | null | undefined>({
    get: () => form.value.cover[0] ?? null,
    set: (value) => {
      form.value.cover = coverFilesFromUploadValue(value);
    },
  });

  watch(
    () => form.value.mode,
    (mode, previous) => {
      if (modeLocked.value || mode === previous)
        return;
      
      const next = resolveModeSwitch({
        next: mode,
        previous,
        content: form.value.content,
        contentHtml: form.value.contentHtml,
      });
      form.value.content = next.content;
      form.value.contentHtml = next.contentHtml;

      const files = resolveModeSwitchFiles({
        next: mode,
        previous,
        images: form.value.images,
        cover: form.value.cover,
        contentImages: form.value.contentImages,
        coverIndex: coverIndex.value,
      });
      form.value.images = files.images;
      form.value.cover = files.cover;
      form.value.contentImages = files.contentImages;
      coverIndex.value = files.coverIndex;
    },
  );

  function onModalToOpen(file: File & { description?: string }, path: string) {
    imagePreviewModal.open = true;
    imagePreviewModal.picture = path;
    imagePreviewModal.file = file;
    imagePreviewModal.description = file.description;
  }

  function onModalClose() {
    if (imagePreviewModal.file)
      imagePreviewModal.file.description = imagePreviewModal.description;
    
    imagePreviewModal.description = undefined;
    imagePreviewModal.picture = undefined;
    imagePreviewModal.file = undefined;
  }

  function imageDblClick(event: MouseEvent, file: File) {
    preventBubbling(event);
    onModalToOpen(file, URL.createObjectURL(file));
  }

  function setCover(index: number, checked: boolean | 'indeterminate') {
    if (checked) {
      coverIndex.value = index;
      return;
    }
    if (coverIndex.value === index)
      coverIndex.value = null;    
  }

  function removeFileAt(index: number, removeFile: (i: number) => void) {
    removeFile(index);
    if (coverIndex.value === null)
      return;
    
    if (coverIndex.value === index) {
      coverIndex.value = null;
      return;
    }
    if (coverIndex.value > index)
      coverIndex.value -= 1;    
  }

  function setSelectedCover() {
    if (!form.value.images.length || coverIndex.value === null)
      return;
    
    form.value.images.forEach((img, index) => {
      img.postCover = index === coverIndex.value;
    });
  }

  async function loadExistingFiles(urls: PostImageMeta[]) {
    const files = await Promise.all(
      urls.map(async (meta) => {
        const path = meta.path;
        const file = await urlToFile(path);
        return toStagedUploadFile(file, {
          existingPath: path,
          originalName: meta.name,
          description: meta.description,
          postCover: !!meta.postCover,
          ...(typeof meta.id === 'number'
            ? { fileId: meta.id, clientTempId: String(meta.id) }
            : {}),
        });
      }),
    );

    if (isFormatted.value) {
      const cover = files.find(f => f.postCover);
      form.value.cover = cover ? [cover] : [];
      form.value.contentImages = files.filter(f => f !== cover);
      return;
    }

    form.value.images = files;
    const coverIdx = files.findIndex(f => f.postCover);
    coverIndex.value = coverIdx >= 0 ? coverIdx : null;
  }

  onMounted(() => {
    if (images?.length)
      loadExistingFiles(images);
    
  });

  function pickFiles(multiple: boolean): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.multiple = multiple;
      input.onchange = () => {
        resolve([...(input.files ?? [])]);
      };
      input.click();
    });
  }

  async function onInsertImageRequest() {
    const [file] = await pickFiles(false);
    if (!file)
      return;
    
    const tempId = newClientTempId();
    const previewUrl = URL.createObjectURL(file);
    form.value.contentImages = [
      ...form.value.contentImages,
      toStagedUploadFile(file, { clientTempId: tempId, previewUrl }),
    ];
    editorRef.value?.insertImageAtCursor(previewUrl, tempId);
  }

  async function onInsertCarouselRequest() {
    const files = await pickFiles(true);
    if (!files.length)
      return;
    
    const tempIds: string[] = [];
    const staged = files.map((file) => {
      const tempId = newClientTempId();
      tempIds.push(tempId);
      return withClientTempId(file, tempId);
    });
    form.value.contentImages = [...form.value.contentImages, ...staged];
    editorRef.value?.insertCarousel(tempIds);
  }

  function stagedBags() {
    return [
      ...form.value.contentImages,
      ...form.value.cover,
      ...form.value.images,
    ];
  }

  async function onUploadSucceed(
    uploaded: Partial<Record<string, UploadMethodResultItem[]>>,
  ) {
    if (!isFormatted.value) {
      for (const paths of Object.values(uploaded))
        if (paths)
          await loadExistingFiles(paths);                
      return;
    }

    const staged = stagedBags();
    annotateStagedFileIds(uploaded, [
      ...form.value.contentImages,
      ...form.value.cover,
    ]);

    const maps = buildContentImageRewriteMaps(uploaded, staged);
    if (Object.keys(maps.idMap).length || Object.keys(maps.blobSrcMap).length) {
      const rewritten = rewriteContentImageIds({
        content: form.value.content,
        contentHtml: form.value.contentHtml || '',
        ...maps,
      });
      form.value.content = rewritten.content;
      form.value.contentHtml = rewritten.contentHtml;
    }
  }

  function attachmentPayloadFromForm() {
    if (!isFormatted.value)
      return buildLegacyAttachmentPayload(form.value.images);
    
    return buildFormattedAttachmentPayload({
      contentJson: form.value.content,
      contentImages: form.value.contentImages,
      cover: form.value.cover[0],
    });
  }

  function submitForm() {
    if (!isFormatted.value)
      setSelectedCover();
    else
      form.value.images = [...form.value.cover, ...form.value.contentImages];

    form.submit(
      async (data) => {
        const imagesPayload = attachmentPayloadFromForm();
        const payload = {
          title: data.title,
          url: data.url,
          tags: data.tags,
          mode: isFormatted.value ? data.mode : PostMode.Legacy,
          content: data.content,
          contentHtml: isFormatted.value ? data.contentHtml : undefined,
          description: data.description || undefined,
          images: imagesPayload,
        };
        if (id)
          return $api.posts.edit({ id, ...payload });
        
        return $api.posts.add(payload);
      },
      {
        uploadMethod: { images: $api.images.uploadToPost },
        onUploadSucceed,
      },
    );
  }

  function onCreateTag(query: string) {
    const name = query.trim();
    const tag = { name, slug: slugify(name) };
    allTags.value.push(tag);
    form.value.tags.push(tag);
  }

  return {
    form,
    id,
    modeLocked,
    modeItems,
    isFormatted,
    coverModel,
    coverIndex,
    editorRef,
    imagePreviewModal,
    allTags,
    onModalClose,
    imageDblClick,
    setCover,
    removeFileAt,
    onInsertImageRequest,
    onInsertCarouselRequest,
    submitForm,
    onCreateTag,
  };
}