import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterOutlet } from '@angular/router';

import { Subject, takeUntil, filter } from 'rxjs';

import { ManualSidebarComponent } from '../manual-sidebar/manual-sidebar.component';

/**
 * Componente layout del manual que maneja el reseteo de scroll en navegaciones internas
 */
@Component({
  selector: 'app-manual-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    ManualSidebarComponent,
    RouterLink
  ],
  templateUrl: './manual-layout.component.html',
  styleUrl: './manual-layout.component.css'
})
export class ManualLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  @ViewChild('contentScroll', { read: ElementRef }) contentScroll?: ElementRef;

  /**
   * Inicializa la suscripción a eventos de navegación del Router.
   * Detecta cuando se navega a una ruta que comienza con '/manual' y resetea el scroll.
   * @returns {void}
   */
  ngOnInit(): void {
    // Suscribirse a eventos de navegación solo mientras este componente existe
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        filter((event: NavigationEnd) => event.url.startsWith('/manual')),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.resetScroll();
      });
  }

  /**
   * Hook del ciclo de vida que se ejecuta después de que la vista se ha inicializado.
   * Resetea el scroll por si hubo una navegación antes de que la vista estuviera lista.
   * @returns {void}
   */
  ngAfterViewInit(): void {
    // Si hay un cambio de ruta antes de que la vista esté lista, resetear scroll
    setTimeout(() => this.resetScroll(), 0);
  }

  /**
   * Resetea el scroll del contenedor de contenido al inicio (top: 0).
   * Intenta primero con la referencia ViewChild, luego con querySelector y finalmente con window.
   * @private
   * @returns {void}
   */
  private resetScroll(): void {
    // Intentar resetear el scroll del contenedor .content
    if (this.contentScroll?.nativeElement) {
      this.contentScroll.nativeElement.scrollTop = 0;
    } else {
      // Fallback: intentar con querySelector
      const contentElement = document.querySelector('.content');
      if (contentElement) {
        contentElement.scrollTop = 0;
      } else {
        // Último fallback: window
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }

  /**
   * Hook del ciclo de vida que se ejecuta cuando el componente se destruye.
   * Limpia las suscripciones activas para evitar memory leaks.
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
