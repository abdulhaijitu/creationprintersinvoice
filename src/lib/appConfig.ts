/**
 * Application Configuration
 * Single source of truth for app-wide constants
 */

export const APP_CONFIG = {
  /** Application name - used throughout the UI */
  name: 'Creation Printers',
  
  /** Application tagline */
  tagline: 'all printing solution',
  
  /** Full title for browser tab */
  get fullTitle() {
    return `${this.name} - ${this.tagline}`;
  },
  
  /** Storage key prefixes */
  storagePrefix: 'creationprinters',
  
  /** Copyright text */
  get copyright() {
    return `© Copyright ${new Date().getFullYear()}`;
  },
} as const;

/**
 * Get the document title for a specific page
 */
export function getPageTitle(pageTitle?: string): string {
  if (!pageTitle) return APP_CONFIG.fullTitle;
  return `${pageTitle} | ${APP_CONFIG.name}`;
}
