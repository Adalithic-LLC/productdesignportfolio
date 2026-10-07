import type { CSSProperties } from 'react';

/**
 * The Arcatext app palette as CSS variables (defined in index.css, light under
 * :root and dark under .dark), so every drawn Arcatext screen follows the
 * portfolio's theme without re-rendering. Values are the app's asset-catalog
 * colorsets; the Messages chrome around the keyboard uses iOS system colors.
 */
const v = (name: string) => `var(--ax-${name})`;

export const AX = {
  pageBg: v('page-bg'),
  cardBg: v('card-bg'),
  cardStroke: v('card-stroke'),
  label: v('label'),
  detail: v('detail'),
  placeholder: v('placeholder'),
  accent: v('accent'),
  item: v('item'),
  itemPressed: v('item-pressed'),
  primary: v('primary'),
  checkText: v('check-text'),
  selectedBg: v('selected-bg'),
  chipBg: v('chip-bg'),
  separator: v('separator'),
  xBtn: v('x-btn'),
  xMark: v('x-mark'),
  iconMuted: v('icon-muted'),
  pickerBg: v('picker-bg'),
  pickerSelected: v('picker-selected'),
  pickerLabel: v('picker-label'),
  tokenBar: v('token-bar'),
  toolBtn: v('tool-btn'),
  keyboardBg: v('keyboard-bg'),
  key: v('key'),
  actionKey: v('action-key'),
  keyText: v('key-text'),
  keyHint: v('key-hint'),
  keyShadow: v('key-shadow'),
  glyph: v('glyph'),
  spinnerTrack: v('spinner-track'),
  spinnerHead: v('spinner-head'),
  screen: v('screen'),
  ink: v('ink'),
  inkMuted: v('ink-muted'),
  hairline: v('hairline'),
  fieldBorder: v('field-border'),
  fieldPlaceholder: v('field-placeholder'),
  plusBg: v('plus-bg'),
  plusIcon: v('plus-icon'),
  send: v('send'),
  smsGreen: v('sms-green'),
  recvBubble: v('recv-bubble'),
  toggleOff: v('toggle-off'),
  batteryRing: v('battery-ring'),
  bezelRing: v('bezel-ring'),
  toolBtnPressed: v('tool-btn-pressed'),
  grouped: v('grouped'),
  warningBg: v('warning-bg'),
  warningStroke: v('warning-stroke'),
  /** CheckView's Experimental badge: a fixed amber in both appearances. */
  experimental: '#FFB200',
} as const;

/**
 * An icon with light and dark artwork, like an asset-catalog imageset. Both
 * are rendered and CSS shows the one matching the theme, so a theme switch
 * never waits on a network fetch.
 */
export function AxIcon({
  light,
  dark,
  width,
  height,
  className = '',
  style,
}: {
  light: string;
  dark: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
}) {
  const s = { width, height, ...style };
  return (
    <>
      <img src={light} alt="" className={`dark:hidden ${className}`} style={s} />
      <img src={dark} alt="" className={`hidden dark:block ${className}`} style={s} />
    </>
  );
}
