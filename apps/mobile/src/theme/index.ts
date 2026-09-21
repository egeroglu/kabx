import { useColorScheme } from 'react-native';

import { palette } from './tokens';

export * from './tokens';

export type Colors = (typeof palette)['light'] | (typeof palette)['dark'];

export function useColors(): Colors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? palette.dark : palette.light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
