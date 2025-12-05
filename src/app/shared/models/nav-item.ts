/**
 * Navbar component for the application.
 * Displays the application name, navigation items, and a profile menu.
 */
export interface NavItem {
  path: string; // The route path for the navigation item.
  label: string; // The label displayed for the navigation item.
  icon?: string; // Optional icon for the navigation item.
  children?: NavItem[]; // Optional child navigation items.
}
