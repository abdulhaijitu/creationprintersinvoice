# PrintoSaaS Design System

## Overview

This document defines the standardized design tokens and patterns for the entire application.
All components MUST use these tokens - no hardcoded values allowed.

---

## Color Tokens (STRICT)

Use semantic tokens ONLY. Never use hex colors in components.

### Core Colors
| Token | Usage |
|-------|-------|
| `background` | Page backgrounds |
| `foreground` | Primary text |
| `card` | Card backgrounds |
| `card-foreground` | Card text |
| `popover` | Popover/dropdown backgrounds |
| `popover-foreground` | Popover text |

### Brand Colors
| Token | Usage |
|-------|-------|
| `primary` | Primary buttons, links, accents |
| `primary-foreground` | Text on primary backgrounds |
| `secondary` | Secondary buttons, less emphasis |
| `secondary-foreground` | Text on secondary backgrounds |

### State Colors
| Token | Usage |
|-------|-------|
| `success` | Success states, paid, approved |
| `warning` | Warning states, pending, partial |
| `destructive` | Error states, delete, unpaid |
| `info` | Informational states |

### Neutral Colors
| Token | Usage |
|-------|-------|
| `muted` | Subtle backgrounds, disabled |
| `muted-foreground` | Secondary text, labels |
| `accent` | Hover states, highlights |
| `accent-foreground` | Text on accent backgrounds |
| `border` | All borders |
| `input` | Input borders |
| `ring` | Focus rings |

---

## Typography Hierarchy

### Font Sizes
| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Helper text, captions |
| `text-sm` | 14px | Body text, form labels |
| `text-base` | 16px | Default body text |
| `text-lg` | 18px | Section headers |
| `text-xl` | 20px | Page subtitles, card headers |

### Responsive Typography
- Mobile: `text-sm` base
- Tablet: `text-sm` / `text-base`
- Desktop: `text-base` / `text-lg`

---

## Spacing System

Allowed spacing values ONLY: 1, 2, 3, 4, 6, 8, 12

| Class | Size | Usage |
|-------|------|-------|
| `p-1` / `m-1` | 4px | Micro spacing |
| `p-2` / `m-2` | 8px | Tight spacing |
| `p-3` / `m-3` | 12px | Compact spacing |
| `p-4` / `m-4` | 16px | Default spacing |
| `p-6` / `m-6` | 24px | Comfortable spacing |
| `p-8` / `m-8` | 32px | Generous spacing |
| `p-12` / `m-12` | 48px | Section spacing |

---

## Border Radius

Standardized radius values:

| Component | Class | Radius |
|-----------|-------|--------|
| Buttons | `rounded-md` | 6px |
| Inputs | `rounded-md` | 6px |
| Cards | `rounded-lg` | 8px |
| Modals | `rounded-xl` | 12px |
| Badges | `rounded-full` | 9999px |

---

## Shadows

| Level | Class | Usage |
|-------|-------|-------|
| Subtle | `shadow-sm` | Inputs, resting cards |
| Default | `shadow` | Interactive cards |
| Elevated | `shadow-lg` | Modals, dropdowns |

---

## Motion & Transitions

### Duration
- Fast: `duration-150` (quick feedback)
- Default: `duration-200` (standard transitions)
- Slow: `duration-300` (deliberate animations)

### Easing
- Always use `ease-out`
- No bounce animations in production

### Standard Transition
```css
transition-all duration-200 ease-out
```

---

## Component Standards

### Buttons
- Height: `h-9` (sm), `h-10` (default), `h-11` (lg)
- Variants: `default`, `secondary`, `outline`, `ghost`, `destructive`, `success`
- All buttons include loading and disabled states

### Inputs
- Height: `h-10` (consistent with buttons)
- Focus ring: `ring-2 ring-ring ring-offset-2`

### Cards
- Padding: `p-4` (mobile), `p-6` (desktop)
- Border: `border` using semantic token
- Shadow: `shadow-sm`, `shadow-md` on hover

### Tables
- Header: `bg-muted/50`
- Row hover: `hover:bg-muted/50`
- Borders: `border-muted/30`

### Badges
- Status mapping:
  - Success → `success` variant
  - Warning → `warning` variant
  - Error → `destructive` variant
  - Info → `info` variant

---

## Accessibility

- Focus ring always visible
- Touch targets ≥ 44px on mobile
- No color-only indicators
- Contrast AA compliant

---

## DO NOTs

❌ No inline styles
❌ No hex colors (except in PDF templates)
❌ No px-based font sizes
❌ No custom shadows
❌ No random spacing values
❌ No bounce animations
