import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';

import packageInfo from '../../../../../package.json';

/**
 *
 */
interface FooterLink {
  label: string;
  route: string;
}

/**
 * Footer con PrimeNG + variables globales de estilo.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, DividerModule, TagModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  /** Nombre de la aplicación */
  @Input() appName = 'Laboratorio Castillo Chidiak';

  /** Versión leída desde package.json */
  version = packageInfo.version;

  /** Año actual */
  currentYear = new Date().getFullYear();

  /** Enlaces del footer */
  links: FooterLink[] = [
    { label: 'Términos', route: '/terms' },
    { label: 'Privacidad', route: '/privacy' },
    { label: 'Soporte', route: '/support' }
  ];
}
