import { Injectable } from '@angular/core';

import { MenuItem } from 'primeng/api';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Servicio para gestionar el breadcrumb de la aplicación
 */
@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private itemsSubject = new BehaviorSubject<MenuItem[]>([]);
  private homeSubject = new BehaviorSubject<MenuItem>({ icon: 'pi pi-home', routerLink: '/home-dashboard' });

  /**
   * Observable de los items del breadcrumb
   */
  items$: Observable<MenuItem[]> = this.itemsSubject.asObservable();

  /**
   * Observable del item home del breadcrumb
   */
  home$: Observable<MenuItem> = this.homeSubject.asObservable();

  /**
   * Establece los items del breadcrumb
   * @param items Items del breadcrumb
   */
  setItems(items: MenuItem[]): void {
    this.itemsSubject.next(items);
  }

  /**
   * Establece el item home del breadcrumb
   * @param home Item home del breadcrumb
   */
  setHome(home: MenuItem): void {
    this.homeSubject.next(home);
  }

  /**
   * Limpia los items del breadcrumb
   */
  clear(): void {
    this.itemsSubject.next([]);
  }

  /**
   * Crea items del breadcrumb a partir de un string con separador ">"
   * Ejemplo: "Compras e inventario > Proveedores > Crear"
   * @param breadcrumbString String con los items separados por ">"
   * @param baseRoute Ruta base para construir los routerLinks
   */
  setFromString(breadcrumbString: string, baseRoute: string = ''): void {
    const parts = breadcrumbString.split('>').map(part => part.trim());
    const items: MenuItem[] = [];

    parts.forEach((label, index) => {
      const item: MenuItem = { label };

      if (index < parts.length - 1) {
        if (index === 0) {
          const moduleRoute = baseRoute.split('/').slice(0, 2).join('/');
          item.routerLink = moduleRoute || '/';
        } else {
          item.routerLink = baseRoute;
        }
      }

      items.push(item);
    });

    this.setItems(items);
  }

  /**
   * Crea breadcrumbs con control explícito de rutas por nivel
   * Útil cuando necesitas rutas diferentes para cada nivel
   *
   * @example
   * // Uso básico
   * setBreadcrumbs([
   *   { label: 'Gestión de pacientes', route: '/patients' },
   *   { label: 'Listado', route: '/patients/list' },
   *   { label: 'Editar' } // Sin route = no clickeable
   * ]);
   *
   * @example
   * // Con iconos
   * setBreadcrumbs([
   *   { label: 'Dashboard', route: '/patients', icon: 'pi pi-home' },
   *   { label: 'Paciente #123' }
   * ]);
   */
  setBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void {
    const items: MenuItem[] = breadcrumbs.map(bc => {
      const item: MenuItem = { label: bc.label };
      if (bc.route) item.routerLink = bc.route;
      if (bc.icon) item.icon = bc.icon;
      if (bc.command) item.command = bc.command;
      return item;
    });
    this.setItems(items);
  }

  /**
   * Construye breadcrumbs desde la ruta actual de Angular
   * Usa los datos de configuración de rutas (route.data.breadcrumb)
   * Funciona con lazy loading y rutas anidadas
   *
   * @param route ActivatedRoute actual
   * @param options Opciones de configuración
   *
   * @example
   * // En el componente:
   * ngOnInit(): void {
   *   this.breadcrumb.buildFromRoute(this.route);
   * }
   *
   * // En las rutas (routes.ts):
   * {
   *   path: 'list',
   *   component: PatientsListComponent,
   *   data: { breadcrumb: 'Administración de pacientes' }
   * }
   *
   * @example
   * // Con override para label dinámico:
   * ngOnInit(): void {
   *   this.patientService.getById(id).subscribe(patient => {
   *     this.breadcrumb.buildFromRoute(this.route, {
   *       lastLabel: `${patient.lastName}, ${patient.firstName}`
   *     });
   *   });
   * }
   */
  buildFromRoute(route: any, options?: { lastLabel?: string; skipLevels?: number }): void {
    const breadcrumbs: BreadcrumbItem[] = [];
    const routeSnapshots: any[] = [];

    // Recolectar todos los snapshots desde root hasta la ruta actual
    let currentRoute = route;
    while (currentRoute) {
      routeSnapshots.unshift(currentRoute.snapshot);
      currentRoute = currentRoute.parent;
    }

    // Construir breadcrumbs desde los snapshots
    routeSnapshots.forEach((snapshot, index) => {
      // Obtener el breadcrumb label del route data
      const breadcrumbLabel = snapshot.data?.['breadcrumb'];

      if (breadcrumbLabel) {
        // Construir la ruta completa hasta este punto usando pathFromRoot
        // Esto maneja correctamente lazy loading y rutas anidadas con path: ''
        let fullPath = '';
        if (snapshot.pathFromRoot && snapshot.pathFromRoot.length > 0) {
          const segments = snapshot.pathFromRoot
            .filter((s: any) => s.url && s.url.length > 0)
            .flatMap((s: any) => s.url.map((u: any) => u.path))
            .filter((p: string) => p);

          if (segments.length > 0) {
            fullPath = '/' + segments.join('/');
          }
        }

        // Es el último item?
        const isLast = index === routeSnapshots.length - 1;

        breadcrumbs.push({
          label: isLast && options?.lastLabel ? options.lastLabel : breadcrumbLabel,
          route: isLast ? undefined : (fullPath || undefined)
        });
      }
    });

    // Aplicar skip levels si se especificó
    if (options?.skipLevels && options.skipLevels > 0) {
      breadcrumbs.splice(0, options.skipLevels);
    }

    this.setBreadcrumbs(breadcrumbs);
  }

  /**
   * Helper para construir la ruta completa desde un snapshot
   */
  private getFullPath(snapshot: any): string {
    const segments: string[] = [];
    let current = snapshot;

    while (current) {
      if (current.url && current.url.length > 0) {
        segments.unshift(...current.url.map((s: any) => s.path));
      }
      current = current.parent;
    }

    return '/' + segments.join('/');
  }

  /**
   * Crea un breadcrumb básico para un módulo
   * Útil para páginas home de feature groups
   *
   * @param label Label del módulo
   * @param route Ruta del módulo
   *
   * @example
   * ngOnInit(): void {
   *   this.breadcrumb.setModuleBreadcrumb('Gestión de pacientes', '/patients');
   * }
   */
  setModuleBreadcrumb(label: string, route?: string): void {
    this.setBreadcrumbs([
      { label, route }
    ]);
  }
}

/**
 * Interface para definir items de breadcrumb de forma explícita
 */
export interface BreadcrumbItem {
  label: string;
  route?: string;
  icon?: string;
  command?: () => void;
}
