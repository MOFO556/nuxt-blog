import { MascotTheme } from '~/types/mascot.enum';

export const sceneColor = {
  clear: 0x000000,
  white: 0xffffff,
  hemisphereSky: 0xfff7ed,
  hemisphereGround: 0x1e1b4b,
  sun: 0xffffff,
} as const;

export const mascotPalette = {
  [MascotTheme.light]: {
    outfit: 0xf97316,
    skin: 0xfdba74,
    hair: 0xc9a227,
    burst: 0xfb923c,
  },
  [MascotTheme.dark]: {
    outfit: 0x7c3aed,
    skin: 0xe7e5e4,
    hair: 0x161616,
    burst: 0xc4b5fd,
  },
} as const;

export const runnerPalette = {
  [MascotTheme.light]: {
    course: '#fff7ed',
    ground: '#fed7aa',
    kunai: '#44403c',
    stone: '#78716c',
    body: '#f97316',
    head: '#fdba74',
  },
  [MascotTheme.dark]: {
    course: '#0f172a',
    ground: '#1e1b4b',
    kunai: '#e2e8f0',
    stone: '#57534e',
    body: '#7c3aed',
    head: '#e7e5e4',
  },
} as const;