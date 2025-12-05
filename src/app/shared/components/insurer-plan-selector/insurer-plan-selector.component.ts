import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, Output, EventEmitter, inject, DestroyRef, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AutoCompleteModule } from 'primeng/autocomplete';

import { Insurer } from '../../../feature-groups/coverage-administration/models/insurer.model';
import { Plan } from '../../../feature-groups/coverage-administration/models/plan.model';
import { InsurerService } from '../../../feature-groups/coverage-administration/services/insurer.service';



/**
 * Component for selecting an insurer and its plan.
 * All user-facing labels and texts remain in Spanish.
 * Internal comments and documentation are in English.
 */
@Component({
  selector: 'app-insurer-plan-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AutoCompleteModule
  ],
  templateUrl: './insurer-plan-selector.component.html',
  styleUrls: ['./insurer-plan-selector.component.css']
})
export class InsurerPlanSelectorComponent implements OnInit, OnChanges {
  /** Valid fields for Insurer and Plan */
  private static readonly INSURER_KEYS = ['code', 'acronym', 'name', 'insurer_type_name'] as const satisfies readonly (keyof Insurer)[];
  private static readonly PLAN_KEYS = ['code', 'acronym', 'name'] as const satisfies readonly (keyof Plan)[];

  @Input() filtrosBusqueda: string[] = ['code', 'acronym', 'name', 'insurer_type_name'];
  @Input() planId: number | null = null;
  /** Controls whether the loading banner should be shown while fetching data */
  @Input() showLoadingBanner: boolean = true;

  @Output() planSelected = new EventEmitter<Plan | undefined>();
  @Output() insurerSelected = new EventEmitter<Insurer | undefined>();

  insurerControl = new FormControl<(Insurer & { display?: string }) | null>(null);
  planControl = new FormControl<(Plan & { display?: string }) | null>(null);

  allInsurers: Insurer[] = [];
  filteredInsurers: (Insurer & { display?: string })[] = [];
  filteredPlans: (Plan & { display?: string })[] = [];

  loading = false;

  /** DI moderna y cleanup */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly insurerService = inject(InsurerService);
  private readonly cdr = inject(ChangeDetectorRef);

  private dataLoaded = false;

  /** Detect changes in input planId to load initial plan. */
  ngOnChanges(changes: SimpleChanges): void {
    // Si dataLoaded es true, cargar inmediatamente
    if (changes['planId'] && this.dataLoaded && this.planId) {
      this.setPlanById(this.planId);
    }
    // Si dataLoaded es false, el ngOnInit se encargará de cargarlo cuando los datos estén listos
  }

  /** Initializes data loading and combo synchronization subscribers. */
  ngOnInit(): void {
    this.loading = true;
    this.insurerService.getAllInsurersComplete()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.allInsurers = data ?? [];
          // Sugerencias iniciales
          this.filteredInsurers = this.allInsurers.slice(0, 5).map((i) => ({ ...i, display: this.formatInsurerDisplay(i) }));
          this.updateFilteredPlans();
          this.dataLoaded = true;

          // Si hay un planId inicial o actual, cargarlo
          if (this.planId) {
            // Usar setTimeout para asegurar que el change detection se complete
            setTimeout(() => {
              this.setPlanById(this.planId!);
            }, 0);
          }
        },
        error: () => {
          this.allInsurers = [];
          this.filteredInsurers = [];
          this.filteredPlans = [];
        },
        complete: () => (this.loading = false)
      });

    // Cambios de aseguradora
    this.insurerControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selectedInsurer) => {
        if (selectedInsurer) {
          // Resetear el plan solo si el plan actual no pertenece a la aseguradora seleccionada
          const currentPlan = this.planControl.value;
          const currentPlanInsurerId = currentPlan ? ((currentPlan as any).insurer_id ?? (currentPlan as any).insurerId) : null;
          if (!currentPlan || currentPlanInsurerId !== selectedInsurer.id) {
            this.planControl.reset();
          }
          this.updateFilteredPlans(selectedInsurer);
          // Emitir aseguradora limpia (sin 'display')
          const { display: _display, ...pure } = selectedInsurer;
          this.insurerSelected.emit(pure as Insurer);
        } else {
          this.updateFilteredPlans();
          this.insurerSelected.emit(undefined);
        }
      });

    // Cambios de plan
    this.planControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selectedPlan) => {
        if (selectedPlan) {
          // Normalizar insurer_id (puede venir como insurer_id o insurerId)
          const insurerId = (selectedPlan as any).insurer_id ?? (selectedPlan as any).insurerId;

          // Sincronizar aseguradora sin disparar su valueChanges
          const correspondingInsurer = this.allInsurers.find((ins) => ins.id === insurerId);
          if (correspondingInsurer) {
            const currentInsId = this.insurerControl.value?.id;
            if (currentInsId !== correspondingInsurer.id) {
              const enrichedInsurer = { ...correspondingInsurer, display: this.formatInsurerDisplay(correspondingInsurer) };
              this.insurerControl.setValue(enrichedInsurer, { emitEvent: false });
              // Emitimos manualmente el cambio para el padre
              this.insurerSelected.emit(correspondingInsurer);
            }
          }
          // Remove display property and enrich with insurer data
          const { display: _display, ...pure } = selectedPlan;
          const enrichedPlan = {
            ...pure,
            insurer_code: correspondingInsurer?.code,
            insurer_name: correspondingInsurer?.name,
            insurer_type: (correspondingInsurer as any)?.insurer_type
          } as Plan;
          this.planSelected.emit(enrichedPlan);
        } else {
          this.planSelected.emit(undefined);
        }
      });
  }

  /** Muestra sugerencias iniciales de aseguradoras al enfocar el campo. */
  showInitialInsurers(): void {
    this.filteredInsurers = this.allInsurers.slice(0, 5).map((i) => ({ ...i, display: this.formatInsurerDisplay(i) }));
  }

  /** Construye la etiqueta visible para una aseguradora según los filtros activos. */
  formatInsurerDisplay(insurer: Insurer | null): string {
    if (!insurer) return '';
    const parts: string[] = [];
    if (this.filtrosBusqueda.includes('code')) parts.push(`[${insurer.code}]`);
    if (this.filtrosBusqueda.includes('acronym')) parts.push(insurer.acronym);
    if (this.filtrosBusqueda.includes('name')) parts.push(`${insurer.name}`);
    if (this.filtrosBusqueda.includes('insurer_type_name')) parts.push(`(${insurer.insurer_type_name})`);
    return parts.join(' – ');
  }

  /** Construye la etiqueta visible para un plan según los filtros activos. */
  formatPlanDisplay(plan: Plan | null): string {
    if (!plan) return '';
    const parts: string[] = [];
    if (this.filtrosBusqueda.includes('code')) parts.push(`[${plan.code}]`);
    if (this.filtrosBusqueda.includes('acronym') && plan.acronym) parts.push(plan.acronym);
    if (this.filtrosBusqueda.includes('name')) parts.push(`${plan.name}`);
    return parts.join(' – ');
  }

  /** Filtra aseguradoras por los campos configurados y la consulta del usuario. */
  filterInsurers(event: { originalEvent: Event; query: string }): void {
    const query = (event?.query ?? '').toLowerCase();
    if (!query) {
      this.showInitialInsurers();
      return;
    }
    const allowedKeys = InsurerPlanSelectorComponent.INSURER_KEYS.filter((k) => this.filtrosBusqueda.includes(k as string));
    const result = this.allInsurers.filter((insurer) =>
      allowedKeys.some((k) => {
        const value = insurer[k];
        return value && String(value).toLowerCase().includes(query);
      })
    );
    this.filteredInsurers = result.map((i) => ({ ...i, display: this.formatInsurerDisplay(i) }));
  }

  /** Actualiza el listado de planes sugeridos en función de la aseguradora seleccionada (si hay). */
  updateFilteredPlans(selectedInsurer?: Insurer): void {
    if (selectedInsurer) {
      this.filteredPlans = (selectedInsurer.plans ?? []).slice(0, 5).map((p) => ({ ...p, display: this.formatPlanDisplay(p) }));
    } else {
      const allPlans = this.allInsurers.flatMap((ins) => ins.plans ?? []);
      this.filteredPlans = allPlans.slice(0, 5).map((p) => ({ ...p, display: this.formatPlanDisplay(p) }));
    }
  }

  /** Filtra planes por los campos configurados y la consulta del usuario. */
  filterPlans(event: { originalEvent: Event; query: string }): void {
    const query = (event?.query ?? '').toLowerCase();

    const pool: Plan[] = this.insurerControl.value
      ? (this.insurerControl.value.plans ?? [])
      : this.allInsurers.flatMap((ins) => ins.plans ?? []);

    if (!query) {
      this.filteredPlans = pool.slice(0, 5).map((p) => ({ ...p, display: this.formatPlanDisplay(p) }));
      return;
    }

    const allowedKeys = InsurerPlanSelectorComponent.PLAN_KEYS.filter((k) => this.filtrosBusqueda.includes(k as string));
    const result = pool.filter((plan) =>
      allowedKeys.some((k) => {
        const value = plan[k];
        return value && String(value).toLowerCase().includes(query);
      })
    );
    this.filteredPlans = result.map((p) => ({ ...p, display: this.formatPlanDisplay(p) }));
  }

  /** Selecciona un plan por ID y sincroniza automáticamente la aseguradora correspondiente. */
  setPlanById(id: number): void {
    if (!id || !this.allInsurers || this.allInsurers.length === 0) {
      return;
    }

    const plan = this.allInsurers.flatMap((i) => i.plans ?? []).find((p) => p.id === id) ?? null;

    if (plan) {
      const enrichedPlan = { ...plan, display: this.formatPlanDisplay(plan) };

      // Normalizar insurer_id (puede venir como insurer_id o insurerId)
      const insurerId = (plan as any).insurer_id ?? (plan as any).insurerId;

      const correspondingInsurer = this.allInsurers.find((ins) => ins.id === insurerId);

      if (correspondingInsurer) {
        const enrichedInsurer = { ...correspondingInsurer, display: this.formatInsurerDisplay(correspondingInsurer) };

        // Establecer primero la aseguradora sin emitir evento
        this.insurerControl.setValue(enrichedInsurer, { emitEvent: false });

        // Actualizar la lista de planes filtrados para la aseguradora
        this.updateFilteredPlans(correspondingInsurer);

        // Luego establecer el plan (propagando insurer_type también)
        const enrichedPlanWithType = {
          ...enrichedPlan,
          insurer_type: (correspondingInsurer as any)?.insurer_type
        } as any;
        this.planControl.setValue(enrichedPlanWithType, { emitEvent: true });

        // Emitir aseguradora manualmente
        this.insurerSelected.emit(correspondingInsurer);

        // Forzar detección de cambios para que PrimeNG actualice la UI
        this.cdr.detectChanges();
      }
    }
  }
}
