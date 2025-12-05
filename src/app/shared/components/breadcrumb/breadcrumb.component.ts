import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { Subject, takeUntil, filter } from 'rxjs';

import { BreadcrumbService } from '../../services/breadcrumb.service';

/**
 * Componente de breadcrumb genérico usando PrimeNG
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, BreadcrumbModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.css']
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  items: MenuItem[] = [];
  home: MenuItem | undefined = undefined;
  isHomeDashboard: boolean = false;

  private destroy$ = new Subject<void>();
  private breadcrumbService = inject(BreadcrumbService);
  private router = inject(Router);

  /**
   * Inicialización del componente
   */
  ngOnInit(): void {
    // Detectar si estamos en home-dashboard al iniciar
    this.updateHomeDashboardState();

    // Escuchar cambios de ruta para actualizar el estado
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateHomeDashboardState();
      });

    // Suscribirse a los cambios de items
    this.breadcrumbService.items$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.items = items || [];
      });

    // Suscribirse al item home (casita)
    this.breadcrumbService.home$
      .pipe(takeUntil(this.destroy$))
      .subscribe(home => {
        this.home = home;
      });
  }

  /**
   * Actualiza el estado de si estamos en home-dashboard
   */
  private updateHomeDashboardState(): void {
    this.isHomeDashboard = this.router.url === '/home-dashboard';
  }

  /**
   * Limpieza al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
