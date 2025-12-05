import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';

import { ButtonModule } from 'primeng/button';

import { StudyDetailDto } from '../../models/models';
import { FirmaElectronicaService } from '../../services/firma-electronica.service';

/**
 * Component for signing study determinations
 */
@Component({
  selector: 'app-estudio-firma',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './estudio-firma.component.html',
  styleUrls: ['./estudio-firma.component.css']
})
/**
 * EstudioFirmaComponent handles the signing of study determinations
 */
export class EstudioFirmaComponent implements OnInit, OnChanges {
  @Input() estudio?: StudyDetailDto;
  @Output() firmaRealizada = new EventEmitter<void>();
  @Output() firmaError = new EventEmitter<string>();
  @Output() firmaExitosa = new EventEmitter<string>();

  puedeFirmarTotal: boolean = false;
  puedeFirmarParcial: boolean = false;
  firmando: boolean = false;

  /**
   * Constructor
   */
  constructor(
    private firmaService: FirmaElectronicaService
  ) {}

  /**
   * Initializes the component
   */
  ngOnInit() {
    this.calcularEstadoFirma();
  }

  /**
   * Handles changes to input properties
   */
  ngOnChanges() {
    this.calcularEstadoFirma();
  }

  /**
   * Calcula el estado de firma basándose en las reglas del backend:
   * - Firma Total: TODOS los resultados deben estar en estado VALIDATED
   * - Firma Parcial: ALGUNOS resultados deben estar en estado VALIDATED
   * - No se puede firmar: Ningún resultado está VALIDATED o el estudio está CLOSED
   */
  calcularEstadoFirma() {
    if (!this.estudio || !this.estudio.results) {
      this.puedeFirmarTotal = false;
      this.puedeFirmarParcial = false;
      return;
    }

    // No permitir firmar si el estudio ya está cerrado
    if (this.estudio.currentStatus === 'CLOSED') {
      this.puedeFirmarTotal = false;
      this.puedeFirmarParcial = false;
      return;
    }

    // Verificar usando el servicio de firma
    this.puedeFirmarTotal = this.firmaService.canSignTotal(this.estudio.results);
    this.puedeFirmarParcial = this.firmaService.canSignPartial(this.estudio.results);
  }

  /**
   * Ejecuta la firma inteligente del estudio
   * El backend determina automáticamente si es firma parcial o total
   */
  firmarEstudio() {
    if (!this.estudio) return;

    this.firmando = true;

    this.firmaService.signStudyIntelligently(this.estudio.id).subscribe({
      next: (response) => {
        const mensaje = this.firmaService.getSignatureMessage(response);
        this.firmaExitosa.emit(mensaje);
        this.firmando = false;
        // Notificar al padre para que recargue el estudio
        this.firmaRealizada.emit();
      },
      error: (err) => {
        const mensaje = err.message || 'Error al firmar el estudio';
        this.firmaError.emit(mensaje);
        this.firmando = false;
      }
    });
  }

  /**
   * Obtiene el mensaje de ayuda según el tipo de firma
   */
  getMensajeAyuda(): string {
    if (this.estudio?.currentStatus === 'CLOSED') {
      return 'Este estudio ya está cerrado y no puede ser firmado nuevamente.';
    }

    if (this.puedeFirmarTotal) {
      return 'Todos los análisis están validados. Se realizará firma total y se cerrará el estudio.';
    } else if (this.puedeFirmarParcial) {
      return 'Solo algunos análisis están validados. Se realizará firma parcial.';
    }
    return 'No hay análisis validados disponibles para firmar. Valida al menos un análisis completo.';
  }
}
