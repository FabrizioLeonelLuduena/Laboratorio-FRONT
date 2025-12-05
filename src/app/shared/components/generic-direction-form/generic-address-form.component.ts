import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { finalize, of, switchMap } from 'rxjs';

import { AddressService, ArgentineCity, ArgentineProvince } from '../../services/address.service';
import { digitsOnlyValidator, minDigitsValidator } from '../../validators/custom.validators';

/**
 * Componente de formulario de dirección reutilizable basado en Reactive Forms y PrimeNG.
 * Genera controles dinámicamente según requiredFields y optionalFields y emite el FormGroup al padre.
 */
@Component({
  selector: 'app-generic-address-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, InputNumberModule, SelectModule],
  templateUrl: './generic-address-form.component.html',
  styleUrls: ['./generic-address-form.component.css']
})
export class GenericAddressFormComponent implements OnInit, OnChanges {
  /**
   * Campos requeridos que el formulario debe renderizar y validar.
   * Ej: ['street','number','province','city','postalCode']
   */
  @Input() requiredFields: string[] = [];

  /** Campos opcionales a renderizar sin validación de requerido. */
  @Input() optionalFields: string[] = [];

  /** Disposición visual: 'columns' (3 columnas) o 'stacked' (una debajo de otra) */
  @Input() layout: 'columns' | 'stacked' = 'columns';

  /** Valores iniciales para poblar el formulario */
  @Input() initialValues?: any;

  /** Emite el FormGroup completo hacia el componente padre ante cambios. */
  @Output() addressChange = new EventEmitter<FormGroup>();

  /** Formulario reactivo generado dinámicamente. */
  form!: FormGroup;

  /** Listados para selects de provincias y ciudades. */
  provinces: ArgentineProvince[] = [];
  cities: ArgentineCity[] = [];

  /** Flags de carga para mejorar UX */
  isLoadingProvinces = false;
  isLoadingCities = false;

  // Inyección con API inject() para Standalone Components
  private fb = inject(FormBuilder);

  /** Servicio de direcciones para cargar provincias y ciudades. */
  private addressService = inject(AddressService);

  /** DestroyRef para cancelar suscripciones automáticamente */
  private destroyRef = inject(DestroyRef);

  /** Detecta cambios en los inputs, especialmente initialValues */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValues'] && !changes['initialValues'].firstChange && this.form) {
      const values = changes['initialValues'].currentValue;
      if (values) {
        // Si hay provincia, primero cargarla para poblar ciudades
        if (values.province) {
          this.form.patchValue({ province: values.province }, { emitEvent: true });

          // Luego cargar el resto después de un delay
          setTimeout(() => {
            this.form.patchValue({
              street: values.street ?? '',
              number: values.number ?? '',
              floor: values.floor ?? '',
              neighborhood: values.neighborhood ?? '',
              city: values.city ?? '',
              postalCode: values.postalCode ?? ''
            }, { emitEvent: false });

            // Habilitar ciudad si está deshabilitada
            const cityCtrl = this.form.get('city');
            if (cityCtrl?.disabled && values.city) {
              cityCtrl.enable({ emitEvent: false });
            }
          }, 250);
        } else {
          this.form.patchValue(values, { emitEvent: false });
        }
      }
    }
  }

  /** Inicializa el formulario y carga datos necesarios (provincias). */
  ngOnInit(): void {
    this.buildForm();

    // Aplicar valores iniciales si existen
    if (this.initialValues) {
      this.form.patchValue(this.initialValues, { emitEvent: false });
    }

    // Cargar provincias (con indicador de carga)
    this.isLoadingProvinces = true;
    this.loadProvinces();

    // Deshabilitar ciudad hasta que haya provincia seleccionada
    const provCtrl = this.form.get('province');
    const cityCtrl = this.form.get('city');
    if (cityCtrl && (!provCtrl || !provCtrl.value)) {
      cityCtrl.disable({ emitEvent: false });
    }

    // Emitir el FormGroup al inicializar y cuando cambie
    this.addressChange.emit(this.form);
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.addressChange.emit(this.form));

    // Si ya hay provincia preseleccionada, cargar ciudades inicialmente
    const initialProvince = provCtrl?.value as string | null;
    if (initialProvince) {
      this.isLoadingCities = true;
      this.loadCities(initialProvince, true);
      cityCtrl?.enable({ emitEvent: false });
    }

    // Reactividad: cuando cambie la provincia, cancelar requests anteriores y cargar ciudades
    provCtrl
      ?.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((prov: string | null) => {
          const cCtrl = this.form.get('city');
          if (prov) {
            this.isLoadingCities = true;
            cCtrl?.enable({ emitEvent: false });
            cCtrl?.setValue(null);
            return this.addressService.getCitiesByProvince(prov).pipe(finalize(() => (this.isLoadingCities = false)));
          } else {
            this.cities = [];
            cCtrl?.setValue(null);
            cCtrl?.disable({ emitEvent: false });
            return of([] as ArgentineCity[]);
          }
        })
      )
      .subscribe((cs: ArgentineCity[]) => {
        this.cities = cs;
      });
  }

  /**
   * Construye el formulario según requiredFields y optionalFields.
   * Sólo se agregan controles que estén configurados.
   */
  private buildForm(): void {
    const fields = new Set<string>([...this.requiredFields, ...this.optionalFields]);

    const group: Record<string, any> = {};

    const isRequired = (name: string) => this.requiredFields.includes(name);

    const addControl = (name: string, validators: any[] = []) => {
      if (!fields.has(name)) return;
      group[name] = [null, validators];
    };

    // Campos estándar
    addControl('province', isRequired('province') ? [Validators.required] : []);
    addControl('city', isRequired('city') ? [Validators.required] : []);

    // Código postal: sólo números, mínimo 4 dígitos
    const postalValidators = [digitsOnlyValidator, minDigitsValidator(4)];
    if (isRequired('postalCode')) postalValidators.unshift(Validators.required);
    addControl('postalCode', postalValidators);

    addControl('street', isRequired('street') ? [Validators.required] : []);
    addControl('number', isRequired('number') ? [Validators.required] : []);
    addControl('floor');
    addControl('neighborhood');

    this.form = this.fb.group(group);
  }

  /** Carga listado de provincias desde API pública. */
  private loadProvinces(): void {
    if (!this.shouldRender('province')) {
      this.isLoadingProvinces = false;
      return;
    }
    this.addressService
      .getProvinces()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => (this.isLoadingProvinces = false)))
      .subscribe((provs: ArgentineProvince[]) => {
        this.provinces = provs;
      });
  }

  /** Carga listado de ciudades según la provincia seleccionada. */
  private loadCities(provinceName: string, finalizeFlag = false): void {
    if (!this.shouldRender('city')) {
      this.isLoadingCities = finalizeFlag ? false : this.isLoadingCities;
      return;
    }
    this.addressService
      .getCitiesByProvince(provinceName)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => (this.isLoadingCities = finalizeFlag ? false : this.isLoadingCities)))
      .subscribe((cs: ArgentineCity[]) => {
        this.cities = cs;
      });
  }

  /** Indica si un campo debe renderizarse según la configuración. */
  shouldRender(name: string): boolean {
    return this.requiredFields.includes(name) || this.optionalFields.includes(name);
  }

  /** Mensaje de error genérico por campo (DRY) */
  getErrorMessage(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl || !ctrl.errors || !(ctrl.touched || ctrl.dirty)) return null;
    if (ctrl.errors['required']) return 'Campo requerido';
    if (ctrl.errors['digitsOnly']) return 'Ingrese solo números';
    if (ctrl.errors['minDigits']) return 'Debe tener al menos 4 números';
    return null;
  }
}
