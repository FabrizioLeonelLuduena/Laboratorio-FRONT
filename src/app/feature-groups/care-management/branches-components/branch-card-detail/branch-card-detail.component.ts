import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { GenericBadgeComponent } from 'src/app/shared/components/generic-badge/generic-badge.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';

import { BranchDetailResponseDTO, ContactDTO, ScheduleDTO } from '../../models/branches';
import { BranchService } from '../../services/branch.service';

/**
 * Component for displaying the details of a branch.
 */
@Component({
  selector: 'app-branch-card-detail',
  imports: [
    CommonModule,
    CardModule,
    DividerModule,
    TagModule,
    ButtonModule,
    TooltipModule,
    AccordionModule,
    SpinnerComponent,
    GenericBadgeComponent
  ],
  templateUrl: './branch-card-detail.component.html',
  styleUrls: ['./branch-card-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class BranchCardDetailComponent implements OnInit {
  /** The branch details. */
  branch: BranchDetailResponseDTO | null = null;
  /** Whether the component is loading data. */
  loading: boolean = true;
  /** The error message, if any. */
  error: string | null = null;

  /** The phone contact. */
  phoneContact: ContactDTO | undefined;
  /** The email contact. */
  emailContact: ContactDTO | undefined;
  /** The WhatsApp contact. */
  whatsappContact: ContactDTO | undefined;

  /** A map of schedule types to their labels. */
  readonly scheduleTypeLabel: Record<string, string> = {
    ATTENTION: 'Atención',
    EXTRACTION: 'Extracción',
    REGULAR: 'Regular',
    URGENCIES: 'Urgencias'
  };

  /** A map of day names to their translations. */
  private readonly dayTranslations: Record<string, string> = {
    MONDAY: 'Lunes',
    TUESDAY: 'Martes',
    WEDNESDAY: 'Miércoles',
    THURSDAY: 'Jueves',
    FRIDAY: 'Viernes',
    SATURDAY: 'Sábado',
    SUNDAY: 'Domingo'
  };

  /**
   * Dependencies injection.
   * @param branchService The branch service.
   * @param route The activated route.
   * @param router The router.
   * @param cdr The change detector reference.
   * @param breadcrumbService The breadcrumb service.
   */
  constructor(
    private branchService: BranchService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private breadcrumbService: BreadcrumbService
  ) {}

  /**
   * Initializes the component.
   */
  ngOnInit(): void {
    this.breadcrumbService.setItems([
      { label: 'Gestión interna', routerLink: '/care-management' },
      { label: 'Sucursales', routerLink: '/care-management/branches' },
      { label: 'Detalle de sucursal' }
    ]);

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBranch(Number(id));
    } else {
      this.error = 'ID de sucursal no válido';
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Loads the branch details.
   * @param id The ID of the branch.
   */
  private loadBranch(id: number): void {
    this.loading = true;
    this.error = null;
    this.branchService.getBranchDetailById(id).subscribe({
      next: (branch) => {
        this.branch = branch;
        this.breadcrumbService.setFromString('Gestión interna > Sucursales > Detalle', '/care-management/branches');
        this.extractContacts();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Error al cargar los datos de la sucursal';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Extracts the contacts from the branch details.
   */
  private extractContacts(): void {
    if (!this.branch?.contacts) return;
    this.phoneContact = this.branch.contacts.find(c => c.contactType === 'PHONE');
    this.emailContact = this.branch.contacts.find(c => c.contactType === 'EMAIL');
    this.whatsappContact = this.branch.contacts.find(c => c.contactType === 'WHATSAPP');
  }

  /**
   * Gets the severity of the status tag.
   * @param status The status of the branch.
   * @returns The severity of the tag.
   */
  getBadgeStatus(status: string): 'activo' | 'inactivo' | 'pendiente' {
    if (!status) {
      return 'inactivo';
    }
    const lowerCaseStatus = status.toLowerCase();
    if (lowerCaseStatus === 'active' || lowerCaseStatus === 'activo') {
      return 'activo';
    }
    if (lowerCaseStatus === 'inactive' || lowerCaseStatus === 'inactivo') {
      return 'inactivo';
    }
    if (lowerCaseStatus === 'maintenance' || lowerCaseStatus === 'mantenimiento') {
      return 'pendiente';
    }
    return 'inactivo';
  }

  /**
   * Gets the Google Maps URL for the branch.
   * @returns The Google Maps URL.
   */
  getGoogleMapsUrl(): string {
    const baseUrl = 'https://www.google.com/maps/search/?api=1&query=';
    if (this.branch?.fullAddress) {
      return `${baseUrl}${encodeURIComponent(this.branch.fullAddress + ', Argentina')}`;
    }
    return baseUrl;
  }

  /**
   * Formats a schedule for display.
   * @param schedule The schedule to format.
   * @returns The formatted schedule.
   */
  formatSchedule(schedule: ScheduleDTO): string {
    const dayFrom = this.dayTranslations[schedule.dayFrom.toUpperCase()] || schedule.dayFrom;
    const dayTo = this.dayTranslations[schedule.dayTo.toUpperCase()] || schedule.dayTo;
    return `${dayFrom} a ${dayTo} de ${schedule.scheduleFromTime} a ${schedule.scheduleToTime}`;
  }

  /**
   * Gets the icon for a contact type.
   * @param contactType The type of contact.
   * @returns The icon class.
   */
  getContactIcon(contactType: string): string {
    switch (contactType) {
    case 'PHONE': return 'pi pi-phone';
    case 'EMAIL': return 'pi pi-envelope';
    case 'WHATSAPP': return 'pi pi-whatsapp';
    default: return 'pi pi-info-circle';
    }
  }

  /**
   * Navigates to the edit page for the branch.
   */
  goToEdit(): void {
    if (this.branch) {
      this.router.navigate(['/care-management/update-branch', this.branch.id]);
    }
  }

  /**
   * Navigates back to the branches list.
   */
  goBack(): void {
    this.router.navigate(['/care-management/branches']);
  }
}
