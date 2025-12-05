/**
 * Modelos de configuración para formularios genéricos del dominio procurement-inventory
 * Permite crear formularios reactivos dinámicos y reutilizables
 */

/**
 * Tipos de campos soportados por el formulario genérico
 */
export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'checkbox'
  | 'select'
  | 'date'
  | 'array'
  | 'phone'
  | 'cuit';

/**
 * Opciones para campos de tipo select
 */
export interface SelectOption {
  label: string;
  value: any;
}

/**
 * Configuración de un campo individual del formulario
 */
export interface FormFieldConfig {
  /**
   * Nombre del campo en el FormGroup
   */
  name: string;

  /**
   * Etiqueta visible del campo
   */
  label: string;

  /**
   * Tipo de campo
   */
  type: FieldType;

  /**
   * Valor inicial del campo
   */
  defaultValue?: any;

  /**
   * Placeholder del campo
   */
  placeholder?: string;

  /**
   * Icono a mostrar (clase de PrimeIcons)
   */
  icon?: string;

  /**
   * Si el campo es obligatorio
   */
  required?: boolean;

  /**
   * Si el campo está deshabilitado
   */
  disabled?: boolean;

  /**
   * Si el campo es de solo lectura
   */
  readonly?: boolean;

  /**
   * Longitud mínima (para textos)
   */
  minLength?: number;

  /**
   * Longitud máxima (para textos)
   */
  maxLength?: number;

  /**
   * Valor mínimo (para números)
   */
  min?: number;

  /**
   * Valor máximo (para números)
   */
  max?: number;

  /**
   * Patrón de validación regex
   */
  pattern?: string;

  /**
   * Mensaje de error personalizado para el patrón
   */
  patternMessage?: string;

  /**
   * Opciones para campos de tipo select
   */
  options?: SelectOption[];

  /**
   * Para campos de tipo array: configuración de los campos hijo
   */
  arrayFields?: FormFieldConfig[];

  /**
   * Etiqueta del botón para agregar elementos (solo para arrays)
   */
  addButtonLabel?: string;

  /**
   * Tamaño del campo en el grid (1-12)
   */
  colSpan?: number;

  /**
   * Tooltip informativo
   */
  tooltip?: string;

  /**
   * Función de validación personalizada
   */
  customValidator?: (control: any) => { [key: string]: any } | null;

  /**
   * Mensaje de ayuda debajo del campo
   */
  helpText?: string;

  /** Muestra el valor en el resumen de ítems (para campos array) */
  showInSummary?: boolean;

  /**
   * Si el campo debe mostrarse solo en modo edición
   */
  editOnly?: boolean;

  /**
   * Si el campo debe mostrarse solo en modo creación
   */
  createOnly?: boolean;

  /**
   * Clases CSS adicionales
   */
  customClass?: string;

  /**
   * Formato de presentación (para campos readonly)
   * Ej: 'currency', 'date', 'cuit'
   */
  displayFormat?: string;

  /**
   * Función para formatear el valor del campo para visualización (solo en modo readonly)
   */
  formatFn?: (value: any) => string;

  /**
   * Configuraciones específicas para campos de tipo array
   */
  arrayMinItems?: number;
  arrayMaxItems?: number;
  arrayDefaultCollapsed?: boolean;
}

/**
 * Configuración de una sección del formulario
 */
export interface FormSectionConfig {
  /**
   * Título de la sección
   */
  title?: string;

  /**
   * Icono de la sección (clase de PrimeIcons)
   */
  icon?: string;

  /**
   * Descripción de la sección
   */
  description?: string;

  /**
   * Campos de la sección
   */
  fields: FormFieldConfig[];

  /**
   * Si la sección es colapsable
   */
  collapsible?: boolean;

  /**
   * Si la sección está colapsada inicialmente
   */
  collapsed?: boolean;

  /**
   * Clases CSS adicionales para la sección
   */
  customClass?: string;
}

/**
 * Configuración completa del formulario genérico
 */
export interface GenericFormConfig {
  /**
   * Título del formulario
   */
  title?: string;

  /**
   * Subtítulo del formulario
   */
  subtitle?: string;

  /**
   * Secciones del formulario
   */
  sections: FormSectionConfig[];

  /**
   * Etiqueta del botón de guardar
   */
  submitButtonLabel?: string;

  /**
   * Etiqueta del botón de cancelar
   */
  cancelButtonLabel?: string;

  /**
   * Si debe mostrar el botón de guardar
   */
  showSubmitButton?: boolean;

  /**
   * Si debe mostrar el botón de cancelar
   */
  showCancelButton?: boolean;

  /**
   * Si está en modo edición (true) o creación (false)
   */
  isEditMode?: boolean;

  /**
   * Si el formulario está en modo solo lectura
   */
  readonly?: boolean;

  /**
   * Icono del botón de guardar
   */
  submitButtonIcon?: string;

  /**
   * Icono del botón de cancelar
   */
  cancelButtonIcon?: string;

  /**
   * Severidad del botón de guardar (PrimeNG)
   */
  submitButtonSeverity?: 'success' | 'info' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast';

  /**
   * Si debe mostrar alertas de validación en el formulario
   */
  showValidationAlerts?: boolean;

  /**
   * Mensaje personalizado para el botón de carga
   */
  loadingMessage?: string;

  /**
   * Clases CSS adicionales para el formulario
   */
  customClass?: string;
}

/**
 * Constantes de validación para el dominio procurement-inventory
 */
export const ProcurementValidationConstants = {
  MAX_COMPANY_NAME_LENGTH: 300,
  MAX_OBSERVATIONS_LENGTH: 1000,
  MAX_NAME_LENGTH: 200,
  MAX_EMAIL_LENGTH: 100,
  MAX_PHONE_LENGTH: 20,
  MAX_ADDRESS_LENGTH: 500,
  CUIT_LENGTH: 11,

  // Patrones regex
  CUIT_PATTERN: '^[0-9]{11}$',
  PHONE_PATTERN: '^[+]?[0-9\\s\\-()]*$',
  COMPANY_NAME_PATTERN: '^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\\s.,&\\-()/\'"°ª]+$',

  // Mensajes de error
  REQUIRED_MESSAGE: 'Este campo es obligatorio',
  EMAIL_MESSAGE: 'Ingrese un email válido',
  PHONE_MESSAGE: 'Ingrese un teléfono válido',
  CUIT_MESSAGE: 'El CUIT debe contener exactamente 11 dígitos numéricos',
  MAX_LENGTH_MESSAGE: (max: number) => `No puede superar los ${max} caracteres`,
  MIN_LENGTH_MESSAGE: (min: number) => `Debe contener al menos ${min} caracteres`
};
