import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';

/**
 * Componente de pantalla inicial para la gestión de cola
 * Permite seleccionar si el paciente tiene turno o no
 */
@Component({
  selector: 'app-queue-start',
  standalone: true,
  imports: [CommonModule, RouterModule, GenericButtonComponent],
  templateUrl: './queue-start.component.html',
  styleUrls: ['./queue-start.component.css']
})
export class QueueStartComponent {
  /**
   * Constructor del componente
   */
  constructor(private router: Router) {}

  /**
   * Navega al registro con turno
   */
  onWithAppointment(): void {
    this.router.navigate(['/queue/register'], { queryParams: { hasAppointment: 'true' } });
  }

  /**
   * Navega al registro sin turno
   */
  onWithoutAppointment(): void {
    this.router.navigate(['/queue/register'], { queryParams: { hasAppointment: 'false' } });
  }
}

