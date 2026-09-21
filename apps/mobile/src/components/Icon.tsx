import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'sun'
  | 'hanger'
  | 'cards'
  | 'layers'
  | 'user'
  | 'x'
  | 'heart'
  | 'undo'
  | 'plus'
  | 'search'
  | 'cloud'
  | 'check'
  | 'sparkle'
  | 'camera'
  | 'gallery'
  | 'gift'
  | 'arrowRight'
  | 'back'
  | 'external'
  | 'filter'
  | 'more';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

const STROKE: Partial<Record<IconName, string>> = {
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  hanger: 'M12 7a2 2 0 1 1 2-2M12 7v1.6L3.4 14.8A1.6 1.6 0 0 0 4.3 17.8h15.4a1.6 1.6 0 0 0 .9-3L12 8.6',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  user: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6',
  x: 'M6 6l12 12M18 6L6 18',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  plus: 'M12 5v14M5 12h14',
  cloud: 'M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.3 3.3 0 0 0 7 18z',
  check: 'M5 12l5 5 9-10',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  back: 'M15 5l-7 7 7 7',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  filter: 'M4 7h10M18 7h2M4 17h4M12 17h8',
};

const FILL: Partial<Record<IconName, string>> = {
  heart: 'M12 20.5s-7.2-4.5-9.2-9.2A4.9 4.9 0 0 1 12 8a4.9 4.9 0 0 1 9.2 3.3c-2 4.7-9.2 9.2-9.2 9.2z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
};

export function Icon({ name, size = 24, color = '#1D1915', strokeWidth = 2 }: Props) {
  if (FILL[name]) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={FILL[name]} fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {STROKE[name] ? <Path d={STROKE[name]} /> : null}
      {name === 'cards' ? (
        <>
          <Rect x={4} y={5} width={11} height={15} rx={2.5} />
          <Path d="M9 3.5l8.6 1.6a2.4 2.4 0 0 1 1.9 2.8l-2 10.6" />
        </>
      ) : null}
      {name === 'search' ? (
        <>
          <Circle cx={11} cy={11} r={7} />
          <Path d="M20 20l-3.5-3.5" />
        </>
      ) : null}
      {name === 'camera' ? <Circle cx={12} cy={13} r={3.5} /> : null}
      {name === 'gallery' ? (
        <>
          <Rect x={3.5} y={4.5} width={17} height={15} rx={2.5} />
          <Path d="M4 16l5-5 4 4 3-3 4 4" />
        </>
      ) : null}
      {name === 'filter' ? (
        <>
          <Circle cx={16} cy={7} r={2} />
          <Circle cx={10} cy={17} r={2} />
        </>
      ) : null}
      {name === 'more' ? (
        <>
          <Circle cx={5} cy={12} r={1.2} fill={color} />
          <Circle cx={12} cy={12} r={1.2} fill={color} />
          <Circle cx={19} cy={12} r={1.2} fill={color} />
        </>
      ) : null}
    </Svg>
  );
}
