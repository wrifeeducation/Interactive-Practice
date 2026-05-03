import type { CSSProperties } from 'react';

/**
 * WrifeMascot — canonical WriFe yellow-pencil mascot component.
 *
 * Uses the pre-rendered PNG files in /public/mascots/.
 * Replace any raw <img src="/mascots/..."> with this component.
 *
 * Variant groups (exactly one required):
 *   pose  — full-body pencil character (waving, celebrating, thinking, reading, book)
 *   face  — expression close-ups (happy, worried, writing, thumbsup)
 *   badge — tier achievement badges (foundation, application, mastery, achievement)
 *   icon  — UI icons (document-check, clipboard, pencil-writing)
 *
 * Usage:
 *   <WrifeMascot pose="waving" size="lg" />
 *   <WrifeMascot face="happy" size="sm" />
 *   <WrifeMascot badge="mastery" size="md" />
 */

// ── Variant types ─────────────────────────────────────────────────────────────

export type MascotPose  = 'waving' | 'celebrating' | 'thinking' | 'reading' | 'book';
export type MascotFace  = 'happy' | 'worried' | 'writing' | 'thumbsup';
export type MascotBadge = 'foundation' | 'application' | 'mastery' | 'achievement';
export type MascotIcon  = 'document-check' | 'clipboard' | 'pencil-writing';
export type MascotSize  = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Exactly one of these must be provided
type PoseProps  = { pose: MascotPose;  face?: never; badge?: never; icon?: never };
type FaceProps  = { face: MascotFace;  pose?: never; badge?: never; icon?: never };
type BadgeProps = { badge: MascotBadge; pose?: never; face?: never; icon?: never };
type IconProps  = { icon: MascotIcon;  pose?: never; face?: never; badge?: never };

type WrifeMascotProps = (PoseProps | FaceProps | BadgeProps | IconProps) & {
  size?: MascotSize;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  /** Suppress alt text — use only when purely decorative */
  decorative?: boolean;
};

// ── Filename maps ─────────────────────────────────────────────────────────────

const POSE_FILE: Record<MascotPose, string> = {
  waving:      '/mascots/pencil-waving.png',
  celebrating: '/mascots/pencil-celebrating.png',
  thinking:    '/mascots/pencil-thinking.png',
  reading:     '/mascots/pencil-reading.png',
  book:        '/mascots/pencil-book.png',
};

const FACE_FILE: Record<MascotFace, string> = {
  happy:    '/mascots/face-happy.png',
  worried:  '/mascots/face-worried.png',
  writing:  '/mascots/face-writing.png',
  thumbsup: '/mascots/face-thumbsup.png',
};

const BADGE_FILE: Record<MascotBadge, string> = {
  foundation:  '/mascots/badge-foundation.png',
  application: '/mascots/badge-application.png',
  mastery:     '/mascots/badge-mastery.png',
  achievement: '/mascots/badge-achievement.png',
};

const ICON_FILE: Record<MascotIcon, string> = {
  'document-check': '/mascots/icon-document-check.png',
  'clipboard':      '/mascots/icon-clipboard.png',
  'pencil-writing': '/mascots/icon-pencil-writing.png',
};

// ── Default alt text ──────────────────────────────────────────────────────────

const POSE_ALT: Record<MascotPose, string> = {
  waving:      'WriFe mascot waving hello',
  celebrating: 'WriFe mascot celebrating',
  thinking:    'WriFe mascot thinking',
  reading:     'WriFe mascot reading',
  book:        'WriFe mascot with a book',
};
const FACE_ALT: Record<MascotFace, string> = {
  happy:    'Happy face',
  worried:  'Worried face',
  writing:  'Writing face',
  thumbsup: 'Thumbs up',
};
const BADGE_ALT: Record<MascotBadge, string> = {
  foundation:  'Foundation badge',
  application: 'Application badge',
  mastery:     'Mastery badge',
  achievement: 'Achievement badge',
};
const ICON_ALT: Record<MascotIcon, string> = {
  'document-check': 'Document completed',
  'clipboard':      'Clipboard checklist',
  'pencil-writing': 'Pencil writing',
};

// ── Size map ──────────────────────────────────────────────────────────────────

const SIZE_PX: Record<MascotSize, number> = {
  xs:  40,
  sm:  72,
  md: 104,
  lg: 152,
  xl: 216,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function WrifeMascot({
  size = 'md',
  className = '',
  style,
  alt,
  decorative = false,
  ...variant
}: WrifeMascotProps) {
  let src: string;
  let defaultAlt: string;

  if ('pose' in variant && variant.pose) {
    src = POSE_FILE[variant.pose];
    defaultAlt = POSE_ALT[variant.pose];
  } else if ('face' in variant && variant.face) {
    src = FACE_FILE[variant.face];
    defaultAlt = FACE_ALT[variant.face];
  } else if ('badge' in variant && variant.badge) {
    src = BADGE_FILE[variant.badge];
    defaultAlt = BADGE_ALT[variant.badge];
  } else if ('icon' in variant && variant.icon) {
    src = ICON_FILE[variant.icon];
    defaultAlt = ICON_ALT[variant.icon];
  } else {
    // Fallback — should not happen if types are respected
    src = '/mascots/pencil-waving.png';
    defaultAlt = 'WriFe mascot';
  }

  const px = SIZE_PX[size];
  const altText = decorative ? '' : (alt ?? defaultAlt);

  return (
    <img
      src={src}
      alt={altText}
      width={px}
      height={px}
      className={className}
      style={{ objectFit: 'contain', width: px, height: px, ...style }}
    />
  );
}
