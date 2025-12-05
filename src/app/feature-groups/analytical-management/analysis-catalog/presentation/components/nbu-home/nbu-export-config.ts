/**
 * NBU export configuration
 */

import { ExportColumn } from '../../../../../../shared/services/export';
import { Nbu } from '../../../domain/nbu.model';

export const NBU_EXPORT_COLUMNS: ExportColumn<Nbu>[] = [
  {
    header: 'Código NBU',
    getValue: (nbu) => nbu.nbuCode?.toString() || '-',
    width: 15
  },
  {
    header: 'Determinación',
    getValue: (nbu) => nbu.determination || '-',
    width: 40
  },
  {
    header: 'Tipo',
    getValue: (nbu) => nbu.nbuType || '-',
    width: 12
  },
  {
    header: 'Urgencia',
    getValue: (nbu) => nbu.isUrgency ? 'Sí' : 'No',
    width: 12
  },
  {
    header: 'Por Referencia',
    getValue: (nbu) => nbu.isByReference ? 'Sí' : 'No',
    width: 15
  },
  {
    header: 'Infrecuente',
    getValue: (nbu) => nbu.isInfrequent ? 'Sí' : 'No',
    width: 15
  }
];

export const NBU_PDF_COLUMNS: ExportColumn<Nbu>[] = [
  {
    header: 'Código NBU',
    getValue: (nbu) => nbu.nbuCode?.toString() || '-',
    width: 16
  },
  {
    header: 'Determinación',
    getValue: (nbu) => nbu.determination || '-',
    width: 35
  },
  {
    header: 'Tipo',
    getValue: (nbu) => nbu.nbuType || '-',
    width: 12
  },
  {
    header: 'Urg.',
    getValue: (nbu) => nbu.isUrgency ? 'Sí' : 'No',
    width: 10
  },
  {
    header: 'Ref.',
    getValue: (nbu) => nbu.isByReference ? 'Sí' : 'No',
    width: 10
  },
  {
    header: 'Infreq.',
    getValue: (nbu) => nbu.isInfrequent ? 'Sí' : 'No',
    width: 12
  }
];
