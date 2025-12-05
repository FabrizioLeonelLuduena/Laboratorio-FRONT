import { NgClass } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import {
  ManualBlock,
  ParagraphBlock,
  SubtitleBlock,
  ImageBlock,
  NoteBlock,
  TableBlock,
  ListBlock,
  TitleBlock,
  BadgeBlock,
  DropdownBlock // añadido
} from '../IManual';
import { ManualBadgeComponent } from '../manual-badge/manual-badge.component';
import { ManualLightboxService } from '../manual-lightbox.service'; // añadido

/**
 *
 */
@Component({
  standalone: true,
  selector: 'app-manual-blocks',
  imports: [NgClass, ManualBadgeComponent],
  templateUrl: './manual-blocks.component.html',
  styleUrls: ['./manual-blocks.component.css']
})
export class ManualBlocksComponent {
  @Input() blocks: ManualBlock[] = [];

  private sanitizer = inject(DomSanitizer);
  private lightbox = inject(ManualLightboxService); // añadido

  /**
   *dasd
   */
  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   *das
   */
  isTitle(block: ManualBlock): block is TitleBlock {
    return block.type === 'title';
  }

  /**
   *das
   */
  isParagraph(block: ManualBlock): block is ParagraphBlock {
    return block.type === 'paragraph';
  }

  /**
   *ads
   */
  isSubtitle(block: ManualBlock): block is SubtitleBlock {
    return block.type === 'subtitle';
  }

  /**
   *das
   */
  isImage(block: ManualBlock): block is ImageBlock {
    return block.type === 'image';
  }

  /**
   *das
   */
  isNote(block: ManualBlock): block is NoteBlock {
    return block.type === 'note';
  }

  /**
   *das
   */
  isTable(block: ManualBlock): block is TableBlock {
    return block.type === 'table';
  }

  /**
   *das
   */
  isList(block: ManualBlock): block is ListBlock {
    return block.type === 'list';
  }

  /**
   * Comprueba si el bloque es de tipo badge.
   */
  isBadge(block: ManualBlock): block is BadgeBlock {
    return block.type === 'badge';
  }

  /**
   * Comprueba si el bloque es un dropdown.
   */
  isDropdown(block: ManualBlock): block is DropdownBlock {
    return block.type === 'dropdown';
  }

  // Mantiene los valores seleccionados en memoria (no persistente)
  private dropdownValues = new WeakMap<DropdownBlock, string | string[]>();

  /**
   * Obtiene el valor seleccionado actual para el bloque (usa selected por defecto)
   */
  getDropdownValue(block: DropdownBlock): string | string[] | null {
    if (this.dropdownValues.has(block)) return this.dropdownValues.get(block) ?? null;
    if (block.selected) return block.selected;
    return null;
  }

  /**
   * Comprueba si una opción está seleccionada (considera múltiple y simple)
   */
  isSelected(block: DropdownBlock, value: string): boolean {
    const current = this.getDropdownValue(block);
    if (current == null) return false;
    if (Array.isArray(current)) return current.includes(value);
    return current === value;
  }

  /**
   * Maneja el evento change del select
   */
  onDropdownChange(block: DropdownBlock, event: Event) {
    const target = event.target as HTMLSelectElement;
    if (!target) return;

    if (block.multiple) {
      const values: string[] = Array.from(target.selectedOptions).map((o) => o.value);
      this.dropdownValues.set(block, values);
    } else {
      this.dropdownValues.set(block, target.value);
    }

    // Por ahora solo almacenamos localmente; si se necesita disparar una acción,
    // aquí sería el lugar para emitir un EventEmitter o llamar a un servicio.
    // console.log('Dropdown change', block, this.getDropdownValue(block));
  }

  /**
   * Abre la imagen en el overlay global (fuera del panel/desplegable)
   * Si la imagen fue clickeada dentro de un `.manual-toggle` forzamos tamaño grande.
   */
  openImage(event: Event, src: string) {
    const target = (event && (event.target as HTMLElement)) || null;
    let inToggle = false;

    if (target) {
      let node: HTMLElement | null = target;
      while (node && node !== document.body) {
        if (node.classList && node.classList.contains('manual-toggle')) {
          inToggle = true;
          break;
        }
        node = node.parentElement;
      }
    }

    this.lightbox.open(src, { forceLarge: inToggle });
  }

  /**
   * Cierra el overlay (si está abierto)
   */
  closeImage() {
    this.lightbox.close();
  }

  /**
   * Indica si el bloque actual es un divisor horizontal.
   * @param block Bloque del manual.
   * @returns True si el bloque es de tipo "divider".
   */
  isDivider(block: any): boolean {
    return block.type === 'divider';
  }


}
