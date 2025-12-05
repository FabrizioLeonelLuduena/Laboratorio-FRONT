import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, ViewEncapsulation } from '@angular/core';

import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';

/**
 * Generic contextual menu component with customizable options.
 * Uses PrimeNG Popover to display a floating menu with actions.
 * @template T The type of data associated with each row
 */
@Component({
  selector: 'app-generic-menu',
  standalone: true,
  imports: [CommonModule, ButtonModule, PopoverModule],
  templateUrl: './generic-menu.component.html',
  styleUrls: ['./generic-menu.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class GenericMenuComponent<T = Record<string, unknown>> {
  @ViewChild('popover') popover!: Popover;

  @Input() items: MenuItem[] = [];
  @Input() rowData?: T;
  @Input() icon = 'pi pi-ellipsis-v';
  @Output() actionSelected = new EventEmitter<{ action: string; row: T | undefined }>();

  /**
   * Handles the selected menu action.
   * Executes the command if defined, and emits the actionSelected event.
   * @param event - DOM event to prevent propagation
   * @param item - Selected menu item
   */
  handleAction(event: Event, item: MenuItem): void {
    event.preventDefault();
    event.stopPropagation();

    // Execute the command directly if it exists
    if (item.command) {
      item.command({ originalEvent: event, item });
    }

    // Also emit the event for backward compatibility
    const action = (item.id ?? item.label) as string;
    this.actionSelected.emit({ action, row: this.rowData });

    if (this.popover) {
      this.popover.hide();
    }
  }

  /**
   * Opens the menu programmatically.
   * Useful for tutorials or automated flows.
   */
  openMenu(): void {
    if (this.popover) {
      this.popover.show(new Event('click'));
    }
  }
}