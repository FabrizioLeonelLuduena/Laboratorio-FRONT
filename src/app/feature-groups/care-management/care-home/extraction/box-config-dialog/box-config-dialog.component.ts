import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutoCompleteModule } from 'primeng/autocomplete';
import { Subject, takeUntil } from 'rxjs';
import { InternalUser } from 'src/app/feature-groups/user-management/models/InternalUser';
import { UserService } from 'src/app/feature-groups/user-management/services/user.service';

import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { AttentionResponse } from '../../../models/attention.models';
import { ExtractorBox } from '../../../models/extractor-box';
import { AttentionService } from '../../../services/attention.service';


/**
 * Dialog for configuring the current user's box/extractor
 */
@Component({
  selector: 'app-box-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutoCompleteModule,
    GenericButtonComponent,
    GenericAlertComponent
  ],
  templateUrl: './box-config-dialog.component.html',
  styleUrl: './box-config-dialog.component.css'
})
export class BoxConfigDialogComponent implements OnInit {
  @Input() extractors: ExtractorBox[] = [];
  @Input() inExtractions: AttentionResponse[] = [];
  @Output() result = new EventEmitter<any>();

  userService = inject(UserService);
  private attentionService = inject(AttentionService);

  private readonly EXTRACTOR_ROLES = ['BIOQUIMICO', 'TECNICO_LABORATORIO']; // LABORATORY TECHNICIAN, BIOCHEMIST

  users: InternalUser[] = [];
  filteredUsers: InternalUser[] = [];
  selectedBox: ExtractorBox | null = null;
  selectedUser: InternalUser | null = null;
  // Flag indicating selected extractor has an ongoing attention
  selectedExtractorBusy = false;

  private destroy$ = new Subject<void>();

  alert = signal<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  /**
   * Initializes the component
   */
  ngOnInit(): void {
    this.userService.getAllUsers().subscribe({
      next: (allUsers) => {
        this.users = allUsers.filter(user =>
          user.isActive &&
          user.roles.some(role => this.EXTRACTOR_ROLES.includes(role.description))
        );
      }
    });
  }


  /**
   * Filters users for autocomplete
   */
  filterUsers(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredUsers = this.users.filter(user =>
      user.username.toLowerCase().includes(query) ||
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query)
    );
  }

  /**
   * Selects an extractor and updates busy flag
   */
  selectExtractor(extractor: ExtractorBox): void {
    this.selectedBox = extractor;
    this.selectedExtractorBusy = this.isExtractorBusy(extractor.id);
    // Clear user selection if busy to prevent accidental confirmation
    if (this.selectedExtractorBusy) {
      this.selectedUser = null;
    }
  }

  /**
   * Checks if an extractor has an attention in IN_EXTRACTION state
   */
  isExtractorBusy(extractorId: number): boolean {
    return this.inExtractions.some(att =>
      att.attentionBox === extractorId && att.attentionState === 'IN_EXTRACTION'
    );
  }

  /**
   * Confirms the configuration
   */
  confirm(): void {
    if (!this.selectedBox || !this.selectedUser) {
      return;
    }

    // Revalidate state in backend and wait for response
    this.attentionService.getInExtraction()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.inExtractions = list;
          const busy = this.selectedBox ? this.isExtractorBusy(this.selectedBox.id) : false;
          if (busy) {
            this.setAlert('warning','No se puede reasignar este box: hay una atención en curso.');
            return;
          }

          this.result.emit({
            extractor: this.selectedBox,
            user: this.selectedUser
          });
        },
        error: () => {
          this.setAlert('error', 'Error al validar estado del box. Intente nuevamente.');
        }
      });
  }

  /**
   * Clears the selected box (unassigns the user)
   */
  clearBox(): void {
    if (!this.selectedBox) {
      return;
    }

    // Revalidate state in backend and wait for response
    this.attentionService.getInExtraction()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.inExtractions = list;
          const busy = this.selectedBox ? this.isExtractorBusy(this.selectedBox.id) : false;
          if (busy) {
            this.setAlert('warning', 'No se puede limpiar este box: hay una atención en curso.');
            return;
          }

          this.result.emit({
            extractor: this.selectedBox,
            user: null,
            clear: true
          });
        },
        error: () => {
          this.setAlert('error', 'Error al validar estado del box. Intente nuevamente.');
        }
      });
  }

  /**
   * Cancels and closes the dialog
   */
  cancel(): void {
    this.result.emit(null);
  }

  /** Helper to set alert */
  private setAlert(
    type: 'success' | 'error' | 'warning' | null,
    text: string | null = null
  ): void {
    this.alert.set(type ? { type, text: text ?? '' } : null);
  }
}
