/**
 * PrintoSaaS Design Tokens
 * =========================
 * Single source of truth for all design values.
 * These tokens map to CSS variables defined in index.css.
 * 
 * CRITICAL: Never use hardcoded colors, spacing, or shadows.
 * Always reference these tokens or the corresponding Tailwind classes.
 * 
 * Usage:
 * - Import tokens where needed for JavaScript/TypeScript logic
 * - Use Tailwind classes that reference CSS variables for styling
 * - Reference this file when creating new components
 */

// ============================================
// SPACING SYSTEM
// Based on 4px grid (0.25rem base)
// Allowed values: 1, 2, 3, 4, 6, 8, 12 (units)
// ============================================
export const spacing = {
  /** 4px - p-1 */
  1: '0.25rem',
  /** 8px - p-2 */
  2: '0.5rem',
  /** 12px - p-3 */
  3: '0.75rem',
  /** 16px - p-4 */
  4: '1rem',
  /** 24px - p-6 */
  6: '1.5rem',
  /** 32px - p-8 */
  8: '2rem',
  /** 48px - p-12 */
  12: '3rem',
} as const;

// ============================================
// TYPOGRAPHY HIERARCHY
// Semantic text sizes - never use arbitrary sizes
// ============================================
export const typography = {
  fontSize: {
    /** 10px - micro labels, helper badges */
    '2xs': '0.625rem',
    /** 12px - helper text, captions */
    xs: '0.75rem',
    /** 14px - body text small, form labels */
    sm: '0.875rem',
    /** 16px - default body text */
    base: '1rem',
    /** 18px - section headers, emphasized text */
    lg: '1.125rem',
    /** 20px - page subtitles, card headers */
    xl: '1.25rem',
    /** 24px - page titles */
    '2xl': '1.5rem',
    /** 30px - major headings */
    '3xl': '1.875rem',
  },
  
  fontWeight: {
    /** 400 - body text */
    normal: '400',
    /** 500 - emphasized text, labels */
    medium: '500',
    /** 600 - subheadings, important text */
    semibold: '600',
    /** 700 - headings, titles */
    bold: '700',
  },
  
  lineHeight: {
    /** Tight for headings */
    tight: '1.25',
    /** Default for body */
    normal: '1.5',
    /** Relaxed for readability */
    relaxed: '1.75',
  },
  
  letterSpacing: {
    /** Tighter for large headings */
    tight: '-0.025em',
    /** Normal body text */
    normal: '0',
    /** Wider for labels, caps */
    wide: '0.025em',
    /** Extra wide for micro labels */
    wider: '0.05em',
  },
} as const;

// ============================================
// BORDER RADIUS
// Standard radius values - no custom radii
// ============================================
export const borderRadius = {
  /** Buttons, Inputs - rounded-md */
  md: '0.375rem',
  /** Cards - rounded-lg */
  lg: '0.5rem',
  /** Modals, Drawers - rounded-xl */
  xl: '0.75rem',
  /** Badges, Pills - rounded-full */
  full: '9999px',
} as const;

// ============================================
// SHADOWS
// Standard elevation levels - no custom shadows
// ============================================
export const shadows = {
  /** Inputs - subtle depth */
  sm: 'shadow-sm',
  /** Cards - default elevation */
  DEFAULT: 'shadow',
  /** Modals, Drawers - high elevation */
  lg: 'shadow-lg',
} as const;

// ============================================
// Z-INDEX LAYERS
// Predictable stacking order
// ============================================
export const zIndex = {
  /** Behind everything */
  behind: -1,
  /** Default layer */
  base: 0,
  /** Dropdown menus */
  dropdown: 10,
  /** Sticky headers */
  sticky: 20,
  /** Fixed elements */
  fixed: 30,
  /** Drawer/Sidebar overlays */
  drawer: 40,
  /** Modal backdrops */
  modalBackdrop: 45,
  /** Modals */
  modal: 50,
  /** Popovers */
  popover: 60,
  /** Tooltips */
  tooltip: 70,
  /** Toast notifications */
  toast: 80,
  /** Maximum - loading overlays */
  max: 100,
} as const;

// ============================================
// ANIMATION / MOTION
// Standard durations: 150-200ms, ease-out only
// No bounce animations in production
// ============================================
export const animation = {
  duration: {
    /** Fast - quick feedback (150ms) */
    fast: '150ms',
    /** Default - standard transitions (200ms) */
    DEFAULT: '200ms',
    /** Slow - deliberate animations (300ms) */
    slow: '300ms',
  },
  
  easing: {
    /** Standard ease-out for all transitions */
    DEFAULT: 'ease-out',
  },
} as const;

// ============================================
// BREAKPOINTS
// Mobile-first responsive design
// ============================================
export const breakpoints = {
  /** Mobile: 0-639px */
  sm: '640px',
  /** Tablet: 640-767px */
  md: '768px',
  /** Small desktop: 768-1023px */
  lg: '1024px',
  /** Desktop: 1024-1279px */
  xl: '1280px',
  /** Large desktop: 1280px+ */
  '2xl': '1536px',
} as const;

// ============================================
// COMPONENT-SPECIFIC TOKENS
// Standardized values for key components
// ============================================
export const components = {
  button: {
    height: {
      sm: '36px', // h-9
      DEFAULT: '40px', // h-10
      lg: '44px', // h-11
      icon: '40px',
      'icon-sm': '32px',
    },
    padding: {
      sm: '12px', // px-3
      DEFAULT: '16px', // px-4
      lg: '32px', // px-8
    },
  },
  
  input: {
    height: {
      sm: '36px',
      DEFAULT: '40px',
      lg: '44px',
    },
  },
  
  card: {
    padding: {
      sm: '12px',
      DEFAULT: '16px',
      lg: '24px',
    },
    borderRadius: '8px', // rounded-lg
  },
  
  badge: {
    padding: {
      sm: '4px 8px',
      DEFAULT: '4px 10px',
      lg: '6px 12px',
    },
  },
  
  sidebar: {
    width: {
      collapsed: '56px',
      expanded: '240px',
    },
  },
  
  modal: {
    maxWidth: {
      sm: '400px',
      DEFAULT: '500px',
      lg: '640px',
      xl: '800px',
      full: '100%',
    },
  },
} as const;

// ============================================
// COLOR SEMANTIC MAPPING
// Reference only - actual colors in CSS variables
// ============================================
export const colorSemantics = {
  // Background colors
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  
  // Interactive colors
  primary: 'var(--primary)',
  secondary: 'var(--secondary)',
  accent: 'var(--accent)',
  
  // Status colors
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  info: 'var(--info)',
  
  // Neutral colors
  muted: 'var(--muted)',
  border: 'var(--border)',
  
  // Component-specific
  card: 'var(--card)',
  popover: 'var(--popover)',
  sidebar: 'var(--sidebar-background)',
} as const;

// ============================================
// PRINT TOKENS
// For invoice/document printing
// ============================================
export const print = {
  pageSize: {
    a4: {
      width: '210mm',
      height: '297mm',
    },
    letter: {
      width: '8.5in',
      height: '11in',
    },
  },
  
  margins: {
    narrow: '12.7mm',
    normal: '25.4mm',
    wide: '38.1mm',
  },
  
  fontSize: {
    micro: '7pt',
    small: '8pt',
    body: '10pt',
    heading: '12pt',
    title: '16pt',
    display: '24pt',
  },
} as const;

// Export all tokens as default
export const tokens = {
  spacing,
  typography,
  borderRadius,
  shadows,
  zIndex,
  animation,
  breakpoints,
  components,
  colorSemantics,
  print,
} as const;

export default tokens;
