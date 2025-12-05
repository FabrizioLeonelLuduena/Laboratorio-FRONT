import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit, Signal, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from 'src/app/core/authentication/auth.service';

import { NavItem } from '../../models/NavItem';
import { PageTitleService } from '../../services/page-title.service';
import { FooterComponent } from '../footer/footer.component';
import { GenericAlertComponent } from '../generic-alert/generic-alert.component';
import { HelpCenterComponent } from '../help-center/help-center.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

/**
 * Layout principal de la aplicación:
 * - Navbar superior (toolbar)
 * - Sidebar lateral (navegación)
 * - Footer inferior (informativo)
 * - Contenedor central con <router-outlet>
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent, FooterComponent, HelpCenterComponent, GenericAlertComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  /** Controla visibilidad del sidebar */
  sidebarVisible = false;

  /** Detecta si es vista móvil (se actualiza con matchMedia) */
  isHandset = false;

  titleService = inject(PageTitleService);

  /** Indica si se muestra el botón de ayuda en el navbar */
  @Input() showHelp = false;

  /** Título del modal de ayuda */
  @Input() helpTitle = 'Ayuda';

  /** Contenido del modal de ayuda (HTML o texto plano) */
  @Input() helpContent = '<p>Información de ayuda del sistema.</p>';

  /** Remueve estilos del contenedor para que los módulos manejen su propio layout */
  @Input() noContainer = false;

  /** Authentication service */
  private authService = inject(AuthService);
  sessionExpiredAlert: Signal<string | null> = this.authService.sessionExpiredMessage$;

  /** Main sidebar menu */
  menuItems: Array<NavItem> = [
    {
      label: 'Gestión de atenciones',
      icon: 'pi pi-heart',
      path: '/care-management',
      allowedRoles: ['ADMINISTRADOR', 'SECRETARIA', 'BIOQUIMICO', 'TECNICO_LABORATORIO'],
      children: [
        { label: 'Dashboard', icon: 'pi pi-home', path: '/care-management/care-home' },
        { label: 'Cola de espera', icon: 'pi pi-hourglass', path: '/care-management/attentions' },
        { label: 'Atenciones', icon: 'pi pi-calendar', path: '/care-management/attentions-list' },
        { label: 'Extracciones', icon: 'pi pi-heart-fill', path: '/care-management/extraction' },
        { label: 'Reportes', icon: 'pi pi-chart-bar', path: '/care-management/reporting' }
      ]
    },
    { label: 'Gestión de turnos', icon: 'pi pi-calendar', path: '/appointments-results',
      allowedRoles: ['ADMINISTRADOR', 'SECRETARIA'] },
    {
      label: 'Gestión de analítica',
      icon: 'pi pi-chart-bar',
      path: '/analytical-management',
      allowedRoles: ['ADMINISTRADOR', 'BIOQUIMICO', 'TECNICO_LABORATORIO'],
      children: [
        { label: 'Pre-Analítica', icon: 'pi pi-list', path: '/analytical-management/pre-analytical' },
        { label: 'Analítica', icon: 'pi pi-cog', path: '/analytical-management/status-followment' },
        { label: 'Post-Analítica', icon: 'pi pi-file', path: '/analytical-management/post-analytical' },
        { label: 'Impresión de rótulos', icon: 'pi pi-print', path: '/analytical-management/print' },
        { label: 'Reportes', icon: 'pi pi-chart-bar', path: '/analytical-management/post-analytical/reporting' }
      ]
    },
    { label: 'Facturación y cobros',
      icon: 'pi pi-credit-card',
      path: '/billing-collections',
      allowedRoles: ['ADMINISTRADOR', 'FACTURISTA'],
      children: [
        { label: 'Dashboard', icon: 'pi pi-home', path: '/billing-collections/dashboard-home' },
        { label: 'Apertura de caja', icon: 'pi pi-unlock', path: '/billing-collections/opening' },
        { label: 'Facturación', icon: 'pi pi-wallet', path: '/billing-collections/invoicing' },
        { label: 'Liquidaciones', icon: 'pi pi-dollar', path: '/billing-collections/settlements' },
        { label: 'Reportes', icon: 'pi pi-chart-bar', path: '/billing-collections/reports-home' }
      ] },
    { label: 'Gestión de pacientes',
      icon: 'pi pi-user',
      path: '/patients',
      allowedRoles: ['ADMINISTRADOR', 'SECRETARIA', 'BIOQUIMICO', 'TECNICO_LABORATORIO'],
      children: [
        { label: 'Dashboard', icon: 'pi pi-home', path: '/patients/dashboard' },
        { label: 'Pacientes', icon: 'pi pi-users', path: '/patients/list', exactMatch: true },
        { label: 'Reportes', icon: 'pi pi-chart-bar', path: '/patients/reports' }
      ]
    },
    {
      label: 'Gestión interna',
      icon: 'pi pi-cog',
      allowedRoles: ['ADMINISTRADOR'],
      children: [
        { label: 'Dashboard', icon: 'pi pi-home', path: '/care-management/branches-dashboard' },
        { label: 'Médicos', icon: 'pi pi-id-card', path: '/care-management/doctors' },
        { label: 'Empleados', icon: 'pi pi-users', path: '/care-management/employees' },
        { label: 'Sucursales', icon: 'pi pi-building', path: '/care-management/branches' },
        { label: 'Coberturas', icon: 'pi pi-shield', path: '/care-management/coverage-administration' },
        { label: 'Analisis', icon: 'pi pi-heart', path: '/analytical-management/configuration' },
        { label: 'Versiones NBU', icon: 'pi pi-tags', path: '/analytical-management/configuration/nbu-versions' },
        { label: 'Cola de espera', icon: 'pi pi-hourglass', path: '/queue/waiting-room' },
        { label: 'Cola de Extracciones', icon: 'pi pi-heart-fill', path: '/queue/extraction-waiting-room' }
      ]
    },
    { label: 'Gestión de usuarios', icon: 'pi pi-users', path: '/user-management',
      allowedRoles: ['ADMINISTRADOR'] },
    { label: 'Compras e inventario',
      icon: 'pi pi-box',
      path: '/procurement-inventory',
      allowedRoles: ['ADMINISTRADOR', 'MANAGER_STOCK', 'OPERADOR_COMPRAS'],
      children: [
        { label: 'Dashboard', icon: 'pi pi-home', path: '/procurement-inventory', exactMatch: true },
        { label: 'Proveedores', icon: 'pi pi-users', path: '/procurement-inventory/suppliers' },
        { label: 'Ubicaciones', icon: 'pi pi-map-marker', path: '/procurement-inventory/locations' },
        { label: 'Insumos', icon: 'pi pi-box', path: '/procurement-inventory/supplies' },
        { label: 'Movimientos de stock', icon: 'pi pi-arrow-right-arrow-left', path: '/procurement-inventory/stock-movements' },
        { label: 'Compras', icon: 'pi pi-shopping-cart', path: '/procurement-inventory/purchase-orders' },
        { label: 'Remitos', icon: 'pi pi-arrow-left', path: '/procurement-inventory/goods-receipts' }
      ]
    }
  ];

  /** Keep an immutable copy of the original menu definition so we can re-filter from a clean source */
  private originalMenuItems: NavItem[] = [];


  private mql?: MediaQueryList;

  private rolesEffect = effect(() => {
    // create dependency on the roles signal
    this.authService.roles();
    this.filterMenuByRole();
  });

  /**
   * Bloquea o libera el scroll del documento en móvil cuando el sidebar está abierto.
   * Añade o quita la clase 'no-scroll' en <body> en función de isHandset y sidebarVisible.
   */
  private updateBodyScrollLock() {
    const body = document.body;
    if (!body) return;
    if (this.isHandset && this.sidebarVisible) {
      body.classList.add('no-scroll');
    } else {
      body.classList.remove('no-scroll');
    }
  }

  private onMediaChange = (e: MediaQueryListEvent) => {
    this.isHandset = e.matches;
    // Cerrar sidebar cuando pasamos a móvil para evitar empujar contenido
    if (this.isHandset) {
      this.sidebarVisible = false;
    }
    this.updateBodyScrollLock();
  };

  private stopRolesEffect?: ReturnType<typeof effect>;

  /** Initialize media query listeners and initial flags */
  ngOnInit(): void {
    this.mql = window.matchMedia('(max-width: 959px)');
    this.isHandset = this.mql.matches;
    this.mql.addEventListener?.('change', this.onMediaChange);
    this.updateBodyScrollLock();

    // Keep a copy of the original menu (deep clone) so filtering always starts
    // from the full menu definition and we can re-evaluate correctly.
    try {
      this.originalMenuItems = JSON.parse(JSON.stringify(this.menuItems));
    } catch {
      // Fallback shallow copy
      this.originalMenuItems = this.menuItems.map(i => ({ ...i, children: i.children ? [...i.children] : undefined }));
    }

    // Filters menu items based on user roles
    this.filterMenuByRole();


  }

  /** Filters the menu items based on the user's roles */
  private filterMenuByRole(): void {
    const userRoles = this.authService.roles();
    const source = this.originalMenuItems && this.originalMenuItems.length ? this.originalMenuItems : this.menuItems;
    this.menuItems = this.filterAndCloneMenu(source, userRoles);
  }

  /**
   * Recursively filters and clones menu items based on user roles, ensuring immutability.
   *
   * @param items - The array of NavItems to filter.
   * @param userRoles - The roles of the current user.
   * @returns A new array containing only the accessible menu items.
   */
  private filterAndCloneMenu(items: NavItem[], userRoles: string[], parentAllowedRoles?: string[]): NavItem[] {
    return items.reduce((acc, item) => {
      // Determine effective allowed roles: item.allowedRoles takes precedence;
      // if missing, inherit from parent to avoid children being open when parent is restricted.
      const effectiveAllowed = item.allowedRoles && item.allowedRoles.length > 0 ? item.allowedRoles : parentAllowedRoles;

      // Check if the user has access to this item directly using effectiveAllowed
      const hasDirectAccess = !effectiveAllowed || effectiveAllowed.length === 0 || effectiveAllowed.some(role => userRoles.includes(role));

      // If the item has children, recursively filter and clone them,
      // passing down the effectiveAllowed so children inherit restrictions when needed.
      let accessibleChildren: NavItem[] = [];
      if (item.children && item.children.length > 0) {
        accessibleChildren = this.filterAndCloneMenu(item.children, userRoles, effectiveAllowed);
      }

      // The item should be included if:
      // 1. The user has direct access to it.
      // 2. It's a parent item with at least one accessible child.
      if (hasDirectAccess || accessibleChildren.length > 0) {
        // Create a clone of the item to avoid mutation
        const clonedItem: NavItem = { ...item };

        // Assign the filtered children to the clone
        if (accessibleChildren.length > 0) {
          clonedItem.children = accessibleChildren;
        }
        acc.push(clonedItem);
      }
      return acc;
    }, [] as NavItem[]);
  }

  /** Clean up media query listeners on destroy */
  ngOnDestroy(): void {
    this.mql?.removeEventListener?.('change', this.onMediaChange);
    document.body.classList.remove('no-scroll');
    this.rolesEffect?.destroy?.();
  }

  /** Toggles sidebar visibility */
  onToggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
    this.updateBodyScrollLock();
  }

  /** Maneja cambios desde el componente Sidebar (vía two-way binding) */
  onSidebarVisibleChange(visible: boolean): void {
    this.sidebarVisible = visible;
    this.updateBodyScrollLock();
  }
}
