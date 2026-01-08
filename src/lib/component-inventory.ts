/**
 * PrintoSaaS Component Inventory
 * ================================
 * Figma-ready component documentation.
 * Maps 1:1 with UI components for design-dev alignment.
 * 
 * Each component documents:
 * - Variants (visual styles)
 * - Sizes
 * - States (hover, focus, disabled, loading)
 * - Props
 */

// ============================================
// COMPONENT CATEGORIES
// ============================================

export const componentCategories = {
  primitives: 'Basic building blocks',
  forms: 'Form inputs and controls',
  feedback: 'User feedback components',
  navigation: 'Navigation elements',
  layout: 'Layout containers',
  data: 'Data display components',
  overlays: 'Modals, dialogs, popovers',
} as const;

// ============================================
// COMPONENT DEFINITIONS
// ============================================

export const componentInventory = {
  // ==========================================
  // PRIMITIVES
  // ==========================================
  
  Button: {
    category: 'primitives',
    path: '@/components/ui/button',
    description: 'Primary interactive element for user actions',
    
    variants: {
      default: 'Primary action - solid primary color',
      destructive: 'Dangerous action - red/destructive color',
      outline: 'Secondary action - bordered style',
      secondary: 'Tertiary action - muted solid',
      ghost: 'Subtle action - transparent until hover',
      link: 'Text link style - underlined on hover',
      success: 'Positive action - green/success color',
    },
    
    sizes: {
      sm: 'Small - h-9, text-xs',
      default: 'Medium - h-10, text-sm',
      lg: 'Large - h-11, text-base',
      icon: 'Icon only - h-10 w-10',
      'icon-sm': 'Small icon - h-8 w-8',
    },
    
    states: {
      default: 'Resting state',
      hover: 'Mouse over - slight color change',
      focus: 'Keyboard focus - ring outline',
      active: 'Pressed - scale(0.95)',
      disabled: 'Not interactive - 50% opacity',
      loading: 'Spinner + disabled',
    },
    
    props: ['variant', 'size', 'disabled', 'loading', 'asChild'],
  },
  
  Badge: {
    category: 'primitives',
    path: '@/components/ui/badge',
    description: 'Status indicators and labels',
    
    variants: {
      default: 'Primary color background',
      secondary: 'Muted background',
      destructive: 'Error/danger - red tint',
      outline: 'Border only',
      success: 'Success - green tint',
      warning: 'Warning - yellow/orange tint',
      info: 'Informational - blue tint',
      muted: 'Neutral/inactive - gray',
    },
    
    sizes: {
      sm: 'Small - py-0.5 px-2, text-[10px]',
      default: 'Medium - py-0.5 px-2.5, text-xs',
      lg: 'Large - py-1 px-3, text-sm',
    },
    
    states: {
      default: 'Static display',
    },
    
    props: ['variant', 'size'],
  },
  
  // ==========================================
  // FORMS
  // ==========================================
  
  Input: {
    category: 'forms',
    path: '@/components/ui/input',
    description: 'Text input field',
    
    variants: {
      default: 'Standard input with border',
    },
    
    sizes: {
      default: 'h-10 on desktop, h-11 on mobile',
    },
    
    states: {
      default: 'Resting - border-input',
      focus: 'Focused - ring-2 ring-ring',
      disabled: 'Not editable - 50% opacity',
      error: 'Invalid - border-destructive (via form)',
    },
    
    props: ['type', 'placeholder', 'disabled', 'value', 'onChange'],
  },
  
  Select: {
    category: 'forms',
    path: '@/components/ui/select',
    description: 'Dropdown selection',
    
    variants: {
      default: 'Standard select trigger',
    },
    
    sizes: {
      default: 'h-10 on desktop, h-11 on mobile',
    },
    
    states: {
      default: 'Closed dropdown',
      open: 'Dropdown visible',
      focus: 'Ring outline',
      disabled: '50% opacity',
    },
    
    props: ['value', 'onValueChange', 'disabled', 'placeholder'],
    
    subComponents: [
      'SelectTrigger',
      'SelectContent',
      'SelectItem',
      'SelectGroup',
      'SelectLabel',
    ],
  },
  
  Checkbox: {
    category: 'forms',
    path: '@/components/ui/checkbox',
    description: 'Boolean toggle input',
    
    variants: {
      default: 'Rounded square checkbox',
    },
    
    sizes: {
      default: '16x16px',
    },
    
    states: {
      unchecked: 'Empty box',
      checked: 'Primary color fill with checkmark',
      indeterminate: 'Dash icon (for partial selection)',
      disabled: '50% opacity',
      focus: 'Ring outline',
    },
    
    props: ['checked', 'onCheckedChange', 'disabled'],
  },
  
  Textarea: {
    category: 'forms',
    path: '@/components/ui/textarea',
    description: 'Multi-line text input',
    
    variants: {
      default: 'Bordered textarea',
    },
    
    sizes: {
      default: 'min-h-[80px]',
    },
    
    states: {
      default: 'Resting',
      focus: 'Ring outline',
      disabled: '50% opacity',
    },
    
    props: ['placeholder', 'disabled', 'value', 'onChange', 'rows'],
  },
  
  // ==========================================
  // FEEDBACK
  // ==========================================
  
  Tooltip: {
    category: 'feedback',
    path: '@/components/ui/tooltip',
    description: 'Contextual information on hover',
    
    variants: {
      default: 'Dark popover with arrow',
    },
    
    positions: ['top', 'right', 'bottom', 'left'],
    
    states: {
      hidden: 'Not visible',
      visible: 'Shown on hover/focus',
    },
    
    props: ['content', 'side', 'sideOffset'],
    
    subComponents: [
      'TooltipProvider',
      'TooltipTrigger',
      'TooltipContent',
    ],
  },
  
  Toast: {
    category: 'feedback',
    path: '@/components/ui/toast',
    description: 'Temporary notification message',
    
    variants: {
      default: 'Neutral notification',
      destructive: 'Error notification',
      // Custom: success, warning (via className)
    },
    
    positions: ['top-right', 'bottom-right'],
    
    states: {
      entering: 'Slide in animation',
      visible: 'Displayed',
      exiting: 'Slide out animation',
    },
    
    props: ['title', 'description', 'action', 'variant', 'duration'],
  },
  
  Skeleton: {
    category: 'feedback',
    path: '@/components/ui/skeleton',
    description: 'Loading placeholder',
    
    variants: {
      default: 'Pulsing gray rectangle',
      text: 'Text line placeholder',
      heading: 'Heading placeholder',
      avatar: 'Circular avatar placeholder',
      button: 'Button placeholder',
      card: 'Card placeholder',
    },
    
    props: ['variant', 'className'],
    
    subComponents: [
      'SkeletonText',
      'SkeletonCard',
      'SkeletonTableRow',
    ],
  },
  
  UIHint: {
    category: 'feedback',
    path: '@/components/ui/ui-hint',
    description: 'Contextual guidance hints',
    
    variants: {
      info: 'Blue - informational',
      tip: 'Yellow - helpful suggestion',
      warning: 'Red - caution',
      success: 'Green - confirmation',
    },
    
    subComponents: [
      'InlineHint',
      'TooltipHint',
      'FieldHint',
      'ContextualHint',
      'EmptyStateHint',
      'FirstTimeHint',
      'ValidationHint',
    ],
    
    props: ['variant', 'dismissible', 'onDismiss'],
  },
  
  // ==========================================
  // NAVIGATION
  // ==========================================
  
  Sidebar: {
    category: 'navigation',
    path: '@/components/ui/sidebar',
    description: 'Collapsible side navigation',
    
    variants: {
      expanded: 'Full width with labels - 240px',
      collapsed: 'Icons only - 56px',
    },
    
    states: {
      open: 'Visible (mobile drawer or desktop)',
      closed: 'Hidden on mobile',
    },
    
    subComponents: [
      'SidebarProvider',
      'SidebarTrigger',
      'SidebarContent',
      'SidebarGroup',
      'SidebarMenuItem',
      'SidebarMenuButton',
    ],
  },
  
  Tabs: {
    category: 'navigation',
    path: '@/components/ui/tabs',
    description: 'Tabbed content navigation',
    
    variants: {
      default: 'Underline style tabs',
    },
    
    states: {
      inactive: 'Unselected tab',
      active: 'Selected tab - primary color indicator',
      hover: 'Slight background change',
    },
    
    subComponents: [
      'TabsList',
      'TabsTrigger',
      'TabsContent',
    ],
  },
  
  Breadcrumb: {
    category: 'navigation',
    path: '@/components/ui/breadcrumb',
    description: 'Hierarchical navigation path',
    
    subComponents: [
      'BreadcrumbList',
      'BreadcrumbItem',
      'BreadcrumbLink',
      'BreadcrumbSeparator',
      'BreadcrumbPage',
    ],
  },
  
  // ==========================================
  // LAYOUT
  // ==========================================
  
  Card: {
    category: 'layout',
    path: '@/components/ui/card',
    description: 'Content container with border and shadow',
    
    variants: {
      default: 'Standard card with shadow',
      interactive: 'Clickable card with hover effect',
    },
    
    subComponents: [
      'CardHeader',
      'CardTitle',
      'CardDescription',
      'CardContent',
      'CardFooter',
    ],
    
    props: ['className'],
  },
  
  Separator: {
    category: 'layout',
    path: '@/components/ui/separator',
    description: 'Visual divider line',
    
    variants: {
      horizontal: 'Full width divider',
      vertical: 'Full height divider',
    },
    
    props: ['orientation', 'decorative'],
  },
  
  ScrollArea: {
    category: 'layout',
    path: '@/components/ui/scroll-area',
    description: 'Custom scrollbar container',
    
    props: ['className', 'type'],
  },
  
  // ==========================================
  // DATA
  // ==========================================
  
  Table: {
    category: 'data',
    path: '@/components/ui/table',
    description: 'Data table with rows and columns',
    
    subComponents: [
      'TableHeader',
      'TableBody',
      'TableFooter',
      'TableRow',
      'TableHead',
      'TableCell',
      'TableCellAmount',
      'TableCaption',
    ],
    
    features: [
      'Sticky header option',
      'Row hover state',
      'Sortable columns (via SortableTableHeader)',
      'Bulk selection',
      'Amount cells right-aligned',
    ],
  },
  
  StatusBadge: {
    category: 'data',
    path: '@/components/shared/StatusBadge',
    description: 'Pre-configured status badges for business logic',
    
    statuses: {
      invoice: ['paid', 'partial', 'unpaid'],
      quotation: ['pending', 'accepted', 'rejected'],
      delivery: ['draft', 'dispatched', 'delivered', 'cancelled'],
    },
  },
  
  // ==========================================
  // OVERLAYS
  // ==========================================
  
  Dialog: {
    category: 'overlays',
    path: '@/components/ui/dialog',
    description: 'Modal dialog window',
    
    variants: {
      default: 'Centered modal with backdrop',
    },
    
    sizes: {
      sm: 'max-w-sm',
      default: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full',
    },
    
    subComponents: [
      'DialogTrigger',
      'DialogContent',
      'DialogHeader',
      'DialogTitle',
      'DialogDescription',
      'DialogFooter',
      'DialogClose',
    ],
  },
  
  Sheet: {
    category: 'overlays',
    path: '@/components/ui/sheet',
    description: 'Slide-out panel (drawer)',
    
    positions: ['top', 'right', 'bottom', 'left'],
    
    subComponents: [
      'SheetTrigger',
      'SheetContent',
      'SheetHeader',
      'SheetTitle',
      'SheetDescription',
      'SheetFooter',
      'SheetClose',
    ],
  },
  
  Popover: {
    category: 'overlays',
    path: '@/components/ui/popover',
    description: 'Floating content panel',
    
    positions: ['top', 'right', 'bottom', 'left'],
    
    subComponents: [
      'PopoverTrigger',
      'PopoverContent',
    ],
  },
  
  DropdownMenu: {
    category: 'overlays',
    path: '@/components/ui/dropdown-menu',
    description: 'Action menu dropdown',
    
    subComponents: [
      'DropdownMenuTrigger',
      'DropdownMenuContent',
      'DropdownMenuItem',
      'DropdownMenuSeparator',
      'DropdownMenuLabel',
      'DropdownMenuGroup',
      'DropdownMenuSub',
      'DropdownMenuSubTrigger',
      'DropdownMenuSubContent',
    ],
  },
  
  // ==========================================
  // SHARED COMPONENTS
  // ==========================================
  
  PageHeader: {
    category: 'layout',
    path: '@/components/shared/PageHeader',
    description: 'Page title with description and actions',
    
    props: ['title', 'description', 'actions', 'badge'],
    
    subComponents: ['SectionHeader'],
  },
  
  EmptyState: {
    category: 'feedback',
    path: '@/components/shared/EmptyState',
    description: 'Empty content placeholder with CTA',
    
    illustrations: ['invoice', 'customer', 'expense', 'quotation', 'task', 'generic'],
    
    props: ['icon', 'illustration', 'title', 'description', 'action', 'secondaryAction'],
  },
  
  ConfirmDialog: {
    category: 'overlays',
    path: '@/components/shared/ConfirmDialog',
    description: 'Confirmation prompt for destructive actions',
    
    props: ['open', 'onOpenChange', 'title', 'description', 'confirmLabel', 'onConfirm', 'variant'],
  },
} as const;

// ============================================
// HELPER: Get component info
// ============================================

export function getComponentInfo(name: keyof typeof componentInventory) {
  return componentInventory[name];
}

// ============================================
// HELPER: List components by category
// ============================================

export function getComponentsByCategory(category: keyof typeof componentCategories) {
  return Object.entries(componentInventory)
    .filter(([_, info]) => info.category === category)
    .map(([name, info]) => ({ name, ...info }));
}

export default componentInventory;
