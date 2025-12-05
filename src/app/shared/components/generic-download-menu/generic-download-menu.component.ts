import { CommonModule } from '@angular/common';
import { Component, HostListener, signal, output, input } from '@angular/core';

/**
 * @component GenericDownloadMenuComponent
 *
 * Generic download menu component that provides export options
 * for different data formats (e.g., Excel and PDF).
 *
 * It includes automatic closing behavior when clicking outside
 * and is visually aligned with the generic button styles for
 * consistent UI appearance.
 *
 * @example
 * ```html
 * <app-generic-download-menu
 *   (downloadExcel)="onExportExcel()"
 *   (downloadPdf)="onExportPdf()">
 * </app-generic-download-menu>
 * ```
 *
 * @example
 * ```typescript
 * onExportExcel(): void {
 *   // Trigger Excel export logic
 * }
 *
 * onExportPdf(): void {
 *   // Trigger PDF export logic
 * }
 * ```
 */
@Component({
  selector: 'app-generic-download-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-download-menu.component.html',
  styleUrls: ['./generic-download-menu.component.css']
})
export class GenericDownloadMenuComponent {
  /**
   * Label text displayed on the button.
   * If empty, only the icon will be shown.
   *
   * @default ''
   */
  text = input<string>('');

  /**
   * Controls whether the Excel option is visible.
   *
   * @default true
   */
  showExcel = input<boolean>(true);

  /**
   * Controls whether the PDF option is visible.
   *
   * @default true
   */
  showPdf = input<boolean>(true);

  /**
   * Controls whether the download menu is disabled.
   *
   * @default false
   */
  disabled = input<boolean>(false);

  /**
   * Controls the visibility state of the dropdown menu.
   * Uses Angular's reactive `signal` for reactivity and simplicity.
   */
  isOpen = signal(false);

  /**
   * Event emitted when the user selects the **Excel** option.
   * Should be bound to a parent component method handling export logic.
   */
  downloadExcel = output<void>();

  /**
   * Event emitted when the user selects the **PDF** option.
   * Should be bound to a parent component method handling export logic.
   */
  downloadPdf = output<void>();

  /**
   * Toggles the download menu open or closed.
   * Typically triggered by clicking the main button.
   */
  toggleMenu(): void {
    if (this.disabled()) return;
    this.isOpen.set(!this.isOpen());
  }

  /**
   * Handles the download action based on the selected type.
   * Emits the corresponding event and closes the menu.
   *
   * @param type - The export format selected by the user ('excel' | 'pdf').
   */
  download(type: 'excel' | 'pdf'): void {
    if (type === 'excel') this.downloadExcel.emit();
    else this.downloadPdf.emit();
    this.isOpen.set(false);
  }

  /**
   * Listens for document-level clicks.
   * Automatically closes the menu if the user clicks outside of it.
   *
   * @param event - The click event from the document.
   */
  @HostListener('document:click', ['$event'])
  onOutsideClick(event: Event): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.download-menu-container');
    if (!clickedInside && this.isOpen()) {
      this.isOpen.set(false);
    }
  }
}
