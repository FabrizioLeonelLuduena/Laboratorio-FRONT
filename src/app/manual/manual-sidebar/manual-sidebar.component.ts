import { NgClass, NgForOf, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ManualService } from '../manual.service';

/**
 *
 */
@Component({
  selector: 'app-manual-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    NgForOf,
    RouterLinkActive,
    NgIf,
    NgClass
  ],
  templateUrl: './manual-sidebar.component.html',
  styleUrl: './manual-sidebar.component.css'
})
export class ManualSidebarComponent {

  manualService = inject(ManualService);

  modules = this.manualService.modules; // SIGNAL: auto-reactivo

  // mapa dinámico de grupos abiertos
  openGroups: Record<string, boolean> = {};

  /**
   *asdas
   */
  toggle(moduleId: string) {
    // Si ya estaba abierto, lo cerramos y listo
    if (this.openGroups[moduleId]) {
      this.openGroups[moduleId] = false;
      return;
    }

    // Cerrar todos los otros módulos
    this.openGroups = {};

    // Abrir solo este
    this.openGroups[moduleId] = true;
  }


  /**
   *asdas
   */
  isOpen(moduleId: string) {
    return this.openGroups[moduleId];
  }
}
