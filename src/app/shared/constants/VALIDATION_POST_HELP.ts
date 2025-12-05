import { HelpCenterPayload } from '../services/help-center.service';

/**
 * Help content for the Study Validation and Electronic Signature screen.
 * Intended for laboratory personnel responsible for validating and signing results.
 */
export const VALIDATION_POST_HELP: HelpCenterPayload = {
  title: 'Validación y Firma de Estudios',
  items: [
    {
      icon: 'pi pi-filter',
      title: 'Filtrar Estudios',
      description: 'Permite localizar estudios fácilmente según criterios clínicos y operativos.',
      steps: [
        'Utiliza el buscador para buscar por paciente o DNI.',
        'Selecciona el rango de fechas utilizando "Fecha Desde" y "Fecha Hasta".',
        'Filtra por estado de firma: Sin firmar, Firmada Parcial o Firmada Total.'
      ]
    },
    {
      icon: 'pi pi-list',
      title: 'Estados del Estudio',
      description: 'Cada estudio tiene un estado que indica su nivel de avance.',
      steps: [
        '• Sin Firma → Aún no se ha firmado ninguna determinación.',
        '• Firmada Parcial → Algunas determinaciones fueron validadas.',
        '• Firmada Total → El estudio está completamente validado y firmado.'
      ]
    },
    {
      icon: 'pi pi-search',
      title: 'Ver Detalle del Estudio',
      description: 'Permite revisar valores, unidades, referencia y validaciones.',
      steps: [
        'Haz clic en el estudio desde la tabla.',
        'Revisa cada determinación y sus valores de referencia.',
        'Confirma si requiere intervención manual o está validada automáticamente.'
      ]
    },
    {
      icon: 'pi pi-check-circle',
      title: 'Validación Manual',
      description: 'Confirma o rechaza determinaciones específicas.',
      steps: [
        'Revisa el valor medido comparado con el rango de referencia.',
        'Si el valor es correcto, marca como "Validado".',
        'Si el valor es incorrecto o requiere corrección, marca como "Rechazado".'
      ]
    },
    {
      icon: 'pi pi-cog',
      title: 'Validación Automática',
      description: 'El sistema puede validar resultados automáticamente si cumplen reglas internas.',
      steps: [
        'Si una determinación cumple criterios predefinidos, aparece como "Validada automáticamente".',
        'Si no cumple, aparecerá como "Rechazada" y requiere revisión manual.'
      ]
    },
    {
      icon: 'pi pi-check-square',
      title: 'Validar Todo',
      description: 'Ahorra tiempo validando todas las determinaciones correctas a la vez.',
      steps: [
        'Haz clic en el botón "Validar Todo".',
        'Solo validará aquellas determinaciones sin conflictos o fuera de rango.',
        'Las determinaciones rechazadas deberán ser corregidas de forma individual.'
      ]
    },
    {
      icon: 'pi pi-pen-to-square',
      title: 'Firma Electrónica',
      description: 'Confirma la liberación del informe al paciente.',
      steps: [
        '• Firmar Parcial: Se firma solo lo validado hasta el momento.',
        '• Firmar Total: El estudio se considera completamente terminado.',
        'Una vez firmado totalmente, el estudio se libera para descarga del paciente.'
      ]
    }
  ]
};
