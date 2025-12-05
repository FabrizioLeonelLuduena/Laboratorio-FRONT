import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

import { ButtonDirective } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import {
  ConfirmationModalComponent
} from '../../../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { StudyDetailDto, StudyStatus } from '../../../models/models';
import { EstudiosService } from '../../../services/estudios.service';
import { FirmaElectronicaService } from '../../../services/firma-electronica.service';

/**
 * Component for displaying study patient information card
 */
@Component({
  selector: 'app-estudio-info-card',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonDirective, ConfirmationModalComponent],
  templateUrl: './estudio-info-card.component.html',
  styleUrls: ['./estudio-info-card.component.css']
})
/**
 * EstudioInfoCardComponent displays patient information and study status
 */
export class EstudioInfoCardComponent implements OnInit, OnChanges {
  /**
   * Study detail information
   */
  @Input({ required: true }) estudio!: StudyDetailDto;

  @Output() firmaRealizada = new EventEmitter<void>();
  @Output() firmaError = new EventEmitter<string>();
  @Output() firmaExitosa = new EventEmitter<string>();

  puedeFirmarTotal: boolean = false;
  puedeFirmarParcial: boolean = false;
  firmando: boolean = false;
  showConfirmationModal: boolean = false;

  /**
   * Constructor
   *
   * @param estudioService - Service for study operations
   * @param firmaService - Service for electronic signature operations
   */
  constructor(
    private estudioService: EstudiosService,
    private firmaService: FirmaElectronicaService
  ) {
  }

  /**
   * Opens confirmation modal before signing
   */
  abrirModalConfirmacion(): void {
    this.showConfirmationModal = true;
  }

  /**
   * Handles confirm action from modal
   */
  onConfirmFirm(): void {
    this.showConfirmationModal = false;
    this.firmarEstudio();
  }

  /**
   * Handles dismiss action from modal
   */
  onDismissModal(): void {
    this.showConfirmationModal = false;
  }

  /**
   * Initializes the component
   */
  ngOnChanges(_changes: SimpleChanges): void {
    this.calcularEstadoFirma();
  }

  /**
   * Handles changes to input properties
   */
  ngOnInit(): void {
    this.calcularEstadoFirma();
  }

  /**
   * Executes intelligent study signature
   * The backend automatically determines if it's partial or total signature
   */
  firmarEstudio() {
    if (!this.estudio) return;

    this.firmando = true;

    this.firmaService.signStudyIntelligently(this.estudio.id).subscribe({
      next: (response) => {
        const mensaje = this.firmaService.getSignatureMessage(response);
        this.firmaExitosa.emit(mensaje);
        this.firmando = false;
        this.firmaRealizada.emit();
      },
      error: (err) => {
        const mensaje = err.message || 'Error al firmar el estudio';
        this.firmaError.emit(mensaje);
        this.firmando = false;
      }
    });
    this.onDismissModal();
  }


  /**
   * Calculates signature status based on backend rules:
   * - Total signature: ALL results must be in VALIDATED status
   * - Partial signature: SOME results must be in VALIDATED status
   * - Cannot sign: No result is VALIDATED or study is CLOSED
   */
  calcularEstadoFirma() {
    if (!this.estudio || !this.estudio.results) {
      this.puedeFirmarTotal = false;
      this.puedeFirmarParcial = false;
      return;
    }

    if (this.estudio.currentStatus === 'CLOSED') {
      this.puedeFirmarTotal = false;
      this.puedeFirmarParcial = false;
      return;
    }

    this.puedeFirmarTotal = this.firmaService.canSignTotal(this.estudio.results);
    this.puedeFirmarParcial = this.firmaService.canSignPartial(this.estudio.results);
  }

  /**
   * Maps study status to result status severity for consistent badge colors
   *
   * @param status - Study status
   * @returns Badge severity matching result status colors
   */
  getEstadoSeverityAsResult(status: StudyStatus): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
    case 'CLOSED':
      return 'success';
    case 'READY_FOR_SIGNATURE':
      return 'info';
    case 'PARTIALLY_SIGNED':
      return 'warn';
    case 'PENDING':
      return 'warn';
    default:
      return 'warn';
    }
  }

  /**
   * Gets the status label
   *
   * @param status - Study status
   * @returns Status label
   */
  getEstadoLabel(status: StudyStatus): string {
    return this.estudioService.getStatusLabel(status);
  }
}
