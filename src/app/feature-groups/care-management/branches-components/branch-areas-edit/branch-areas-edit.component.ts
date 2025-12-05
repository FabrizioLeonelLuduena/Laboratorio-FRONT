import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { forkJoin } from 'rxjs';

import { GenericAlertComponent } from '../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../shared/components/generic-button/generic-button.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { AddressRequest } from '../../models/address';
import { AreaRequest, AreaResponse } from '../../models/area.models';
import { BranchUpdateRequest } from '../../models/branch-request';
import { ContactRequest } from '../../models/contact';
import { ScheduleRequest } from '../../models/schedule';
import { AreaService } from '../../services/area.service';
import { BranchService } from '../../services/branch.service';
import { AreaSectionManagerComponent, AreaSectionOutput, Workspace } from '../area-section-manager/area-section-manager.component';

/**
 * Component for editing the areas and sections associated with a branch.
 */
@Component({
  selector: 'app-branch-areas-edit',
  standalone: true,
  imports: [CommonModule, GenericAlertComponent, GenericButtonComponent, SpinnerComponent, AreaSectionManagerComponent],
  templateUrl: './branch-areas-edit.component.html',
  styleUrl: './branch-areas-edit.component.css'
})
export class BranchAreasEditComponent implements OnInit {
  branchId!: number;
  branchCode = '';
  loading = true;

  // Manager inputs
  initialWorkspaces: Workspace[] = [];
  currentSelection: AreaSectionOutput | null = null;

  // UI state
  alert: { type: 'success' | 'error' | 'warning'; text: string } | null = null;
  saving = false;

  /**
   * Dependencies injection.
   * @param route The activated route.
   * @param router The router.
   * @param branchService The branch service.
   * @param workspacesService The workspaces service.
   * @param breadcrumbService The breadcrumb service.
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private branchService: BranchService,
    private areaService: AreaService,
    private breadcrumbService: BreadcrumbService
  ) {}

  /**
   * Initializes the component.
   */
  ngOnInit(): void {
    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Sucursales', routerLink: '/care-management/branches' },
      { label: 'Editar áreas' }
    ]);

    this.branchId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.branchId) {
      this.showAlert('error', 'Identificador de sucursal inválido.');
      this.loading = false;
      return;
    }
    // Load branch areas from details endpoint (includes areas list)
    this.branchService.getBranchDetailById(this.branchId).subscribe({
      next: (res) => {
        this.branchCode = res.code;
        const workspaces: Workspace[] = (res.areas || []).map((area) => ({
          areaId: area.id,
          areaName: area.name,
          sectionIds: (area.sections || []).map((s) => s.id)
        }));
        this.initialWorkspaces = workspaces;
        this.loading = false;
      },
      error: () => {
        this.showAlert('error', 'No se pudieron cargar las áreas de la sucursal.');
        this.loading = false;
      }
    });
  }

  /**
   * Handles blocked actions from the area section manager.
   * @param message The message to display.
   */
  onBlockedAction(message: string) {
    this.showAlert('warning', message);
  }

  /**
   * Navigates back to the branches list.
   */
  onCancel() {
    this.router.navigate(['/care-management/branches']);
  }

  /**
   * Handles the selection change event from the area section manager.
   * @param data The data emitted from the manager component.
   */
  onSelectionChange(data: AreaSectionOutput) {
    this.currentSelection = data;
  }

  /**
   * Saves the changes to the branch's areas and sections.
   * @param data The data from the area section manager.
   */
  onSave(data?: AreaSectionOutput) {
    const output = data ?? this.currentSelection;
    if (!output) { this.showAlert('warning', 'No hay cambios para guardar.'); return; }

    const selected = output.workspaces || [];
    const hasAnySection = selected.some((w) => (w.sectionIds?.length || 0) > 0);
    const initialIds = new Set((this.initialWorkspaces || []).map(w => w.areaId));
    const currentIds = new Set(selected.map(w => w.areaId));
    const hasRemovals = Array.from(initialIds).some(id => !currentIds.has(id));
    if (!hasAnySection && !hasRemovals) {
      this.showAlert('warning', 'Seleccioná al menos una sección o eliminá alguna área.');
      return;
    }

    const currentNewAreas: AreaRequest[] = output.newAreas || [];
    const proceed = (newWorkspaces: { areaId: number; sectionIds: number[] }[]) => {
      // Build full update payload reusing existing branch details
      this.saving = true;
      this.branchService.getByIdDetail(this.branchId).subscribe({
        next: (current) => {
          const address: AddressRequest | undefined = current.address
            ? {
              streetName: current.address.streetName,
              streetNumber: String(current.address.streetNumber),
              neighborhoodId: Number(current.address.neighborhoodId),
              postalCode: current.address.postalCode,
              latitude: current.address.latitude ?? null,
              longitude: current.address.longitude ?? null
            }
            : undefined;

          const contacts: ContactRequest[] = (current.contacts || []).map(c => ({
            contactType: c.contactType,
            contact: c.contact
          }));

          const schedules: ScheduleRequest[] = (current.schedules || []).map(s => ({
            dayFrom: s.dayFrom,
            dayTo: s.dayTo,
            scheduleFromTime: s.scheduleFromTime,
            scheduleToTime: s.scheduleToTime,
            scheduleType: s.scheduleType
          }));

          // Merge selection + new areas + removals
          const workspaceMap = new Map<number, number[]>();
          for (const w of selected) {
            if (!w) continue;
            workspaceMap.set(w.areaId, [...(w.sectionIds || [])]);
          }
          for (const w of newWorkspaces || []) {
            workspaceMap.set(w.areaId, [...(w.sectionIds || [])]);
          }
          for (const w of this.initialWorkspaces || []) {
            if (!workspaceMap.has(w.areaId)) workspaceMap.set(w.areaId, []);
          }
          const workspaces = Array.from(workspaceMap.entries()).map(([areaId, sectionIds]) => ({ areaId, sectionIds }));

          const payload: BranchUpdateRequest = {
            description: current.description,
            schedules,
            responsible: { name: current.responsible?.name || '', userId: current.responsible?.id ?? 0 },
            address: address!,
            contacts,
            status: current.status,
            workspaces,
            boxCount: current.boxCount ?? 0,
            registerCount: current.registerCount ?? 0,
            assistantDesk: current.assistantDesk ?? 0
          };

          this.branchService.updateBranch(this.branchId, payload).subscribe({
            next: () => {
              this.saving = false;
              this.router.navigate(['/care-management/branches']);
            },
            error: () => {
              this.saving = false;
              this.showAlert('error', 'No se pudieron actualizar las áreas.');
            }
          });
        },
        error: () => {
          this.saving = false;
          this.showAlert('error', 'No se pudieron cargar los datos actuales de la sucursal.');
        }
      });
    };

    if ((currentNewAreas || []).length > 0) {
      const calls = currentNewAreas.map(a => this.areaService.postArea(a));
      forkJoin(calls).subscribe({
        next: (createdAreas: AreaResponse[]) => {
          const newWorkspaces = (createdAreas || []).map(ar => ({
            areaId: ar.id,
            sectionIds: (ar.sections || []).map(s => s.id)
          }));
          proceed(newWorkspaces);
        },
        error: () => proceed([])
      });
    } else {
      proceed([]);
    }
  }

  /**
   * Displays an alert.
   * @param type The type of alert.
   * @param text The text to display.
   */
  private showAlert(type: 'success' | 'error' | 'warning', text: string) {
    this.alert = { type, text };
    setTimeout(() => (this.alert = null), type === 'error' ? 7000 : 3000);
  }
}
