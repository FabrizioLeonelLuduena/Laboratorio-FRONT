import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, ViewChild, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { Step, StepList, Stepper } from 'primeng/stepper';
import { StepsModule } from 'primeng/steps';

// Shared / local components
import { GenericAlertComponent } from '../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from '../../../shared/components/generic-confirmation/confirmation-modal.component';
import { BreadcrumbService } from '../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../shared/services/page-title.service';
import { InsurerCreateRequestDTO } from '../models/insurer.model';
import { PlanWithAgreement, WizardContactCreateDTO, WizardCreateDTO } from '../models/wizard.model';
import { WizardService } from '../services/wizard-service';

import { InsurerContactsStepComponent } from './insurer-contacts-step/insurer-contacts-step.component';
import { InsurerStepComponent } from './insurer-step/insurer-step.component';
import { PlansStepComponent } from './plans-step/plans-step.component';
import { SummaryStepComponent } from './summary-step/summary-step.component';


/**
 * @component CoverageStepperComponent
 *
 * Main component for the insurer creation flow.
 * Manages the data entry steps using a stepper (Insurer, Contacts, Plans, and Agreements).
 *
 * The forms for each step are rendered dynamically.
 */
@Component({
  selector: 'app-coverage-stepper',
  standalone: true,
  imports: [
    CommonModule,
    StepsModule,
    ButtonModule,
    GenericButtonComponent,
    InsurerStepComponent,
    PlansStepComponent,
    Step,
    StepList,
    Stepper,
    SummaryStepComponent,
    ConfirmationModalComponent,
    GenericAlertComponent
  ],
  templateUrl: './coverage-stepper.component.html',
  styleUrl: './coverage-stepper.component.css'
})
export class CoverageStepperComponent implements OnInit {

  @ViewChild('insurerStep') insurerStep!: InsurerStepComponent;
  @ViewChild('contactsStep') contactsStep!: InsurerContactsStepComponent;
  @ViewChild('plansStep') plansStep!: PlansStepComponent;

  showConfirmModal = false;
  showAlert = false;
  alertType: 'success' | 'error' | 'warning' | 'info' = 'info';
  alertTitle = '';
  alertText = '';

  /** Data to pass to the summary */
  insurerData: { insurer: InsurerCreateRequestDTO; contacts: WizardContactCreateDTO[] } | null = null;
  plansData: PlanWithAgreement[] = [];

  /** Array with the validity of each step */
  stepValidations = [false, false, true];

  /** Current step (only if you need to know it) */
  currentStep = 1;

  private breadcrumbService = inject(BreadcrumbService);
  private pageTitleService = inject(PageTitleService);
  private route = inject(ActivatedRoute);

  /**
   * Main constructor
   * @param wizardService Service responsible for persistence and communication between steps
   * @param router Service for navigation
   */
  constructor(private wizardService: WizardService,
              private router: Router) {}

  /**
   * Sets the page title when the component is initialized
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Nueva Cobertura');
    this.breadcrumbService.buildFromRoute(this.route);
  }

  /**
   * Redirects to the main coverage administration view.
   */
  onCancel(): void {
    this.router.navigate(['/care-management/coverage-administration']);
  }

  /**
   * Handles the final submission of the wizard (last step).
   * Validation/saving should be orchestrated here using `WizardService`.
   */
  onSubmit(): void {
    this.showConfirmModal = false;

    const insurerPayload = this.insurerStep.getPayload();
    if (!insurerPayload) {
      return;
    }

    const plans = this.plansStep.getPayload();

    const wizardPayload: WizardCreateDTO = {
      insurer: insurerPayload.insurer,
      plans: plans,
      contacts: insurerPayload.contacts
    };

    this.wizardService.createWizard(wizardPayload).subscribe({
      next: () => {
        this.openAlert('success', 'Datos guardados exitosamente!');
        this.router.navigate(['/care-management/coverage-administration']);
      },
      error: (err: HttpErrorResponse) => this.handleApiError(err)
    });
  }

  /** Advances to the next step of the wizard. */
  nextStep(): void {
    switch (this.currentStep) {
    case 1:
      this.insurerData = this.insurerStep.getPayload();
      break;
    case 2:
      this.plansData = this.plansStep.getPayload();
    }
    this.currentStep++;
  }

  /** Goes back to the previous step of the wizard. */
  previousStep(): void {
    this.currentStep--;
  }

  /**
   * Event on confirm.
   */
  openConfirmModal(): void {
    this.showConfirmModal = true;
  }

  /**
   * Event on cancel.
   */
  onCancelSave(): void {
    this.showConfirmModal = false;
  }

  /**
   * Shows an alert.
   */
  private openAlert(type: typeof this.alertType, text: string, title?: string) {
    this.alertType = type;
    this.alertText = text;
    this.alertTitle = title ?? '';
    this.showAlert = true;
    setTimeout(() => this.showAlert = false, 4000);
  }

  /**
   * Handles API errors and displays a formatted alert to the user.
   * @param err The HttpErrorResponse from the API call.
   * @private
   */
  private async handleApiError(err: HttpErrorResponse) {
    const { title, message } = await this.parseBackendError(err);
    this.openAlert('error', message, title ?? 'Error');
  }

  /**
   * parseBackendError.
   */
  private async parseBackendError(
    err: HttpErrorResponse
  ): Promise<{ title?: string; message: string }> {
    // No connection / CORS / server down
    if (err.status === 0) {
      return {
        title: 'No connection',
        message: 'Could not contact the server. Check your network and try again.'
      };
    }

    let body: any = err.error;

    // May come as Blob
    if (body instanceof Blob) {
      try {
        const text = await body.text();
        body = JSON.parse(text);
      } catch {
        return { message: err.statusText || 'Unexpected error.' };
      }
    }

    if (err.status === 409 || body?.error === 'CONFLICT') {
      const raw = typeof body === 'string' ? body : String(body?.message || '');
      return this.formatConflictError(raw);
    }

    // Plain text
    if (typeof body === 'string') {
      return { message: body };
    }

    if (body?.error && typeof body?.message === 'string') {
      const title = body.error === 'VALIDATION_ERROR' ? 'Invalid data' : String(body.error);
      return { title, message: this.prettifyFieldPaths(body.message) };
    }

    // RFC7807 (ProblemDetail): { title, detail, status, ... }
    if (body?.detail || body?.title) {
      return {
        title: body.title || 'Error',
        message: body.detail || body.title
      };
    }

    // { message } or { error, message }
    if (body?.message) {
      const msg = Array.isArray(body.message) ? body.message.join('\n') : body.message;
      const title = typeof body?.error === 'string' ? body.error : 'Error';
      return { title, message: msg };
    }

    // Validations: { errors: [...] } or { errors: { field: [msg] } }
    if (Array.isArray(body?.errors) && body.errors.length) {
      const lines = body.errors.map(
        (e: any) => e.defaultMessage || e.message || (e.field ? `${e.field}: ${e.error}` : `${e}`)
      );
      return { title: body.title || 'Invalid data', message: lines.join('\n') };
    }
    if (body?.errors && typeof body.errors === 'object') {
      const lines = Object.entries(body.errors).map(([k, v]: [string, any]) =>
        Array.isArray(v) ? `${k}: ${v.join(', ')}` : `${k}: ${v}`
      );
      return { title: body.title || 'Invalid data', message: lines.join('\n') };
    }

    // Fallback
    return { message: `Error ${err.status}: ${err.statusText || 'unexpected'}` };
  }

  /**
   * prettifyFieldPaths.
   */
  private prettifyFieldPaths(msg: string): string {
    // Common examples in your wizard
    msg = msg.replace(/plans\[(\d+)\]\.coverage\.validFromDate/gi, (_m, i) =>
      `Plan ${Number(i) + 1} · Coverage · Valid from`
    );
    // Add more replacements if your backend uses other paths
    return msg;
  }

  /**
   * formatConflictError.
   */
  private formatConflictError(raw: string): { title: string; message: string } {
    // Tries to extract field and value from H2/Postgres/MySQL/SQLServer/Oracle messages
    const title = 'Duplicate record';

    // 1) Field (H2): ... ON PUBLIC.INSURER(CODE NULLS FIRST) ...
    let field =
      /ON\s+\w+\.\w+\(([^)]+)\)/i.exec(raw)?.[1] // takes "CODE NULLS FIRST"
        ?.replace(/NULLS\s+FIRST|NULLS\s+LAST/gi, '')
        ?.split(/[ ,]/)[0]
        ?.trim();

    // Other vendors (MySQL): key 'table.COLUMN'  | Postgres: unique constraint "table_COLUMN_key"
    if (!field) field = /key\s+'[^']*\.([A-Z_]+)/i.exec(raw)?.[1];
    if (!field) field = /constraint\s+"[^"]*?([A-Z_]+)_?key?"/i.exec(raw)?.[1];

    // 2) Value (H2/MySQL): ... VALUES ( /* 6 */ 'asd' )  | Duplicate entry 'asd'
    let value =
      /VALUES\s*\(.*'([^']+)'/is.exec(raw)?.[1] ||
      /Duplicate entry\s+'([^']+)'/i.exec(raw)?.[1];

    const friendlyField = this.humanizeDbField(field);

    if (friendlyField && value) {
      return {
        title,
        message: `${friendlyField} "${value}" is already in use. Choose another value or edit the existing one.`
      };
    }
    if (friendlyField) {
      return {
        title,
        message: `${friendlyField} is already in use. Check that it is not duplicated.`
      };
    }
    return {
      title,
      message: 'A record with the same data already exists. Check that it is not duplicated.'
    };
  }

  /**
   * humanizeDbField.
   */
  private humanizeDbField(field?: string | null): string | null {
    if (!field) return null;
    const f = field.toUpperCase();
    switch (f) {
    case 'CODE': return 'Código';
    case 'NAME': return 'Nombre';
    case 'ACRONYM': return 'Sigla';
    default:
      // Capital Case and replace underscores
      return f
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/^\w|\s\w/g, (m) => m.toUpperCase());
    }
  }


}
