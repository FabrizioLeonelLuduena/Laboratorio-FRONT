import { CommonModule } from '@angular/common';
import { Component, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CollapsableFormComponent, CollapsableFormField } from '../../../../shared/components/collapsable-form/collapsable-form.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { ContactTypeResponseDTO } from '../../models/contact-info.model';
import { WizardContactCreateDTO } from '../../models/wizard.model';
import { ContactInfoService } from '../../services/contact-info.service';

/**
 * Type for contact payload
 */
type ContactPayload = { contact: string; contactType: string };

/**
 * @component InsurerContactsStepComponent
 *
 * Second step of the stepper: allows managing multiple contacts associated with an insurer.
 * Each contact is entered using a collapsible form, reusing the generic `app-collapsable-form` component.
 */
@Component({
  selector: 'app-insurer-contacts-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CollapsableFormComponent,
    GenericButtonComponent
  ],
  templateUrl: './insurer-contacts-step.component.html',
  styleUrls: ['./insurer-contacts-step.component.css']
})
export class InsurerContactsStepComponent implements OnInit {
  /** Reactive list of contact forms */
  contactForms = signal<number[]>([]);

  /** Contact type options loaded from backend */
  contactTypeOptions: ContactTypeResponseDTO[] = [];

  /** Emits whether the step is valid or not */
  @Output() validChange = new EventEmitter<boolean>();

  /** Maximum allowed number of forms */
  readonly MAX_CONTACTS = 5;

  private contacts = new Map<number, ContactPayload>();

  /**
   * Constructor
   */
  constructor(
    private contactInfoService: ContactInfoService
  ) {}

  /**
   * Lifecycle: on component initialization, loads contact types from backend.
   */
  ngOnInit(): void {
    this.loadContactTypes();
    this.addContactForm(); // starts with one by default
  }

  /**
   * Calls backend to get available contact types.
   * The response is mapped to the format expected by the dropdown.
   */
  private loadContactTypes(): void {
    this.contactInfoService.getTypes().subscribe({
      next: (data) => {
        this.contactTypeOptions = data;},
      error: () => {
        //todo call generic alert
      }
    });
  }

  /**
   * Adds a new contact form if the maximum allowed is not reached.
   */
  addContactForm(): void {
    if (this.contactForms().length < this.MAX_CONTACTS) {
      this.contactForms.update((list) => [...list, Date.now()]);
    }
  }

  /**
   * Removes a contact form.
   * @param id Temporary identifier of the form (timestamp)
   */
  removeContactForm(id: number): void {
    this.contactForms.update((list) => list.filter((f) => f !== id));
    this.contacts.delete(id);
    this.updateValidity();
  }

  /**
   * Handles saving of an individual form.
   * @param formData Data emitted from the collapsible form.
   */
  saveContact(): void {
    //todo add validations according to type
    this.updateValidity();
  }

  /**
   * Updates the validity of the step.
   * The step is considered valid if there is at least one saved contact.
   */
  private updateValidity(): void {
    const hasContacts = this.contactForms().length > 0;
    this.validChange.emit(hasContacts);
  }

  /**
   * Returns the dynamic field configuration for the form.
   * Generated dynamically so each form receives updated options.
   */
  getContactFields(): CollapsableFormField[] {
    return [
      {
        name: 'contact',
        label: 'Contacto',
        type: 'text',
        required: true,
        placeholder: 'Ingrese el contacto',
        showInSummary: true
      },
      {
        name: 'contactType',
        label: 'Tipo de contacto',
        type: 'select',
        required: true,
        options: this.contactTypeOptions.map(ct => ({
          label: ct.description,
          value: ct.name
        })),
        showInSummary: true
      }
    ];
  }

  /**
   * Returns the list of contacts ready to send to backend.
   * Maps each ContactPayload to a WizardContactCreateDTO.
   */
  public getPayload(): WizardContactCreateDTO[] {
    return Array.from(this.contacts.values()).map((c) => ({
      contactType: c.contactType,
      contact: c.contact
    }));
  }
}
