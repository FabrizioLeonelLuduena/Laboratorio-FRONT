import { HelpCenterPayload } from '../../../../shared/services/help-center.service';

/**
 * Help content for the billable entities list module.
 */
export const INVOICE_LIST_HELP_CONTENT: HelpCenterPayload = {
  title: 'Ayuda - Gestión de Entidades Facturables',
  items: [
    {
      icon: 'pi pi-list',
      title: 'Vista General',
      description: 'Comprendiendo la lista de entidades facturables.',
      steps: [
        'Esta lista muestra todos los servicios pendientes de facturación.',
        'Cada fila representa un paciente con servicios completados.',
        'Datos de columna: nombre del paciente, fecha, servicios, monto total.',
        'La lista se actualiza automáticamente cuando se registran nuevos servicios.',
        'Usa los filtros para localizar registros específicos rápidamente.',
        'Puedes abrir el flujo de facturación para cada entidad desde aquí.',
        'Es el punto de entrada principal al proceso de facturación.'
      ]
    },
    {
      icon: 'pi pi-search',
      title: 'Búsqueda y Filtros',
      description: 'Cómo localizar entidades específicas.',
      steps: [
        'Barra de búsqueda: ingresa nombre, documento o número de orden.',
        'Filtro de fecha: elige un rango de fechas.',
        'Filtro de estado: Pendiente, En progreso, Facturado.',
        'Filtro de monto: restringe por rangos de valor.',
        'Filtro de cobertura: muestra entidades por obra social.',
        'Combina filtros según sea necesario.',
        'Los resultados se actualizan instantáneamente.',
        'Usa "Limpiar filtros" para resetear la vista.'
      ]
    },
    {
      icon: 'pi pi-file-edit',
      title: 'Abrir el Flujo de Facturación',
      description: 'Cómo iniciar el proceso de facturación.',
      steps: [
        'Localiza la entidad/paciente en la lista.',
        'Confirma que hay servicios pendientes de facturación.',
        'Haz clic en el botón "Facturar" o en toda la fila.',
        'El sistema abre el flujo de facturación con datos precargados.',
        'Verás información del paciente, servicios realizados y montos.',
        'Completa cualquier información adicional requerida.',
        'Sigue los pasos para procesar la factura.',
        'Después de facturar, la entidad desaparece de la lista de pendientes.'
      ]
    },
    {
      icon: 'pi pi-users',
      title: 'Información del Paciente',
      description: 'Campos mostrados para cada entidad.',
      steps: [
        'Nombre completo del paciente.',
        'Número de documento.',
        'Seguro/cobertura cuando esté disponible.',
        'Número de afiliado.',
        'Fecha de servicio o atención.',
        'Cantidad de servicios/estudios pendientes.',
        'Monto total a facturar.',
        'Estado actual de facturación.',
        'Haz clic en una fila para ver detalles adicionales.'
      ]
    },
    {
      icon: 'pi pi-heart',
      title: 'Entidades con Obra Social',
      description: 'Gestión de pacientes con cobertura de salud.',
      steps: [
        'Los pacientes con obra social muestran un ícono dedicado.',
        'Se muestra el nombre de la obra social.',
        'El copago se calcula automáticamente.',
        'Verifica que la autorización médica esté adjunta.',
        'Si falta la autorización, factura el 100% al paciente.',
        'La parte cubierta queda como cuenta por cobrar.',
        'Confirma todos los datos de la obra social antes de facturar.',
        'Revisa límites de cobertura y porcentajes.'
      ]
    },
    {
      icon: 'pi pi-clock',
      title: 'Estados de Facturación',
      description: 'Comprendiendo los estados de las entidades.',
      steps: [
        'PENDIENTE: Servicios realizados, esperando facturación.',
        'EN PROGRESO: Alguien está trabajando en la factura.',
        'FACTURADO: La factura ha sido emitida.',
        'CANCELADO: Servicio anulado o facturación no requerida.',
        'PARCIAL: Facturado parcialmente; servicios restantes pendientes.',
        'Filtra por estado para organizar tu carga de trabajo.',
        'Los estados se actualizan automáticamente.',
        'Prioriza las entidades más antiguas primero.'
      ]
    },
    {
      icon: 'pi pi-sort',
      title: 'Ordenar la Lista',
      description: 'Organiza las entidades según tu flujo de trabajo.',
      steps: [
        'Haz clic en cualquier encabezado de columna para ordenar.',
        'Por fecha: más antiguo primero o más reciente.',
        'Por nombre: alfabético A-Z o Z-A.',
        'Por monto: ascendente o descendente.',
        'Por estado: agrupar por estado de facturación.',
        'El ordenamiento persiste durante tu sesión.',
        'Útil para procesamiento sistemático.',
        'Combina ordenamiento con filtros para mejor control.'
      ]
    },
    {
      icon: 'pi pi-eye',
      title: 'Ver Detalles',
      description: 'Revisa la información completa de una entidad.',
      steps: [
        'Haz clic en el ícono "Ver" o en toda la fila.',
        'Se abre un panel lateral con información detallada.',
        'Contenido: servicios, precios, cobertura, descuentos.',
        'Historial de servicios del paciente.',
        'Comprobantes o documentos asociados.',
        'Notas u observaciones médicas.',
        'Puedes ir directamente a facturación desde el panel.',
        'Cierra el panel para volver a la lista.'
      ]
    },
    {
      icon: 'pi pi-download',
      title: 'Exportar la Lista',
      description: 'Descarga la lista en diferentes formatos.',
      steps: [
        'Haz clic en el botón "Exportar".',
        'Elige un formato: Excel, PDF o CSV.',
        'Decide si exportar todo o solo los datos filtrados.',
        'El archivo se descarga automáticamente.',
        'Útil para reportes o análisis externos.',
        'Excel te permite trabajar sin conexión.',
        'PDF es conveniente para imprimir o presentar.',
        'Los datos exportados respetan los filtros actuales.'
      ]
    },
    {
      icon: 'pi pi-question-circle',
      title: 'Preguntas Frecuentes',
      description: 'Preguntas comunes sobre la gestión de entidades.',
      steps: [
        '¿Cuándo aparece una entidad aquí? Cuando hay servicios pendientes de facturación.',
        '¿Puedo facturar parcialmente? Sí, los servicios restantes quedan pendientes.',
        '¿Qué pasa si no encuentro un paciente? Confirma que tenga servicios registrados.',
        '¿Puedo facturar múltiples entidades a la vez? Sí, mediante facturación masiva.',
        '¿Las entidades expiran? Depende de la política, pero factura lo antes posible.',
        '¿Puedo editar datos desde esta vista? No, solo consultar y acceder a facturación.',
        '¿Qué pasa si los datos son incorrectos? Corrígelos antes de facturar.',
        '¿Las actualizaciones de datos son automáticas? Sí, en tiempo real.',
        '¿Puedo ver entidades de otros usuarios? Sí, la lista es compartida.'
      ]
    }
  ]
};
