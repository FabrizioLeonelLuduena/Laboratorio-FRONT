import { Injectable, signal } from '@angular/core';

/**
 * Servicio para gestionar el título dinámico de la página en el navbar.
 * Permite actualizar el título desde cualquier componente.
 */
@Injectable({
  providedIn: 'root'
})
export class PageTitleService {
  /** Título actual de la página (signal reactivo) */
  private _pageTitle = signal<string>('Laboratorio Castillo Chidiak');

  /** Getter público para acceder al signal (readonly) */
  public pageTitle = this._pageTitle.asReadonly();

  /**
   * Establece un nuevo título para la página
   * @param title - El nuevo título a mostrar en el navbar
   */
  setTitle(title: string): void {
    this._pageTitle.set(title);
  }

  /**
   * Resetea el título al valor por defecto
   */
  resetTitle(): void {
    this._pageTitle.set('Laboratorio Castillo Chidiak');
  }
}