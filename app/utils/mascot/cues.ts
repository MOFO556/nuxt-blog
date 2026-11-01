import type { CueId, GuideCue, HotspotId } from '~/types/mascot';
import { AmbientCue, GuideAction, MascotTheme } from '~/types/mascot.enum';

const LINES: Record<HotspotId, Record<MascotTheme, string>> = {
  home: {
    light: 'This is home. I can show you around.',
    dark: 'Home. Stay or move.',
  },
  posts: {
    light: "Let's look through the posts.",
    dark: 'The posts are that way.',
  },
  runner: {
    light: 'Want to run?',
    dark: 'Try to keep up.',
  },
  profile: {
    light: 'Your profile lives here.',
    dark: 'That is your profile.',
  },
  'sign-in': {
    light: 'Sign in and I can remember you.',
    dark: 'Sign in, if you are staying.',
  },
  'sign-up': {
    light: 'New here? Make an account.',
    dark: 'Sign up. Then we talk properly.',
  },
  menu: {
    light: 'The rest of the menu is in there.',
    dark: 'Open it.',
  },
  'color-mode': {
    light: 'Flip the theme and the other one shows up.',
    dark: 'Switch the light if you want the other face.',
  },
  assistant: {
    light: 'Oh — you want to talk?',
    dark: 'Talk, then.',
  },
};

const CATCHPHRASES: Record<MascotTheme, readonly string[]> = {
  light: [
    'Want me to help?',
    'Dive into the blog?',
    "Let's talk in chat.",
    'I can walk you through this place.',
    'The posts are the good part.',
    'Fancy a run while you are here?',
    'Ask me anything. I am not busy.',
    'Hover a button. I will tell you what it does.',
    'Stay a minute. I have more to show you.',
    'Lost? Start with the posts.',
  ],
  dark: [
    'Need a hand?',
    'The blog is that way.',
    'We can talk in chat.',
    'I will point. You choose.',
    'The posts are the point of this place.',
    'You could run, if you are restless.',
    'Ask. I answer.',
    'Every button does something. Try one.',
    'Still here. So am I.',
    'Do not just stare. Open the posts.',
  ],
};

export function guideCue(id: HotspotId, theme: MascotTheme): GuideCue {
  const cue: GuideCue = {
    id,
    text: LINES[id][theme],
  };
  if (id === 'assistant')
    cue.action = GuideAction.openAssistant;
  return cue;
}

export function catchphrase(theme: MascotTheme, index: number): string {
  const list = CATCHPHRASES[theme];
  const count = list.length;
  const wrapped = ((index % count) + count) % count;
  return list[wrapped] ?? (theme === MascotTheme.dark ? 'Need a hand?' : 'Want me to help?');
}

export function nextCatchphraseIndex(previous: number | null, unit: number, count = 10): number {
  const span = previous === null ? count : count - 1;
  const clamped = Math.min(0.999999, Math.max(0, unit));
  let index = Math.floor(clamped * span);
  if (previous !== null && index >= previous)
    index += 1;
  return index;
}

export function isAside(id: CueId): boolean {
  return id === AmbientCue.aside;
}