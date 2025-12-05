/**
 * Navigation item interface used to build menus in Navbar/Sidebar.
 *
 * A NavItem can be:
 * - A simple link (with `path`).
 * - A parent group (with `children`).
 *
 * @property label - Texto visible del ítem de navegación.
 * @property path - Ruta interna asociada (Angular Router). Puede ser `undefined` si el item solo sirve como grupo.
 * @property icon - Nombre de la clase de ícono (ej: 'pi pi-user').
 * @property children - Lista opcional de subítems de navegación (NavItem[]).
 */
export interface NavItem {
  label: string;
  icon: string;
  path?: string;
  children?: NavItem[];
  exactMatch?: boolean; // Para routerLinkActive exact matching
  allowedRoles?: string[]; // Roles that can view this item
}

