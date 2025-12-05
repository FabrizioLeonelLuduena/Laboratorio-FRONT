import { NgClass } from '@angular/common';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

/**
 * ManualToggleComponent
 * Pequeño componente toggle (desplegable) que muestra un título y proyecta el contenido
 * dentro del panel. Diseñado para usarse sólo en páginas concretas (p. ej. actions-appointments).
 */
@Component({
  standalone: true,
  selector: 'app-manual-toggle',
  imports: [NgClass],
  templateUrl: './manual-toggle.component.html',
  styleUrls: ['./manual-toggle.component.css']
})
export class ManualToggleComponent implements OnInit {
  @Input() title: string = '';
  @Input() openByDefault: boolean = false;

  // Controlled input (optional). If provided, parent controls open state.
  @Input() open?: boolean;
  @Output() openChange = new EventEmitter<boolean>();

  // internal state used when `open` input is undefined
  internalOpen: boolean = false;

  /**
   * Inicializa el estado interno según la prop `openByDefault`.
   */
  ngOnInit() {
    this.internalOpen = !!this.openByDefault;
  }

  /**
   * Estado efectivo abierto del toggle (controlado o no).
   */
  get currentOpen(): boolean {
    return this.open !== undefined ? this.open : this.internalOpen;
  }

  /**
   * Alterna el estado abierto. Si el componente está en modo controlado emite el cambio,
   * si no actualiza su estado interno.
   */
  toggle() {
    const newState = !this.currentOpen;
    if (this.open !== undefined) {
      // controlled mode: emit change, parent must update input
      this.openChange.emit(newState);
    } else {
      // uncontrolled mode: update internal state directly
      this.internalOpen = newState;
    }
  }
}
