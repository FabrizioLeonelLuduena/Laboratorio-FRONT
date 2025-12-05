import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'; // ViewChild y ElementRef ya no son necesarios para el input nativo
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

// PrimeNG Imports
import { FileUploadModule } from 'primeng/fileupload';
import { FileUploadHandlerEvent } from 'primeng/fileupload';
import { GenericAlertComponent } from 'src/app/shared/components/generic-alert/generic-alert.component';
import { GenericButtonComponent } from 'src/app/shared/components/generic-button/generic-button.component';
import { GenericHeaderCardComponent } from 'src/app/shared/components/generic-header-card/generic-header-card.component';

import { EmployeeService } from '../../services/employee.service';

/**
 *
 */
@Component({
  selector: 'app-upload-signature',
  standalone: true,
  imports: [
    CommonModule,
    GenericHeaderCardComponent,
    GenericButtonComponent,
    GenericAlertComponent,
    FileUploadModule // Agregado
  ],
  templateUrl: './upload-signature.component.html',
  styleUrls: ['./upload-signature.component.css']
})
export class UploadSignatureComponent implements OnInit {
  @Input() employeeId!: number;
  @Output() closeModal = new EventEmitter<void>();

  selectedFile: File | null = null;
  signaturePreviewUrl: SafeUrl | null = null;

  showAlert = false;
  showSuccessAlert = false;
  alertMessage = '';
  alertType: 'info' | 'error' | 'success' = 'info';

  /**
   * Constructor
   */
  constructor(
    private employeeService: EmployeeService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {}

  /**
   * Component initialization - loads signature preview if employeeId exists
   */
  ngOnInit(): void {
    if (this.employeeId) {
      this.loadPreview();
    }
  }

  /**
   * Maneja la selección automática del FileUpload de PrimeNG.
   * Usamos customUpload para interceptar el archivo y no enviarlo aun.
   */
  onBasicUploadAuto(event: FileUploadHandlerEvent): void {
    const file = event.files[0];

    if (file) {
      // Validar tipo (Aunque el accept del HTML ayuda, validamos aquí también)
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        this.showAlertMessage('Por favor, seleccione un archivo PNG o JPG válido.', 'error');
        this.selectedFile = null;
        return;
      }

      // Validar tamaño (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.showAlertMessage('El archivo es demasiado grande. Máximo 5MB.', 'error');
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;

      // Generar vista previa local inmediata (opcional, para UX)
      const url = URL.createObjectURL(file);
      this.signaturePreviewUrl = this.sanitizer.bypassSecurityTrustUrl(url);

      // Limpiamos el fileupload visualmente (el archivo ya está en this.selectedFile)
      // @ts-ignore
      if(event.originalEvent && event.originalEvent.target) event.originalEvent.target.value = '';
    }
  }

  /**
   * Removes the selected file and clears the preview
   */
  onRemoveFile(): void {
    this.selectedFile = null;
    this.signaturePreviewUrl = null;
    // Si ya existía una firma en base de datos, quizás quieras recargarla:
    // this.loadPreview();
    // O dejarlo vacío para indicar que se va a borrar/reemplazar.
  }

  /**
   * Lógica combinada para el botón cancelar:
   * 1. Si hay archivo pendiente de subir -> Lo limpia.
   * 2. Si no hay archivo -> Emite evento para cerrar el modal.
   */
  onCancelOrClear(): void {
    this.closeModal.emit();
  }

  /**
   * Uploads the selected signature file to the server
   */
  onUpload(): void {
    if (!this.selectedFile || !this.employeeId) {
      this.showAlertMessage('Por favor, seleccione un archivo primero.', 'error');
      return;
    }

    this.employeeService.uploadSignature(this.employeeId, this.selectedFile).subscribe({
      next: () => {
        this.showSuccessAlert = true;
        this.loadPreview(); // Recargar desde backend
        this.selectedFile = null;
        setTimeout(() => {
          this.closeModal.emit();
          this.showSuccessAlert = false;
        }, 1500);
      },
      error: () => {
        this.showAlertMessage('Error al cargar la firma.', 'error');
      }
    });
  }

  /**
   * Loads the signature preview from the server
   */
  loadPreview(): void {
    if (!this.employeeId) return;

    this.employeeService.getSignature(this.employeeId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.signaturePreviewUrl = this.sanitizer.bypassSecurityTrustUrl(url);
      },
      error: () => {}
    });
  }

  /**
   * Navigates back to the employees list
   */
  onBack(): void {
    this.router.navigate(['/care-management/employees']);
  }

  /**
   * Displays an alert message with the specified type
   */
  private showAlertMessage(message: string, type: 'info' | 'error' | 'success'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }

}
