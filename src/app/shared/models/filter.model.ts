/**
 * Configuración adicional para filtros (puede extenderse según necesidades)
 */
export interface FilterConfig {
  /** Indica si el filtro incluye una barra de búsqueda para filtrar opciones */
  searchBar: boolean;
}

/**
 * 🔘 Representa una opción disponible dentro de un filtro.
 * Ejemplo: { label: 'Activos', value: true, active: true }
 */
export interface FilterOption {
  /** Etiqueta visible que se muestra al usuario */
  label: string;

  /**
   * Valor asociado a la opción.
   * Puede ser texto, número, booleano o null (para opción "Todos").
   */
  value: string | number | boolean | null;

  /** Indica si esta opción está seleccionada actualmente */
  active?: boolean;
}

/**
 * ⚙️ Configuración de un filtro (ej. Estado, Rol, Categoría)
 */
export interface Filter {
  /** Identificador único del filtro (clave) */
  id: string;

  /** Título o etiqueta visible del filtro */
  label: string;

  /**
   * Tipo de control visual que utiliza el filtro:
   * - 'radio': grupo de opciones exclusivas
   * - 'select': menú desplegable (dropdown)
   * - 'dateRange': selector de rango de fechas
   */
  type: 'radio' | 'select' | 'dateRange';

  /** Opciones disponibles dentro del filtro */
  options?: FilterOption[];

  /** Configuración adicional del filtro */
  filterConfig?: FilterConfig;

  /** Valor de fecha desde (para tipo dateRange) */
  dateFrom?: Date | null;

  /** Valor de fecha hasta (para tipo dateRange) */
  dateTo?: Date | null;
}

/**
 * 📤 Evento emitido por el componente de filtros al cambiar su estado.
 */
export interface FilterChangeEvent {
  /**
   * Colección de filtros activos.
   * Cada entrada representa un filtro con su valor seleccionado.
   */
  filters: Array<{
    id: string;
    value: string | number | boolean | null;
    dateFrom?: Date | null;
    dateTo?: Date | null;
  }>;

  /** Número total de filtros activos */
  activeCount?: number;
}
