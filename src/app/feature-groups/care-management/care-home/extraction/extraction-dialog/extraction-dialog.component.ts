import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';

import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';

/**
 * Dialog for handling the start and end of an extraction process.
 */
@Component({
  selector: 'app-extraction-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, InputText, ReactiveFormsModule, GenericButtonComponent],
  templateUrl: './extraction-dialog.component.html',
  styleUrls: ['./extraction-dialog.component.css']
})
export class ExtractionDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private config = inject(DynamicDialogConfig);
  private ref = inject(DynamicDialogRef);

  extractionForm!: FormGroup;
  mode: 'start' | 'close' = 'start';
  attention: any;

  /**
   * Inicializa el componente
   */
  ngOnInit(): void {
    this.mode = this.config.data.mode;
    this.attention = this.config.data.attention;

    this.extractionForm = this.fb.group({
      protocolId: [{ value: this.attention.protocolId, disabled: true }],
      dni: [{ value: this.attention.patient?.dni, disabled: true }],
      fullName: [{ value: `${this.attention.patient?.lastName} ${this.attention.patient?.firstName}`, disabled: true }],
      analysisCount: [{ value: this.attention.analysisIds?.length ?? 0, disabled: true }],
      tubesCount: [{ value: this.attention.labelCount, disabled: true }],
      indications: [{ value: this.attention.indications || 'Sin indicaciones', disabled: true }],
      extractorNotes: [this.attention.observations || '']
    });
  }


  /** Confirm (either start or close extraction) */
  onConfirm(): void {
    const notes = this.extractionForm.get('extractorNotes')?.value || '';
    this.ref.close({ notes });
  }

  /** Release attention back to queue */
  onLiberar(): void {
    this.ref.close({ liberar: true });
  }

  /** Cancel dialog */
  onCancel(): void {
    this.ref.close(null);
  }
}
