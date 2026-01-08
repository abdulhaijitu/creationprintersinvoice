/**
 * PrintoSaaS Design Tokens
 * =========================
 * Single source of truth for all design values.
 * These tokens map to CSS variables defined in index.css.
 * 
 * Usage:
 * - Import tokens where needed for JavaScript/TypeScript logic
 * - Use Tailwind classes that reference CSS variables for styling
 * - Reference this file when creating Figma components
 */

// ============================================
// SPACING
// Based on 4px grid (0.25rem base)
// ============================================
export const spacing = {
  /** 2px - Micro spacing */
  '2xs': '0.125rem',
  /** 4px - Extra small */
  xs: '0.25rem',
  /** 8px - Small */
  sm: '0.5rem',
  /** 12px - Medium-small */
  md: '0.75rem',
  /** 16px - Medium (base) */
  base: '1rem',
  /** 20px - Medium-large */
  lg: '1.25rem',
  /** 24px - Large */
  xl: '1.5rem',
  /** 32px - Extra large */
  '2xl': '2rem',
  /** 40px - 2x Extra large */
  '3xl': '2.5rem',
  /** 48px - 3x Extra large */
  '4xl': '3rem',
  /** 64px - Section spacing */
  '5xl': '4rem',
} as const;

// ============================================
// TYPOGRAPHY
// Swiss Design inspired - Clear hierarchy
// ============================================
export const typography = {
  fontFamily: {
    /** Primary font for body text */
    sans: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    /** Display font for headings (supports Bengali) */
    display: "'Hind Siliguri', 'Inter', sans-serif",
    /** Monospace for code/numbers */
    mono: "ui-monospace, SFMono-Regular, 'Roboto Mono', monospace",
  },
  
  fontSize: {
    /** 10px - Micro text, labels */
    '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
    /** 12px - Small text, captions */
    xs: ['0.75rem', { lineHeight: '1rem' }],
    /** 14px - Body text small */
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    /** 16px - Body text base */
    base: ['1rem', { lineHeight: '1.5rem' }],
    /** 18px - Large body */
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    /** 20px - Small heading */
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    /** 24px - Heading 3 */
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    /** 30px - Heading 2 */
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    /** 36px - Heading 1 */
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    /** 48px - Display */
    '5xl': ['3rem', { lineHeight: '1' }],
  },
  
  fontWeight: {
    /** 400 - Regular text */
    normal: '400',
    /** 500 - Emphasis */
    medium: '500',
    /** 600 - Strong emphasis */
    semibold: '600',
    /** 700 - Headings */
    bold: '700',
  },
  
  letterSpacing: {
    /** Tighter for large headings */
    tight: '-0.025em',
    /** Normal */
    normal: '0',
    /** Wider for small caps/labels */
    wide: '0.025em',
    /** Extra wide for micro labels */
    wider: '0.05em',
  },
} as const;

// ============================================
// BORDER RADIUS
// Consistent rounded corners
// ============================================
export const borderRadius = {
  /** 0 - Sharp corners */
  none: '0',
  /** 2px - Subtle rounding */
  sm: '0.125rem',
  /** 4px - Default small */
  DEFAULT: '0.25rem',
  /** 6px - Medium (--radius - 2px) */
  md: '0.375rem',
  /** 8px - Default (--radius) */
  lg: '0.5rem',
  /** 12px - Large */
  xl: '0.75rem',
  /** 16px - Extra large */
  '2xl': '1rem',
  /** 24px - Cards, modals */
  '3xl': '1.5rem',
  /** 9999px - Full/pill */
  full: '9999px',
} as const;

// ============================================
// SHADOWS / ELEVATION
// Subtle depth for professional look
// ============================================
export const shadows = {
  /** No shadow */
  none: 'none',
  /** Very subtle - inputs, small elements */
  '2xs': '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  /** Subtle - cards at rest */
  xs: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
  /** Default - interactive elements */
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.08)',
  /** Medium - hover states */
  DEFAULT: '0 2px 4px -1px rgb(0 0 0 / 0.05), 0 4px 6px -1px rgb(0 0 0 / 0.08)',
  /** Raised - dropdowns, popovers */
  md: '0 4px 6px -2px rgb(0 0 0 / 0.04), 0 10px 15px -3px rgb(0 0 0 / 0.08)',
  /** High - modals, drawers */
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 20px 25px -5px rgb(0 0 0 / 0.08)',
  /** Highest - floating elements */
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 25px 50px -12px rgb(0 0 0 / 0.12)',
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
// ANIMATION
// Subtle, purposeful motion
// ============================================
export const animation = {
  duration: {
    /** 100ms - Instant feedback */
    instant: '100ms',
    /** 150ms - Fast transitions */
    fast: '150ms',
    /** 200ms - Default transitions */
    DEFAULT: '200ms',
    /** 300ms - Standard animations */
    normal: '300ms',
    /** 500ms - Slow, deliberate */
    slow: '500ms',
  },
  
  easing: {
    /** Quick start, smooth end - Most UI */
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Linear - Progress bars */
    linear: 'linear',
    /** Quick start - Exit animations */
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    /** Smooth end - Enter animations */
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    /** Symmetric - Toggle states */
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Bouncy - Playful feedback */
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
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
