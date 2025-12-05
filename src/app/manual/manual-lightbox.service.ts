import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Servicio que muestra una imagen en un overlay global (inserta un nodo en document.body).
 * Se usa para abrir imágenes fuera de contenedores con overflow oculto (por ejemplo, desplegables).
 */
@Injectable({ providedIn: 'root' })
export class ManualLightboxService {
  private doc = inject(DOCUMENT) as Document;
  private overlayEl: HTMLElement | null = null;
  private escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };

  /**
   * Abre el overlay con la imagen dada.
   * @param src Ruta de la imagen
   * @param opts Opciones: { forceLarge?: boolean }
   */
  open(src: string, opts?: { forceLarge?: boolean }) {
    this.close(); // por si ya existía

    const overlay = this.doc.createElement('div');
    overlay.className = 'manual-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    // contenido: imagen
    const img = this.doc.createElement('img');
    img.className = 'manual-lightbox-img';
    if (opts?.forceLarge) img.classList.add('manual-lightbox-img--force-large');
    img.src = src;
    img.alt = 'imagen ampliada';

    overlay.appendChild(img);

    // cerrar al click en overlay (solo si click en el fondo, no en la imagen)
    overlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === overlay) this.close();
    });

    this.doc.body.appendChild(overlay);
    this.overlayEl = overlay;

    // bloquear scroll del body
    this.doc.body.classList.add('no-scroll');

    // ESC
    this.doc.addEventListener('keydown', this.escHandler);
  }

  /**
   * Cierra el overlay si está abierto.
   */
  close() {
    if (!this.overlayEl) return;
    try {
      this.overlayEl.remove();
    } catch {
      // noop
    }
    this.overlayEl = null;

    // restaurar scroll del body
    this.doc.body.classList.remove('no-scroll');

    this.doc.removeEventListener('keydown', this.escHandler);
  }
}
