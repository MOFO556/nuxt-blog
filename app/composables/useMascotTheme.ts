import { MascotTheme } from '~/types/mascot.enum';

export function useMascotTheme() {
  const colorMode = useColorMode();
  const theme = computed<MascotTheme>(() => colorMode.value === MascotTheme.dark ? MascotTheme.dark : MascotTheme.light);
  const portraitSrc = computed(() => `/mascot/portrait-${theme.value}.png`);
  return { theme, portraitSrc };
}