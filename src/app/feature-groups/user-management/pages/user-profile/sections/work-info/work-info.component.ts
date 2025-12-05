import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';

import { Branch } from 'src/app/feature-groups/care-management/models/branch';
import { Schedule } from 'src/app/feature-groups/care-management/models/schedule';
import { BranchService } from 'src/app/feature-groups/care-management/services/branch.service';
import { UserResponse } from 'src/app/feature-groups/user-management/models/login-model';

/**
 * WorkInfoComponent
 * Displays work-related information for laboratory employees.
 * Shows roles, branch assignment, and other job-related details.
 */
@Component({
  selector: 'app-work-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './work-info.component.html',
  styleUrls: ['./work-info.component.css']
})
export class WorkInfoComponent implements OnInit {
  @Input({ required: true }) user!: UserResponse;

  private readonly branchService = inject(BranchService);
  private readonly BRANCH_ID_KEY = 'branch_id';

  protected branchInfo = signal<Branch | null>(null);
  protected isLoadingBranch = signal<boolean>(false);
  protected branchError = signal<string | null>(null);

  /**
   * Initializes component and loads branch information
   */
  ngOnInit(): void {
    const branchId = this.resolveBranchId();
    if (branchId) {
      this.loadBranchInfo(branchId);
    } else {
      this.branchError.set('No se encontró una sucursal asignada para tu usuario.');
    }
  }

  /**
   * Loads branch information from the backend using the branch ID.
   */
  private loadBranchInfo(branchId: number): void {
    this.isLoadingBranch.set(true);
    this.branchError.set(null);

    this.branchService.getBranchById(branchId).subscribe({
      next: (branch) => {
        this.branchInfo.set(branch);
        this.isLoadingBranch.set(false);
      },
      error: () => {
        this.branchError.set('No se pudo cargar la información de la sucursal.');
        this.isLoadingBranch.set(false);
      }
    });
  }

  /**
   * Resolves the branch ID from the user payload or stored selection.
   */
  private resolveBranchId(): number | null {
    // First, try to get from user object
    if (typeof this.user.branchId === 'number') return this.user.branchId;

    // Fallback: check alternative field name
    const branchField = (this.user as any)?.branch;
    if (typeof branchField === 'number') return branchField;

    // Last resort: read from localStorage
    const stored = localStorage.getItem(this.BRANCH_ID_KEY);
    if (!stored) return null;

    const parsed = Number(stored);
    return Number.isNaN(parsed) ? null : parsed;
  }

  /**
   * Gets role names as a comma-separated string
   */
  protected getRoleNames(): string {
    if (!this.user.roles || !this.user.roles.length) return '';
    return this.user.roles
      .map(role => this.formatRole(role))
      .filter(name => !!name)
      .join(', ');
  }

  /**
   * Formats role name for display (removes ROLE_ prefix)
   */
  protected formatRole(role: { name?: string | null; description?: string | null } | string | null | undefined): string {
    const raw = typeof role === 'string'
      ? role
      : role?.name ?? role?.description ?? '';

    if (!raw) return 'Rol sin nombre';

    return raw.replace('ROLE_', '').replace(/_/g, ' ');
  }

  /**
   * Formats a schedule entry for display.
   */
  protected formatSchedule(schedule: Schedule): string {
    const dayRange = schedule.dayFrom === schedule.dayTo
      ? schedule.dayFrom
      : `${schedule.dayFrom} - ${schedule.dayTo}`;
    return `${dayRange}: ${schedule.scheduleFromTime} a ${schedule.scheduleToTime}`;
  }
}
