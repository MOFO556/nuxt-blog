import type { InjectionKey } from 'vue';
import type { ProfileFormData, ProfilePatchData } from '~/types/user';

type ProfileEditContext = ReturnType<typeof useProfileEditForm>;
const PROFILE_EDIT_KEY: InjectionKey<ProfileEditContext> =
  Symbol('profileEdit');

export function useProfileEditForm() {
  const { $api } = useNuxtApp();
  const toast = useToast();
  const userStore = useUserStore();
  const isDefaultPicture = computed(() => !userStore.user?.avatar);

  const form = useForm<ProfileFormData, { ok: boolean }>(
    {
      avatar: null,
      newPassword: '',
      currentPassword: '',
      removePassword: false,
    },
    undefined,
    () => {
      toast.add({ title: 'Profile updated', color: 'success' })
      $api.auth.check();
      form.reset();
    },
  )

  const objectUrl = ref<string | null>(null)

  watch(
    () => form.value.avatar,
    (val) => {
      if (objectUrl.value) {
        URL.revokeObjectURL(objectUrl.value);
        objectUrl.value = null;
      }
      if (val instanceof File)
        objectUrl.value = URL.createObjectURL(val);
    },
  )

  onBeforeUnmount(() => {
    if (objectUrl.value)
      URL.revokeObjectURL(objectUrl.value)
  })

  const hasNewAvatar = computed(() => form.value.avatar instanceof File)

  const previewUrl = computed(
    () =>
      objectUrl.value ||
      userStore.user?.avatar ||
      '/images/default-avatar.png',
  );

  const isDirty = computed(
    () =>
      hasNewAvatar.value ||
      (form.value.newPassword && form.value.newPassword.length > 0) ||
      form.value.currentPassword.length > 0 ||
      form.value.removePassword === true,
  );

  const submit = () => {
    if (!isDirty.value || form.processing)
      return;

    form.submit(
      (payload) => {
        const body: ProfilePatchData = {};
        const avatar = payload.avatar;
        if (
          avatar !== null 
          && typeof avatar === 'object' 
          && 'fileId' in avatar 
          && typeof avatar.fileId === 'number'
        ) {
          body.avatar = avatar.fileId;
        }
        if (payload.newPassword)
          body.newPassword = payload.newPassword;
        if (payload.currentPassword)
          body.currentPassword = payload.currentPassword;
        if (payload.removePassword)
          body.removePassword = true;

        return $api.auth.updateProfile(body);
      },
      {
        uploadMethod: {
          avatar: $api.images.uploadAvatar,
        }
      },
    )
  }

  const ctx = { form, previewUrl, hasNewAvatar, isDirty, submit, isDefaultPicture };
  provide(PROFILE_EDIT_KEY, ctx);
  return ctx;
}

export function useProfileEdit(): ProfileEditContext {
  const ctx = inject(PROFILE_EDIT_KEY);
  if (!ctx)
    throw new Error('useProfileEdit: missing provider');
  return ctx;
}