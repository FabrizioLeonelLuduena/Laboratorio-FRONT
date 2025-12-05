import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { map, of, switchMap } from 'rxjs';

import { AdvancedTableComponent } from '../../../../../shared/components/advanced-table/advanced-table.component';
import { GenericAlertComponent } from '../../../../../shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from '../../../../../shared/components/generic-button/generic-button.component';
import { ConfirmationModalComponent } from '../../../../../shared/components/generic-confirmation/confirmation-modal.component';
import { TranslateStatusPipe } from '../../../../../shared/pipes/translate-status.pipe';
import { User } from '../../../analytical/models/user.interface';
import { CartItem, LabelDTO, LabelStatus } from '../../models/label.interface';
import { LabelService } from '../../services/label.service';
import { SampleReceptionEventService } from '../../services/sample-reception-event.service';
import { UserService } from '../../services/user.service';
import {
  isNumericKey,
  preventNonNumericInput
} from '../../utils/input-validators.util';
import { SamplesCartComponent } from '../samples-cart/samples-cart.component';

/**
 * Component for handling label check-in functionality.
 * Allows users to scan or manually enter barcodes in format: protocolId-labelId
 * Supports state transitions: PENDING → COLLECTED → IN_TRANSIT
 * Implements a cart system to batch register multiple protocols.
 */
@Component({
  selector: 'app-checkin-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    SamplesCartComponent,
    DialogModule,
    GenericButtonComponent,
    ConfirmationModalComponent,
    GenericAlertComponent,
    AdvancedTableComponent
  ],
  templateUrl: './checkin-form.component.html',
  styleUrl: './checkin-form.component.css'
})
export class CheckinFormComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('protocolInput') protocolInput!: ElementRef<HTMLInputElement>;

  user = signal<User | null>(null);
  protocolForm!: FormGroup;

  // Cart system
  cart = signal<CartItem[]>([]);
  showCartDialog = false;
  loading = signal(false);

  // Signals para el modal de confirmación
  showConfirmation = signal(false);
  confirmationTitle = signal('Confirmar');
  confirmationMessage = signal('');
  private confirmationCallback?: () => void;

  // Signals para alertas
  showAlert = signal(false);
  alertType = signal<'success' | 'error' | 'warning'>('success');
  alertTitle = signal('');
  alertText = signal('');
  private alertTimeout?: ReturnType<typeof setTimeout> | undefined;

  // Scanner detection
  private scannerBuffer = '';
  private scannerTimeout: ReturnType<typeof setTimeout> | undefined;

  private userService = inject(UserService);
  private labelService = inject(LabelService);
  private sampleReceptionEventService = inject(SampleReceptionEventService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);


  /**
   * Initializes the component, setting up the form and loading current user data
   */
  ngOnInit(): void {
    this.initForm();
    this.user.set(this.userService.getCurrentUser());
  }

  /**
   * Lifecycle hook that is called after Angular has fully initialized the component's view.
   * Sets focus on the protocol input field to improve user experience by allowing
   * immediate typing or scanning without requiring an additional click.
   *
   * @memberof CheckinFormComponent
   */
  ngAfterViewInit() {
    // Small delay to ensure Angular has rendered the input element
    setTimeout(() => {
      this.protocolInput.nativeElement.focus();
    }, 0);
  }

  /**
   * Gets the protocol form control for easy access in the template
   * @returns The protocol form control
   */
  get protocolControl() {
    return this.protocolForm.get('protocol');
  }

  /**
   * Gets total count of samples in cart
   */
  get cartLabelsCount(): number {
    return this.cart().reduce((sum, item) => sum + item.selectedIds.length, 0);
  }

  /**
   * Gets total count of protocols in cart
   */
  get cartProtocolsCount(): number {
    return this.cart().length;
  }

  /**
   * Initializes the component's form with validation rules
   */
  private initForm(): void {
    this.protocolForm = this.fb.group({
      protocol: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]]
    });
  }

  /**
   * Handles input from barcode scanner or manual keyboard entry.
   */
  onProtocolInput(event: KeyboardEvent) {
    if (event.key === 'Enter') {

      // Get protocol from buffer (scanner) or input value (manual)
      const protocol=
        this.scannerBuffer && /^\d{8}$/.test(this.scannerBuffer)
          ? this.scannerBuffer
          : this.protocolControl?.value?.trim();

      if (protocol && /^\d{8}$/.test(protocol)) {
        this.addProtocolToCart(protocol);
        // Clear input and buffer
        this.protocolControl?.setValue('');
        this.protocolControl?.markAsUntouched();
        this.protocolControl?.markAsPristine();
        this.scannerBuffer = '';
      } else {
        this.protocolControl?.markAllAsTouched();
      }
      return;
    }

    if (preventNonNumericInput(event)) {
      return;
    }

    if (isNumericKey(event.key)) {
      clearTimeout(this.scannerTimeout);
      this.scannerBuffer += event.key;
      this.scannerTimeout = setTimeout(() => {
        this.scannerBuffer = '';
      }, 100);
    }
  }

  /**
   * Muestra un mensaje de alerta al usuario
   */
  private translateStatus = new TranslateStatusPipe();

  /**
   * Displays an alert message to the user.
   * @param type - The type of alert to display (success, error, or warning)
   * @param title - The title of the alert
   * @param text - The message content to display
   */
  private showAlertMessage(
    type: 'success' | 'error' | 'warning',
    title: string,
    text: string
  ) {
    this.alertType.set(type);
    this.alertTitle.set(title);
    this.alertText.set(text);
    this.showAlert.set(true);

    // Auto-cerrar después de 3 segundos
    clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => {
      this.showAlert.set(false);
    }, 3000);
  }

  /**
   * Adds a protocol to the cart
   */
  addProtocolToCart(protocol: string) {

    this.labelService
      .getLabelsByProtocol(Number(protocol))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map(labels => this.validateAndFilterLabels(labels, protocol)),
        switchMap(result => {
          if (!result.isValid) {
            return of(null);
          }

          const { existingCartItem, nextLabel, labelsInSameStatus } = result;

          if (existingCartItem) {
            this.updateCartItem(existingCartItem, nextLabel);
            return of(null);
          } else {
            // Calculate required count based on labels in same status
            const requiredCount = labelsInSameStatus!.length;
            return of({
              protocol,
              nextLabel,
              labelsInSameStatus,
              requiredCount
            });
          }
        })
      )
      .subscribe({
        next: (result) => {
          if (result && result.nextLabel) {
            this.createNewCartItemFromData(
              result.protocol,
              result.nextLabel,
              result.labelsInSameStatus!,
              result.requiredCount
            );
          }
        },
        error: (err) => {
          const errorMessage =
            err.status === 404
              ? 'Protocolo no encontrado'
              : 'Error al cargar las muestras';
          this.showAlertMessage('error', 'Error', errorMessage);
        }
      });
  }

  /**
   * Validates and filters labels for cart addition
   */
  private validateAndFilterLabels(labels: LabelDTO[], protocolId: string) {
    if (labels.length === 0) {
      this.showAlertMessage('error', 'Error', 'Rótulo no encontrado');
      return { isValid: false };
    }

    const existingCartItem = this.cart().find(
      (item) => item.protocol === protocolId
    );

    const targetStatus = existingCartItem?.currentStatus || null;

    const validLabels = labels.filter((label) => {
      if (targetStatus && label.status !== targetStatus) return false;

      if (
        label.status !== LabelStatus.PENDING &&
        label.status !== LabelStatus.COLLECTED
      ) return false;

      if (existingCartItem?.selectedIds.includes(label.id)) return false;

      return true;
    });

    if (validLabels.length === 0) {
      if (existingCartItem) {
        this.showAlertMessage(
          'warning',
          'Rótulo duplicado',
          'Todas las muestras de este protocolo ya fueron escaneados'
        );
      } else {
        this.showAlertMessage(
          'warning',
          'Estado no permitido',
          'No hay muestras disponibles en estados PENDIENTE o RECOLECTADOS'
        );
      }
      return { isValid: false };
    }

    const nextLabel = validLabels[0];

    if (nextLabel.status === LabelStatus.IN_TRANSIT) {
      this.showAlertMessage(
        'warning',
        'Muestra ya registrado',
        'La muestra ya fue registrada como EN TRÁNSITO.'
      );
      return { isValid: false };
    }

    if (
      nextLabel.status === LabelStatus.DELIVERED ||
      nextLabel.status === LabelStatus.PROCESSING ||
      nextLabel.status === LabelStatus.COMPLETED
    ) {
      this.showAlertMessage(
        'warning',
        'Muestra ya procesada',
        `La muestra está en estado ${this.translateStatus.transform(nextLabel.status)}.`
      );
      return { isValid: false };
    }

    const labelsInSameStatus = labels.filter(
      (label) => label.status === nextLabel.status
    );

    return {
      isValid: true,
      existingCartItem,
      nextLabel,
      labelsInSameStatus
    } as const;
  }

  /**
   * Creates new cart item from provided data
   */
  private createNewCartItemFromData(
    protocolId: string,
    firstLabel: LabelDTO,
    labelsInSameStatus: LabelDTO[],
    requiredCount: number
  ) {
    const newItem: CartItem = {
      protocol: protocolId,
      labels: labelsInSameStatus,
      selectedIds: [firstLabel.id],
      requiredCount: requiredCount,
      isComplete: 1 === requiredCount,
      currentStatus: firstLabel.status
    };

    this.cart.update((items) => [...items, newItem]);

    const status = newItem.isComplete ? 'Completo' : 'Incompleto';
    this.showAlertMessage(
      'success',
      'Protocolo agregado',
      `${protocolId} - 1/${requiredCount} - ${this.translateStatus.transform(status)}`
    );
  }

  /**
   * Actualiza un item existente en el carrito agregando un nuevo label
   */
  private updateCartItem(cartItem: CartItem, newLabel: LabelDTO) {
    const updatedItem = {
      ...cartItem,
      selectedIds: [...cartItem.selectedIds, newLabel.id]
    };

    updatedItem.isComplete =
      updatedItem.selectedIds.length === updatedItem.requiredCount;

    this.cart.update((items) =>
      items.map((item) =>
        item.protocol === cartItem.protocol ? updatedItem : item
      )
    );

    const status = updatedItem.isComplete ? 'Completo' : 'Incompleto';
    this.showAlertMessage(
      'success',
      'Muestra agregado',
      `${updatedItem.selectedIds.length}/${updatedItem.requiredCount} - ${this.translateStatus.transform(status)}`
    );
  }

  /**
   * Opens the cart dialog
   */
  openCartDialog() {
    this.showCartDialog = true;
  }

  /**
   * Handles cart changes from child component
   */
  onCartChange(updatedCart: CartItem[]) {
    this.cart.set(updatedCart);
  }

  /**
   * Removes a protocol from cart
   */
  onRemoveProtocol(protocol: string) {
    this.cart.update((items) =>
      items.filter((item) => item.protocol !== protocol)
    );

    this.showAlertMessage(
      'warning',
      'Eliminado',
      `Muestra con protocolo ${protocol} eliminado.`
    );
  }

  /**
   * Clears entire cart
   */
  onClearCart() {
    this.confirmationTitle.set('Confirmar vaciar muestrario');
    this.confirmationMessage.set(
      '¿Está seguro que desea vaciar todo el muestrario? Esta acción no se puede deshacer.'
    );
    this.confirmationCallback = () => {
      this.cart.set([]);
      this.showAlertMessage(
        'success',
        'Muestrario vacío',
        'Se ha limpiado el muestrario'
      );
    };
    this.showConfirmation.set(true);
  }

  /**
   * Registers all samples from cart
   */
  onRegisterCart() {
    const incompleteProtocols = this.cart().filter((item) => !item.isComplete);

    if (incompleteProtocols.length > 0) {
      this.showAlertMessage(
        'warning',
        'Protocolos incompletos',
        `Hay ${incompleteProtocols.length} protocolo(s) sin todos las muestras escaneadas`
      );
      return;
    }

    const totalLabels = this.cartLabelsCount;
    const totalProtocols = this.cartProtocolsCount;

    this.confirmationTitle.set('Confirmar registro');
    this.confirmationMessage.set(
      `Va a registrar ${totalProtocols} protocolo${
        totalProtocols > 1 ? 's' : ''
      } con ${totalLabels} muestra${
        totalLabels > 1 ? 's' : ''
      }.\n\n¿Desea continuar?`
    );
    this.confirmationCallback = () => this.processCartRegistration();
    this.showConfirmation.set(true);
  }

  /**
   * Maneja la aceptación del modal de confirmación
   */
  onConfirmationAccepted() {
    this.showConfirmation.set(false);
    if (this.confirmationCallback) {
      this.confirmationCallback();
      this.confirmationCallback = undefined;
    }
  }

  /**
   * Maneja el rechazo del modal de confirmación
   */
  onConfirmationDismissed() {
    this.showConfirmation.set(false);
    this.confirmationCallback = undefined;
  }

  /**
   * Procesa el registro de muestras del carrito
   */
  private processCartRegistration() {
    this.loading.set(true);
    const cartItems = this.cart();

    // Agrupar por estado actual para determinar transición
    const cartByStatus = cartItems.reduce((acc, item) => {
      if (!acc[item.currentStatus]) {
        acc[item.currentStatus] = [];
      }
      acc[item.currentStatus].push(item);
      return acc;
    }, {} as Record<LabelStatus, CartItem[]>);

    // Validar que todos tengan el mismo estado
    const states = Object.keys(cartByStatus);
    if (states.length > 1) {
      this.loading.set(false);
      this.showAlertMessage(
        'error',
        'Error',
        'No se pueden registrar muestras con diferentes estados'
      );
      return;
    }

    const currentStatus = states[0] as LabelStatus;
    const nextStatus =
      currentStatus === LabelStatus.PENDING
        ? LabelStatus.COLLECTED
        : LabelStatus.IN_TRANSIT;

    // Collect all label IDs
    const allLabelIds = cartItems.flatMap((item) => item.selectedIds);

    this.labelService.updateLabelsStatus(allLabelIds, nextStatus).subscribe({
      next: (updatedLabels) => {
        this.loading.set(false);

        const statusText = this.translateStatus.transform(nextStatus);
        const plural = updatedLabels.length > 1 ? 's' : '';
        this.showAlertMessage(
          'success',
          'Registro exitoso',
          `${updatedLabels.length} muestra${plural} actualizado${plural} a ${statusText.toLowerCase()}`
        );

        // Si pasaron a IN_TRANSIT, emitir evento para recepción
        if (nextStatus === LabelStatus.IN_TRANSIT) {
          cartItems.forEach((item) => {
            this.sampleReceptionEventService.emitSampleCheckedIn({
              protocol: item.protocol,
              samples: [], // TODO: Adapt as needed
              timestamp: new Date()
            });
          });
        }

        // Clear cart and close dialog
        this.cart.set([]);
        this.showCartDialog = false;
      },
      error: (err) => {
        this.loading.set(false);
        const errorMessage =
          err.error?.message ||
          err.message ||
          'Error al actualizar las muestras';
        this.showAlertMessage('error', 'Error', errorMessage);
      }
    });
  }

  /**
   * Limpia recursos al destruir el componente
   */
  ngOnDestroy() {
    clearTimeout(this.alertTimeout);
  }
}
