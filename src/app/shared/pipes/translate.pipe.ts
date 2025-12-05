import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generic translation pipe for internationalization.
 * Translates text keys to their translated values according to the configured language.
 * 
 * @example
 * {{ 'NBU_VERSION_MANAGEMENT.TITLE' | translate }} → 'Versiones de NBU'
 * {{ 'NBU_VERSION_MANAGEMENT.EDIT_MODE' | translate }} → 'Modo edición'
 */
@Pipe({
  name: 'translate',
  standalone: true
})
export class TranslatePipe implements PipeTransform {
  private translations: { [key: string]: string } = {
    // NBU Version Management translations
    'NBU_VERSION_MANAGEMENT.TITLE': 'Versiones de NBU',
    'NBU_VERSION_MANAGEMENT.EDIT_MODE': 'Modo edición',
    'NBU_VERSION_MANAGEMENT.CREATE_MODE': 'Modo creación',
    'NBU_VERSION_MANAGEMENT.BASE_VERSION': 'Versión base',
    'NBU_VERSION_MANAGEMENT.BASE_VERSION_OPTIONAL': 'Versión base (opcional)',
    'NBU_VERSION_MANAGEMENT.BASE_VERSION_SELECT': 'Seleccionar versión base...',
    'NBU_VERSION_MANAGEMENT.BASE_VERSION_HINT': 'Selecciona una versión existente para copiar su información y preseleccionar sus NBUs asociados.',
    'NBU_VERSION_MANAGEMENT.BASE_VERSION_SELECTED': 'Versión base seleccionada',
    'NBU_VERSION_MANAGEMENT.BASE_VERSION_SELECTED_MESSAGE': 'Se copiarán los datos de la versión {versionCode} y se preseleccionarán {count} NBUs asociados.',
    'NBU_VERSION_MANAGEMENT.VERSION': 'Versión',
    'NBU_VERSION_MANAGEMENT.PUBLICATION_YEAR': 'Año de publicación',
    'NBU_VERSION_MANAGEMENT.ASSOCIATED_NBUS': 'NBUs asociados',
    'NBU_VERSION_MANAGEMENT.EDIT_VERSION_INFO': 'Editar información de versión',
    'NBU_VERSION_MANAGEMENT.NEW_VERSION_INFO': 'Información de nueva versión',
    'NBU_VERSION_MANAGEMENT.NBU_ASSOCIATION': 'Asociación de NBUs',
    'NBU_VERSION_MANAGEMENT.PRESELECTED_NBUS': 'NBUs preseleccionados',
    'NBU_VERSION_MANAGEMENT.PRESELECTED_NBUS_MESSAGE_EDIT': 'Hay {count} NBUs asociados actualmente. Puedes modificarlos haciendo clic en el botón de abajo.',
    'NBU_VERSION_MANAGEMENT.PRESELECTED_NBUS_MESSAGE_CREATE': 'Hay {count} NBUs de la versión base. Puedes modificarlos haciendo clic en el botón de abajo.',
    'NBU_VERSION_MANAGEMENT.UB_FOR_ASSOCIATION': 'UB para asociación',
    'NBU_VERSION_MANAGEMENT.MANAGE_NBUS': 'Gestionar NBUs',
    'NBU_VERSION_MANAGEMENT.SELECT_NBUS': 'Seleccionar NBUs',
    'NBU_VERSION_MANAGEMENT.ASSOCIATE_NBUS_TO_VERSION': 'Asociar NBUs a versión',
    'NBU_VERSION_MANAGEMENT.SELECT_NBUS_FOR_NEW_VERSION': 'Seleccionar NBUs para nueva versión',
    'NBU_VERSION_MANAGEMENT.CHANGE': 'Cambiar',
    'NBU_VERSION_MANAGEMENT.LOADING_VERSIONS': 'Cargando versiones de NBU...',
    'NBU_VERSION_MANAGEMENT.SAVING_VERSION': 'Guardando versión...',
    'NBU_VERSION_MANAGEMENT.SAVING_ASSOCIATIONS': 'Guardando asociaciones de NBUs...'
  };

  /**
   * Transforms a translation key into its translated value.
   * Supports parameter interpolation using {paramName}.
   * 
   * @param value Translation key (e.g., 'NBU_VERSION_MANAGEMENT.TITLE')
   * @param params Object with parameters for interpolation (optional)
   * @returns Translated text or the key if translation is not found
   * 
   * @example
   * {{ 'NBU_VERSION_MANAGEMENT.BASE_VERSION_SELECTED_MESSAGE' | translate: {versionCode: 'V1', count: 5} }}
   */
  transform(value: string, params?: { [key: string]: string | number }): string {
    if (!value) return '';

    const key = value.toString().trim();
    let translation = this.translations[key] || key;

    // Parameter interpolation
    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }

    return translation;
  }
}

