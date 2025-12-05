import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';

import { Divider } from 'primeng/divider';
import { Subject } from 'rxjs';
import { forkJoin } from 'rxjs';

import { takeUntil } from 'rxjs/operators';

import { GenericBadgeComponent } from '../../../../../shared/components/generic-badge/generic-badge.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from '../../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { PlanCompleteResponseDTO } from '../../../../coverage-administration/models/plan.model';
import { InsurerPlansService } from '../../../../coverage-administration/services/insurer-plans.service';
import { PatientResponse } from '../../../../patients/models/PatientModel';
import { PatientService } from '../../../../patients/services/PatientService';
import { AnalysisApp } from '../../../models/analysis.models';
import { AttentionResponse } from '../../../models/attention.models';
import { DoctorResponse } from '../../../models/doctors.model';
import { AnalysisService } from '../../../services/analysis.service';

/**
 * Presentational component for displaying and retrieving attention details.
 * This component receives all data via @Input and emits events via @Output.
 */
@Component({
  selector: 'app-attention-detail',
  standalone: true,
  imports: [
    Divider,
    GenericButtonComponent,
    GenericBadgeComponent,
    DatePipe,
    TitleCasePipe,
    ConfirmationModalComponent
  ],
  templateUrl: './attention-detail.component.html',
  styleUrls: ['./attention-detail.component.css']
})
export class AttentionDetailComponent implements OnInit, OnDestroy {
  @Input() attention?: AttentionResponse;
  @Input() doctorObject?: DoctorResponse | null;
  @Input() saving = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();

  // State of the modal that asks if you want to print at the end
  showPrintConfirm = false;

  private patientService = inject(PatientService);
  private insurerPlanService = inject(InsurerPlansService);
  private analysisService = inject(AnalysisService);

  plan: PlanCompleteResponseDTO | null = null ;
  analyses: (AnalysisApp | null)[] = [];
  patient: PatientResponse | null = null;

  private destroy$ = new Subject<void>();

  /**
   * OnInit
   */
  ngOnInit() {

    this.loadPlan();
    this.loadPatient();
    this.loadAnalyses();

  }

  /**
   * On Destroy
   */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads used plan
   */
  loadPlan() {
    if(!this.attention?.insurancePlanId){
      return;
    }
    this.insurerPlanService.getPlanById(this.attention?.insurancePlanId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (insurer) => {
          this.plan = insurer;
        }
      });
  }

  /**
   * Loads patient
   */
  loadPatient() {
    if(!this.attention?.patientId) {
      return;
    }
    this.patientService.getPatientById(this.attention.patientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patient) => {
          this.patient = patient;
        }
      });
  }

  /**
   * Loads analyses
   */
  loadAnalyses() {
    if (!this.attention?.analysisIds?.length) {
      return;
    }

    forkJoin(
      this.attention?.analysisIds.map(id => this.analysisService.getAnalysisById(id))
    ).pipe(takeUntil(this.destroy$)).
      subscribe({
        next: (analysis) => {
          this.analyses = analysis;
        }
      });
  }

  /**
   * Emits confirm event.
   */
  onSaveAndNext(): void {
    this.showPrintConfirm = true;
  }

  /** User confirmed they want to print */
  onPrintConfirmed(): void {
    this.print.emit();
    this.onPrintDismissed();
  }

  /** User does NOT want to print */
  onPrintDismissed(): void {
    this.showPrintConfirm = false;
    this.confirm.emit();
  }

  /**
   * Emits previous event.
   */
  previousStep(): void {
    this.previous.emit();
  }

  /**
   * Emits print event (legacy, no longer used since the template).
   */
  printAttention(): void {
    this.print.emit();
  }

  /**
   * Converts backend date format (array or string) to Date object
   * Backend may return dates as arrays: [year, month, day, hour, minute, second, nanosecond]
   */
  parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    // If it's already a Date object, return it
    if (dateValue instanceof Date) return dateValue;

    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // If it's an array (Java LocalDateTime format)
    if (Array.isArray(dateValue) && dateValue.length >= 6) {
      // Array format: [year, month, day, hour, minute, second, nanosecond]
      // Note: JavaScript months are 0-indexed, but Java months are 1-indexed
      const [year, month, day, hour, minute, second] = dateValue;
      return new Date(year, month - 1, day, hour, minute, second);
    }

    return null;
  }
}
