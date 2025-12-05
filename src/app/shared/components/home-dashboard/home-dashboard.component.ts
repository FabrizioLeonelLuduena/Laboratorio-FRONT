import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { CardModule } from 'primeng/card';

import { AuthService } from '../../../core/authentication/auth.service';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { PageTitleService } from '../../services/page-title.service';

/**
 * Role-based post-login dashboard.
 * Displays quick access actions enabled for the current user roles (internal English names).
 * Backend provides Spanish role codes; they are mapped to internal English role identifiers.
 */
@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule],
  templateUrl: './home-dashboard.component.html',
  styleUrl: './home-dashboard.component.css'
})
export class HomeDashboardComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private pageTitle = inject(PageTitleService);
  private breadcrumb = inject(BreadcrumbService);

  /** Backend role codes (Spanish) mapped to internal English role identifiers */
  private readonly backendToInternalMap: Record<BackendRole, InternalRole> = {
    ADMINISTRADOR: 'ADMINISTRATOR',
    SECRETARIA: 'SECRETARY',
    RESPONSABLE_SECRETARIA: 'SECRETARY_LEAD',
    FACTURISTA: 'BILLING_CLERK',
    TECNICO_LABORATORIO: 'LAB_TECH',
    BIOQUIMICO: 'BIOCHEMIST',
    MANAGER_STOCK: 'STOCK_MANAGER',
    EXTERNO: 'EXTERNAL',
    OPERADOR_COMPRAS: 'PURCHASING_OPERATOR'
  };

  /** Current user internal roles (English) */
  readonly internalUserRoles = signal<InternalRole[]>(this.extractInternalRoles());

  /** Real-time clock signal */
  private readonly now = signal(new Date());
  readonly currentDate = this.now; // for formatted date pipe
  readonly currentTime = this.now; // for time HH:mm

  /** Display name formatted as "LastName, FirstName" */
  readonly displayName = computed(() => {
    const user = this.auth.getUser();
    const last = (user?.lastName ?? '').trim();
    const first = (user?.firstName ?? '').trim();
    const parts = [last, first].filter(Boolean);
    return parts.length ? parts.join(', ') : 'User';
  });

  /** Catalog of dashboard cards (English labels). */
  readonly allActions = signal<DashboardCard[]>([
    {
      id: 'admin-users',
      label: 'Usuarios',
      description: 'Gestión de usuarios internos',
      icon: 'pi pi-users',
      route: '/user-management',
      roles: ['ADMINISTRATOR'],
      category: 'Administration'
    },
    {
      id: 'admin-branches',
      label: 'Sucursales',
      description: 'Configurar sucursales y personal',
      icon: 'pi pi-sitemap',
      route: '/care-management/branches',
      roles: ['ADMINISTRATOR'],
      category: 'Administration'
    },
    {
      id: 'ops-print',
      label: 'Impresión de rótulos',
      description: 'Imprimir etiquetas de muestras',
      icon: 'pi pi-print',
      route: '/analytical-management/print',
      roles: ['SECRETARY', 'SECRETARY_LEAD', 'BIOCHEMIST', 'LAB_TECH'],
      category: 'Operations'
    },
    {
      id: 'ops-coverages',
      label: 'Gestión de coberturas',
      description: 'Administrar aseguradoras y planes',
      icon: 'pi pi-briefcase',
      route: '/coverage-administration',
      roles: ['SECRETARY', 'SECRETARY_LEAD', 'BILLING_CLERK', 'ADMINISTRATOR'],
      category: 'Finance'
    },
    {
      id: 'ops-attentions',
      label: 'Atenciones',
      description: 'Registrar y administrar atenciones',
      icon: 'pi pi-calendar-plus',
      route: '/care-management/attentions',
      roles: ['SECRETARY', 'SECRETARY_LEAD'],
      category: 'Operations'
    },
    {
      id: 'ops-patients',
      label: 'Pacientes',
      description: 'Listado y gestión de pacientes',
      icon: 'pi pi-id-card',
      route: '/patients',
      roles: ['SECRETARY', 'SECRETARY_LEAD'],
      category: 'Operations'
    },
    {
      id: 'inv-procurement',
      label: 'Compras e inventario',
      description: 'Stock, compras y logística',
      icon: 'pi pi-truck',
      route: '/procurement-inventory',
      roles: ['SECRETARY', 'SECRETARY_LEAD', 'ADMINISTRATOR', 'STOCK_MANAGER', 'PURCHASING_OPERATOR'],
      category: 'Inventory'
    },
    {
      id: 'fin-billing',
      label: 'Facturación y cobros',
      description: 'Operaciones de caja y facturas',
      icon: 'pi pi-wallet',
      route: '/billing-collections',
      roles: ['BILLING_CLERK'],
      category: 'Finance'
    },
    {
      id: 'lab-pre',
      label: 'Pre-analítica',
      description: 'Registro y preparación de muestras',
      icon: 'pi pi-list-check',
      route: '/analytical-management/pre-analytical',
      roles: ['BIOCHEMIST', 'LAB_TECH'],
      category: 'Laboratory'
    },
    {
      id: 'lab-analytical',
      label: 'Analítica',
      description: 'Monitorear el avance analítico',
      icon: 'pi pi-clipboard',
      route: '/analytical-management/status-followment',
      roles: ['BIOCHEMIST', 'LAB_TECH'],
      category: 'Laboratory'
    },
    {
      id: 'lab-post',
      label: 'Post-analítica',
      description: 'Validación y firma de informes',
      icon: 'pi pi-check-circle',
      route: '/analytical-management/post-analytical',
      roles: ['BIOCHEMIST', 'LAB_TECH'],
      category: 'Laboratory'
    },
    {
      id: 'queue',
      label: 'Cola de atencion',
      description: 'Modulo de cola para pacientes',
      icon: 'pi pi-receipt',
      route: '/queue',
      roles: ['ADMINISTRATOR', 'SECRETARY_LEAD', 'SECRETARY'],
      category: 'Laboratory'
    },
    {
      id: 'external-portal',
      label: 'Portal externo',
      description: 'Acceso limitado externo',
      icon: 'pi pi-external-link',
      route: '/external',
      roles: ['EXTERNAL'],
      category: 'External'
    }
  ]);

  /** Filtered list based on internal roles */
  readonly visibleActions = computed(() => {
    const roles = this.internalUserRoles();
    if (roles.includes('ADMINISTRATOR')) return this.allActions();
    return this.allActions().filter(a => a.roles.some(r => roles.includes(r)));
  });

  /** trackBy for *ngFor */
  trackById = (_: number, item: DashboardCard) => item.id;

  /** Interval timer id (browser number) */
  private timerId!: number;

  /**
   * Initializes the real-time clock interval and sets page title.
   */
  ngOnInit(): void {
    // Page title for home-dashboard
    this.pageTitle.setTitle('Laboratorio Castillo Chidiak');

    // Clear any previous breadcrumb (won't show home icon because it's /home-dashboard)
    this.breadcrumb.clear();

    // Real-time clock
    this.timerId = window.setInterval(() => this.now.set(new Date()), 1000);
  }

  /**
   * Clears the real-time clock interval on destroy.
   */
  ngOnDestroy(): void {
    if (this.timerId) window.clearInterval(this.timerId);
  }

  /** Navigate to provided route */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /** Extracts internal English role identifiers from backend Spanish role codes. */
  private extractInternalRoles(): InternalRole[] {
    const backendRoles = this.auth.getUserRoles(); // returns array of backend role strings (Spanish codes)
    if (!backendRoles || backendRoles.length === 0) return [];
    const mapped: InternalRole[] = [];
    for (const br of backendRoles) {
      const upper = br?.toUpperCase() as BackendRole | undefined;
      if (!upper) continue;
      const internal = this.backendToInternalMap[upper];
      if (internal && !mapped.includes(internal)) mapped.push(internal);
    }
    return mapped;
  }
}

/** Backend Spanish role codes as received from API */
export type BackendRole = 'ADMINISTRADOR' | 'SECRETARIA' | 'RESPONSABLE_SECRETARIA' | 'FACTURISTA' | 'TECNICO_LABORATORIO' | 'BIOQUIMICO' | 'MANAGER_STOCK' | 'EXTERNO' | 'OPERADOR_COMPRAS';

/** Internal English role identifiers used within the app */
export type InternalRole = 'ADMINISTRATOR' | 'SECRETARY' | 'SECRETARY_LEAD' | 'BILLING_CLERK' | 'LAB_TECH' | 'BIOCHEMIST' | 'STOCK_MANAGER' | 'EXTERNAL' | 'PURCHASING_OPERATOR';

/** Dashboard card model */
export interface DashboardCard {
  id: string;
  label: string;
  description?: string;
  icon: string;
  route: string;
  roles: InternalRole[];
  category: string;
}
