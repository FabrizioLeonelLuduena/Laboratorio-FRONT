import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';

import { NavItem } from '../../models/NavItem';

/**
 * Sidebar de navegación principal.
 * Visualiza los ítems de menú recibidos por Input desde el layout.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    SidebarModule,
    ButtonModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  /** Controla visibilidad (mobile) */
  @Input() visible = false;
  /** Emisor requerido para two-way binding [(visible)] */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Indica si está en vista móvil */
  @Input() isHandset = false;

  /** Ítems del menú lateral */
  @Input() menuItems: NavItem[] = [];

  /** Evento para cerrar el sidebar */
  @Output() toggleSidebar = new EventEmitter<void>();

  /** DI: Router para determinar ítem activo y expandir grupo al iniciar */
  constructor(private router: Router) {}

  /** Cierra el sidebar y emite el cambio de visibilidad */
  closeSidebar(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  expandedItems = new Set<string>(); // paths expandidos

  /** Expande automáticamente el grupo que contiene la ruta actual (mejora UX en móvil) */
  ngOnInit(): void {
    const current = this.router.url;
    for (const item of this.menuItems) {
      if (item.children?.some((c) => !!c.path && current.startsWith(c.path!))) {
        if (item.path) this.expandedItems.add(item.path);
      }
    }
  }

  /** Alterna expansión de un grupo por su path */
  toggleExpand(path: string): void {
    if (this.expandedItems.has(path)) {
      this.expandedItems.delete(path);
    } else {
      this.expandedItems.add(path);
    }
  }

  /** Indica si un grupo está expandido */
  isExpanded(path: string): boolean {
    return this.expandedItems.has(path);
  }

  /** Marca activo si el item o alguno de sus hijos coincide con la URL */
  isAnyChildActive(item: NavItem): boolean {
    const current = this.router.url;
    if (item.children?.length) {
      return item.children.some((c) => {
        if (!c.path) return false;
        return c.exactMatch ? current === c.path : current.startsWith(c.path);
      });
    }
    return !!item.path && (item.exactMatch ? current === item.path : current.startsWith(item.path));
  }
}
