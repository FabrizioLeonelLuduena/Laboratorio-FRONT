import { HelpCenterPayload } from '../../../../shared/services/help-center.service';

/**
 * Help content for the invoicing module.
 */
export const INVOICING_HELP_CONTENT: HelpCenterPayload = {
  title: 'Ayuda - Módulo de Facturación',
  items: [
    {
      icon: 'pi pi-file-edit',
      title: 'Crear una Nueva Factura',
      description: 'Aprende cómo generar facturas paso a paso.',
      steps: [
        'Haz clic en el botón "Nueva Factura" desde la lista principal.',
        'Completa los datos básicos: fecha, número de factura, tipo de comprobante.',
        'Selecciona o crea un cliente usando el botón "+".',
        'Agrega ítems/productos con cantidades y precios.',
        'Configura descuentos e IVA según sea necesario.',
        'Revisa el resumen antes de confirmar.',
        'Haz clic en "Confirmar" para emitir la factura.'
      ]
    },
    {
      icon: 'pi pi-users',
      title: 'Gestión de Clientes',
      description: 'Cómo agregar y administrar información de clientes.',
      steps: [
        'En el paso 1, haz clic en el botón "+" junto al campo Cliente.',
        'Proporciona los datos requeridos: Razón social, CUIT, Email.',
        'Opcionalmente agrega teléfono y domicilio.',
        'Haz clic en "Guardar" para crear el cliente.',
        'El nuevo cliente se selecciona automáticamente en la factura.'
      ]
    },
    {
      icon: 'pi pi-shopping-cart',
      title: 'Agregar Ítems a la Factura',
      description: 'Cómo incluir productos o servicios.',
      steps: [
        'En el paso 2, haz clic en "Agregar ítem" para crear una nueva línea.',
        'Ingresa la descripción del producto/servicio.',
        'Proporciona la cantidad.',
        'Establece el precio unitario.',
        'Aplica descuentos porcentuales cuando corresponda.',
        'Elige la tasa de IVA (21%, 10.5% o 0%).',
        'Los totales se calculan automáticamente.',
        'Usa el teclado para navegar rápidamente entre campos.'
      ]
    },
    {
      icon: 'pi pi-calculator',
      title: 'Tasas de IVA en Argentina',
      description: 'Referencia para tasas impositivas válidas.',
      steps: [
        '21%: Tasa general aplicada a la mayoría de productos y servicios.',
        '10.5%: Tasa reducida para productos específicos.',
        '0%: Exento de IVA (operaciones no gravadas).'
      ]
    },
    {
      icon: 'pi pi-file',
      title: 'Tipos de Factura',
      description: 'Diferencias entre tipos de comprobantes.',
      steps: [
        'Tipo A: Contribuyentes registrados en IVA - IVA discriminado.',
        'Tipo B: Consumidores finales - IVA incluido en el precio.',
        'Tipo C: Operaciones exentas de IVA.',
        'Elige el tipo que coincida con la condición fiscal del cliente.'
      ]
    },
    {
      icon: 'pi pi-credit-card',
      title: 'Métodos de Pago',
      description: 'Cómo registrar pagos recibidos.',
      steps: [
        'En el paso de métodos de pago, haz clic en "Agregar método".',
        'Selecciona el tipo: efectivo, transferencia, tarjeta, etc.',
        'Ingresa el monto recibido.',
        'Para transferencias o cheques, proporciona banco y detalles de referencia.',
        'Puedes registrar múltiples métodos de pago por factura.',
        'El sistema valida que los pagos igualen el total de la factura.'
      ]
    },
    {
      icon: 'pi pi-eye',
      title: 'Vista Previa y Confirmación',
      description: 'Revisa la factura antes de confirmar.',
      steps: [
        'El paso final muestra un resumen completo de la factura.',
        'Verifica datos del cliente, ítems y totales.',
        'Revisa los métodos de pago registrados.',
        'Si encuentras un error, usa "Atrás" para corregirlo.',
        'Haz clic en "Confirmar" cuando todo esté correcto.',
        'La factura se genera y puedes descargar el PDF.'
      ]
    },
    {
      icon: 'pi pi-times-circle',
      title: 'Cancelar una Factura',
      description: 'Procedimiento para anular facturas emitidas.',
      steps: [
        'En la lista de facturas, localiza la factura a cancelar.',
        'Haz clic en la acción "Cancelar" (ícono de cancelación).',
        'Confirma la acción en el diálogo.',
        'Opcionalmente agrega un motivo de cancelación.',
        'El estado de la factura cambia a "CANCELADA".',
        'Las facturas canceladas no pueden editarse ni eliminarse.'
      ]
    },
    {
      icon: 'pi pi-keyboard',
      title: 'Atajos de Teclado',
      description: 'Navega la grilla de ítems más rápido.',
      steps: [
        'Tab: Mover al siguiente campo.',
        'Shift + Tab: Mover al campo anterior.',
        'Enter: Confirmar y avanzar al siguiente campo.',
        'Escape: Cancelar edición.',
        'Flecha derecha: Siguiente columna.',
        'Flecha izquierda: Columna anterior.',
        'Flecha abajo: Siguiente fila.',
        'Flecha arriba: Fila anterior.'
      ]
    },
    {
      icon: 'pi pi-question-circle',
      title: 'Preguntas Frecuentes',
      description: 'Respuestas a preguntas comunes.',
      steps: [
        '¿Puedo modificar una factura confirmada? No, las facturas confirmadas son de solo lectura.',
        '¿Cómo corrijo un error? Cancela la factura y crea una nueva.',
        '¿Los números de factura son consecutivos? Sí, el sistema los asigna automáticamente.',
        '¿Puedo usar múltiples métodos de pago? Sí, es compatible.',
        '¿Qué pasa si omito métodos de pago? La validación asegura que los totales coincidan.',
        '¿Puedo descargar el PDF más tarde? Sí, desde la lista de facturas.',
        '¿Está integrado con Colppy? Sí, las facturas se sincronizan automáticamente.'
      ]
    }
  ]
};
