import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { GenericModalComponent } from '../../../shared/components/generic-modal/generic-modal.component';
import { QueueRequestDto } from '../models/queue.models';
import { PrintService } from '../services/print.service';
import { QueueService } from '../services/queue.service';

/**
 * Componente para registrar un paciente en la cola
 * Captura el DNI y envía la solicitud al backend
 */
@Component({
  selector: 'app-queue-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    GenericButtonComponent,
    GenericModalComponent
  ],
  templateUrl: './queue-register.component.html',
  styleUrls: ['./queue-register.component.css']
})
export class QueueRegisterComponent implements OnInit {
  /** DNI del paciente a registrar */
  nationalId: string = '';

  /** Indica si el paciente tiene turno previo */
  hasAppointment: boolean = false;

  /** Indica si se está procesando la solicitud */
  isLoading: boolean = false;

  /** Indica si se debe mostrar el modal de éxito */
  showSuccessModal: boolean = false;

  /** Código público del turno asignado */
  publicCode: string = '';

  /** Indica si se debe mostrar el modal de error */
  showErrorModal: boolean = false;

  /** Título del modal de error */
  errorModalTitle: string = '';

  /** Icono del modal de error */
  errorModalIcon: string = 'pi-exclamation-triangle';

  /** Mensaje de error a mostrar */
  errorMessage: string = '';

  /** Tipo de alerta (error o warning) */
  errorAlertType: 'error' | 'warning' | 'info' | 'success' = 'error';

  /** Título de la alerta */
  errorAlertTitle: string = '';

  /** Indica si se debe mostrar el modal del código QR */
  showQrModal: boolean = false;

  /** URL del código QR generado */
  qrCodeUrl: string = '';

  /** Tamaño del código QR (configurable) */
  private qrSize: string = '200x200';

  /** URL base para el código QR (configurable) */
  private qrDataUrl: string = 'https://lcclaboratorio.com.ar/';

  /** Timeout para cerrar automáticamente el modal de éxito */
  private successModalTimeout: any = null;

  /** Key de localStorage para obtener usuario */
  private userKey = 'auth_user';

  /**
   * Constructor del componente
   * @param route Servicio para acceder a los parámetros de la ruta
   * @param router Servicio de navegación
   * @param queueService Servicio para gestionar la cola de pacientes
   * @param printService Servicio para imprimir tickets
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private queueService: QueueService,
    private printService: PrintService
  ) {}

  /**
   * Inicializa el componente y obtiene los parámetros de la URL
   */
  ngOnInit(): void {
    const currentOrigin = window.location.origin;
    const url = new URL(currentOrigin);
    url.port = '4201';
    this.qrDataUrl = url.toString();

    // Obtener el parámetro hasAppointment de la URL
    this.route.queryParams.subscribe(params => {
      this.hasAppointment = params['hasAppointment'] === 'true';
    });
  }

  /**
   * Valida que el DNI tenga entre 7 y 8 dígitos
   */
  get isValidNationalId(): boolean {
    const length = this.nationalId.trim().length;
    return length >= 7 && length <= 8;
  }

  /**
   * Valida y filtra la entrada del DNI para permitir solo números
   * @param event Evento del input
   */
  onNationalIdInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remover cualquier caracter que no sea número
    const filteredValue = input.value.replace(/[^0-9]/g, '');
    // Limitar a 8 dígitos máximo
    this.nationalId = filteredValue.slice(0, 8);
    // Actualizar el valor del input
    input.value = this.nationalId;
  }

  /**
   * Previene la entrada de caracteres no numéricos
   * @param event Evento del teclado
   */
  onNationalIdKeypress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Permitir solo números (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  /**
   * Envía el registro al backend
   */
  onSubmit(): void {
    if (!this.isValidNationalId) {
      this.showInlineMessage('warning', 'Atención', 'Por favor ingrese un número de documento válido (entre 7 y 8 dígitos)');
      return;
    }

    // Limpiar mensajes anteriores
    this.clearInlineMessage();

    this.isLoading = true;

    const request: QueueRequestDto = {
      nationalId: this.nationalId.trim(),
      branchId: this.getBranchId(),
      hasAppointment: this.hasAppointment
    };

    this.queueService.createQueueEntry(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        // El backend devuelve un string con el código del turno
        this.publicCode = response;

        // Generar URL del código QR
        this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${this.qrSize}&data=${encodeURIComponent(this.qrDataUrl)}`;

        // Imprimir ticket automáticamente con código y QR
        this.printService.printTicket(this.publicCode, this.qrCodeUrl, this.hasAppointment);

        this.showSuccessModal = true;

        // Programar cierre automático del modal de éxito después de 2 segundos
        this.successModalTimeout = setTimeout(() => {
          this.closeSuccessModalAndShowQr();
        }, 1800);
      },
      error: (error) => {
        this.isLoading = false;

        // Manejar errores específicos por código HTTP
        if (error.status === 409) {
          this.handleConflictError(error);
        } else if (error.status === 404) {
          this.handleNotFoundError(error);
        } else {
          const message = error.error?.message || error.message || 'Error al registrar el paciente en la cola';
          this.showInlineMessage('error', 'Error', message);
        }
      }
    });
  }

  /**
   * Maneja los diferentes tipos de errores 409 (Conflict)
   * @param error Error HTTP con status 409
   */
  private handleConflictError(error: any): void {
    const errorMessage = error.error?.message || error.error || '';

    // Detectar el tipo específico de conflicto basado en el mensaje del backend
    if (errorMessage.includes('already have an active entry') ||
        errorMessage.toLowerCase().includes('ya está en la cola') ||
        errorMessage.toLowerCase().includes('ya registrado')) {
      this.showInlineMessage('info', 'Información', '¡Ya estás registrado! Tu turno está en cola y pronto serás atendido. No es necesario registrarte nuevamente.');
    } else if (errorMessage.includes('does not have a valid appointment') ||
               errorMessage.toLowerCase().includes('no tiene un turno válido') ||
               errorMessage.toLowerCase().includes('no tienes turnos') ||
               errorMessage.toLowerCase().includes('no tiene turnos') ||
               errorMessage.toLowerCase().includes('sin turnos asignados') ||
               errorMessage.toLowerCase().includes('no appointments')) {
      this.showInlineMessage('warning', 'Turno No Disponible', 'No tienes un turno válido asignado para hoy en esta sucursal. Por favor, solicita un turno antes de registrarte en la cola.');
    } else if (errorMessage.toLowerCase().includes('turno ya atendido') ||
               errorMessage.toLowerCase().includes('appointment already attended')) {
      this.showInlineMessage('warning', 'Atención', 'El turno asociado ya ha sido atendido. No puedes registrarte nuevamente con este turno.');
    } else if (errorMessage.toLowerCase().includes('turno cancelado') ||
               errorMessage.toLowerCase().includes('appointment cancelled')) {
      this.showInlineMessage('warning', 'Atención', 'El turno asociado ha sido cancelado. Por favor, solicita un nuevo turno.');
    } else {
      // Error 409 genérico - mostrar el mensaje del backend
      const message = errorMessage || 'No se puede procesar el registro en este momento. Por favor, intenta nuevamente.';
      this.showInlineMessage('warning', 'Atención', message);
    }
  }

  /**
   * Maneja los errores 404 (Not Found)
   * @param error Error HTTP con status 404
   */
  private handleNotFoundError(error: any): void {
    const errorMessage = error.error?.message || error.error || '';

    // Detectar si es un paciente no encontrado
    if (errorMessage.includes('Patient not found') ||
        errorMessage.toLowerCase().includes('paciente no encontrado')) {
      this.showInlineMessage('warning', 'Paciente No Encontrado', 'No se encontró un paciente con el documento ingresado. Por favor, verifica el número de documento o solicita el registro del paciente.');
    } else if (errorMessage.includes('Branch not found') ||
               errorMessage.toLowerCase().includes('sucursal no encontrada')) {
      this.showInlineMessage('error', 'Error de Configuración', 'No se pudo identificar la sucursal actual. Por favor, contacta al administrador del sistema o intenta iniciar sesión nuevamente.');
    } else {
      // Error 404 genérico
      const message = errorMessage || 'No se encontró el recurso solicitado.';
      this.showInlineMessage('warning', 'Atención', message);
    }
  }

  /**
   * Muestra un mensaje en modal
   * @param type Tipo de alerta
   * @param title Título del mensaje
   * @param message Contenido del mensaje
   */
  private showInlineMessage(type: 'error' | 'warning' | 'info' | 'success', title: string, message: string): void {
    this.errorMessage = message;
    this.errorModalTitle = title;

    switch (type) {
    case 'error':
      this.errorModalIcon = 'pi-times-circle';
      break;
    case 'warning':
      this.errorModalIcon = 'pi-exclamation-triangle';
      break;
    case 'info':
      this.errorModalIcon = 'pi-info-circle';
      break;
    case 'success':
      this.errorModalIcon = 'pi-check-circle';
      break;
    default:
      this.errorModalIcon = 'pi-info-circle';
      break;
    }


    this.showErrorModal = true;
  }

  /**
   * Limpia el mensaje inline
   */
  private clearInlineMessage(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.errorModalTitle = '';
  }

  /**
   * Cierra el modal de error
   */
  onCloseErrorModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.errorModalTitle = '';
  }

  /**
   * Cierra el modal de éxito y muestra el modal del QR
   * Se ejecuta tanto para cierre manual como automático
   */
  onCloseSuccessModal(): void {
    // Limpiar el timeout si existe
    if (this.successModalTimeout) {
      clearTimeout(this.successModalTimeout);
      this.successModalTimeout = null;
    }

    // Cerrar modal de éxito y mostrar modal del QR
    this.closeSuccessModalAndShowQr();
  }

  /**
   * Cierra el modal de éxito y muestra el modal del QR
   */
  private closeSuccessModalAndShowQr(): void {
    this.showSuccessModal = false;
    this.successModalTimeout = null;

    // Pequeño delay para que la transición sea más suave
    setTimeout(() => {
      this.showQrModal = true;
    }, 200);
  }

  /**
   * Cierra el modal del QR y redirige al inicio
   */
  onCloseQrModal(): void {
    this.showQrModal = false;
    this.router.navigate(['/queue/start']);
  }

  /**
   * Navega de vuelta al inicio
   */
  onBack(): void {
    this.router.navigate(['/queue/start']);
  }

  /**
   * Obtiene el branchId desde localStorage usando la estructura auth_user.branch
   * @returns ID de la sucursal
   */
  private getBranchId(): number {
    const userDataRaw = localStorage.getItem(this.userKey);

    if (!userDataRaw) {
      throw new Error(`No se encontró '${this.userKey}' en localStorage`);
    }

    let userData: any;
    try {
      userData = JSON.parse(userDataRaw);
    } catch (e) {
      throw new Error(`Error al parsear '${this.userKey}': ${e}`);
    }

    const branchId = Number(userData?.branch);

    if (Number.isNaN(branchId) || !Number.isFinite(branchId)) {
      throw new Error(`El valor 'branch' del usuario no es válido: ${userData?.branch}`);
    }

    return branchId;
  }
}
