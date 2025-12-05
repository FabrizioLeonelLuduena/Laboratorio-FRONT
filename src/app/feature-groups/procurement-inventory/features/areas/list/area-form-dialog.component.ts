import { Component, OnInit } from '@angular/core';

import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { GenericFormComponent, GenericFormField } from 'src/app/shared/components/generic-form/generic-form.component';

/**
 * Area form dialog component
 */
@Component({
  selector: 'app-area-form-dialog',
  standalone: true,
  imports: [
    GenericFormComponent
  ],
  template: `
    <app-generic-form
      [fields]="fields"
      [initialValue]="initialValue"
      [title]="title"
      [saving]="saving"
      (submitForm)="onSubmit($event)"
      (cancelForm)="onCancel()">
    </app-generic-form>
  `
})
export class AreaFormDialogComponent implements OnInit {
  fields: GenericFormField[] = [];
  initialValue: Record<string, any> | null = null;
  title = 'Formulario';
  saving = false;

  /**
   * Constructor
   * @param ref - Dynamic dialog reference
   * @param config - Dynamic dialog configuration
   */
  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {}

  /**
   * Initialize component
   * @returns void
   */
  ngOnInit(): void {
    const data = this.config.data;
    if (data) {
      this.fields = data.fields || [];
      this.initialValue = data.initialValue || null;
      this.title = data.title || 'Formulario';
      this.saving = data.saving || false;
    }
  }

  /**
   * Handle form submission
   * @param formData - Form data
   * @returns void
   */
  onSubmit(formData: any): void {
    this.ref.close(formData);
  }

  /**
   * Handle form cancellation
   * @returns void
   */
  onCancel(): void {
    this.ref.close();
  }
}
