# Servicios de Exportación Genéricos

Este módulo proporciona servicios reutilizables para exportar datos a formatos Excel y PDF con configuración personalizable.

## Características

- ✅ **Genéricos y reutilizables**: Funcionan con cualquier tipo de datos
- ✅ **Type-safe**: Completamente tipados con TypeScript
- ✅ **Personalizable**: Estilos, colores, anchos de columna configurables
- ✅ **Lazy loading**: Las librerías (jsPDF, xlsx) solo se cargan cuando se usan
- ✅ **Branding consistente**: Colores por defecto según la marca del sistema
- ✅ **Nombres automáticos**: Genera nombres de archivo con timestamps

## Instalación de Dependencias

Para usar estos servicios, necesitas instalar las siguientes dependencias:

```bash
npm install jspdf jspdf-autotable xlsx-js-style
```

## Importación

```typescript
import {
  ExcelExportService,
  PdfExportService,
  ExportColumn,
  ExcelExportConfig,
  PdfExportConfig
} from '@shared/services/export';
```

## Uso Básico

### 1. Definir las Columnas de Exportación

Primero, define las columnas que quieres exportar usando la interfaz `ExportColumn`:

```typescript
import { ExportColumn } from '@shared/services/export';
import { MiModelo } from './mi-modelo';

export const MIS_COLUMNAS: ExportColumn<MiModelo>[] = [
  {
    header: 'ID',
    getValue: (item) => item.id?.toString() || '-',
    width: 10
  },
  {
    header: 'Nombre Completo',
    getValue: (item) => `${item.lastName}, ${item.firstName}`,
    width: 30
  },
  {
    header: 'Email',
    getValue: (item) => item.email || 'Sin email',
    width: 35
  },
  {
    header: 'Estado',
    getValue: (item) => item.active ? 'Activo' : 'Inactivo',
    width: 15
  }
];
```

### 2. Exportar a Excel

En tu componente, inyecta el servicio y úsalo:

```typescript
import { Component } from '@angular/core';
import { ExcelExportService } from '@shared/services/export';
import { MIS_COLUMNAS } from './mi-export-config';

@Component({
  selector: 'app-mi-listado',
  // ...
})
export class MiListadoComponent {
  misDatos: MiModelo[] = [];

  constructor(private excelExportService: ExcelExportService) {}

  async exportarExcel(): Promise<void> {
    const result = await this.excelExportService.exportToExcel({
      data: this.misDatos,
      columns: MIS_COLUMNAS,
      fileName: 'mi-reporte',
      sheetName: 'Hoja1',
      includeTimestamp: true
    });

    if (result.success) {
      console.log('Exportado exitosamente:', result.fileName);
    } else {
      console.error('Error:', result.error);
    }
  }
}
```

### 3. Exportar a PDF

```typescript
import { Component } from '@angular/core';
import { PdfExportService } from '@shared/services/export';
import { MIS_COLUMNAS_PDF } from './mi-export-config';

@Component({
  selector: 'app-mi-listado',
  // ...
})
export class MiListadoComponent {
  misDatos: MiModelo[] = [];

  constructor(private pdfExportService: PdfExportService) {}

  async exportarPdf(): Promise<void> {
    const result = await this.pdfExportService.exportToPdf({
      data: this.misDatos,
      columns: MIS_COLUMNAS_PDF,
      fileName: 'mi-reporte',
      title: 'Listado de Datos',
      orientation: 'landscape', // o 'portrait'
      includeDate: true,
      includeTimestamp: true,
      logo: {
        path: '/lcc_negativo.png',
        width: 48,
        height: 14.4,
        x: 230,
        y: 8
      }
    });

    if (result.success) {
      console.log('Exportado exitosamente:', result.fileName);
    } else {
      console.error('Error:', result.error);
    }
  }
}
```

## Configuración Avanzada

### Estilos Personalizados para Excel

```typescript
await this.excelExportService.exportToExcel({
  data: this.misDatos,
  columns: MIS_COLUMNAS,
  fileName: 'mi-reporte',
  headerStyle: {
    backgroundColor: 'FF0000FF', // Azul
    textColor: 'FFFFFFFF',       // Blanco
    bold: true,
    horizontalAlign: 'center',
    verticalAlign: 'center'
  }
});
```

### Estilos Personalizados para PDF

```typescript
await this.pdfExportService.exportToPdf({
  data: this.misDatos,
  columns: MIS_COLUMNAS_PDF,
  fileName: 'mi-reporte',
  title: 'Mi Reporte',
  headerStyle: {
    backgroundColor: [0, 0, 255],  // Azul RGB
    textColor: [255, 255, 255],    // Blanco RGB
    fontSize: 8,
    bold: true,
    horizontalAlign: 'center'
  },
  bodyStyle: {
    fontSize: 7,
    cellPadding: 2,
    horizontalAlign: 'left',
    alternateRowColor: [240, 240, 240]
  },
  marginLeft: 10,
  marginRight: 10
});
```

### Columnas Diferentes para Excel y PDF

Es recomendable usar columnas diferentes para Excel y PDF debido a las restricciones de espacio:

```typescript
// Excel: Headers completos
export const COLUMNAS_EXCEL: ExportColumn<MiModelo>[] = [
  {
    header: 'Fecha de Nacimiento',
    getValue: (item) => formatDate(item.birthDate),
    width: 18
  },
  // ... más columnas
];

// PDF: Headers abreviados
export const COLUMNAS_PDF: ExportColumn<MiModelo>[] = [
  {
    header: 'F. Nac.',  // Abreviado
    getValue: (item) => formatDate(item.birthDate),
    width: 16
  },
  // ... más columnas
];
```

## Ejemplo Completo: Listado de Empleados

### 1. Crear el archivo de configuración

**`empleados-export-config.ts`**:

```typescript
import { ExportColumn } from '@shared/services/export';
import { Empleado } from './empleado.model';

export const EMPLEADOS_EXCEL_COLUMNS: ExportColumn<Empleado>[] = [
  {
    header: 'Legajo',
    getValue: (emp) => emp.legajo?.toString() || '-',
    width: 12
  },
  {
    header: 'Apellido',
    getValue: (emp) => emp.apellido || '-',
    width: 25
  },
  {
    header: 'Nombre',
    getValue: (emp) => emp.nombre || '-',
    width: 25
  },
  {
    header: 'Departamento',
    getValue: (emp) => emp.departamento?.nombre || '-',
    width: 30
  },
  {
    header: 'Email',
    getValue: (emp) => emp.email || '-',
    width: 35
  },
  {
    header: 'Teléfono',
    getValue: (emp) => emp.telefono || '-',
    width: 18
  }
];

export const EMPLEADOS_PDF_COLUMNS: ExportColumn<Empleado>[] = [
  {
    header: 'Legajo',
    getValue: (emp) => emp.legajo?.toString() || '-',
    width: 15
  },
  {
    header: 'Apellido',
    getValue: (emp) => emp.apellido || '-',
    width: 30
  },
  {
    header: 'Nombre',
    getValue: (emp) => emp.nombre || '-',
    width: 30
  },
  {
    header: 'Dpto.',
    getValue: (emp) => emp.departamento?.nombre || '-',
    width: 35
  },
  {
    header: 'Email',
    getValue: (emp) => emp.email || '-',
    width: 40
  },
  {
    header: 'Tel.',
    getValue: (emp) => emp.telefono || '-',
    width: 20
  }
];
```

### 2. Usar en el componente

**`empleados-list.component.ts`**:

```typescript
import { Component, ChangeDetectorRef } from '@angular/core';
import { ExcelExportService, PdfExportService } from '@shared/services/export';
import { EMPLEADOS_EXCEL_COLUMNS, EMPLEADOS_PDF_COLUMNS } from './empleados-export-config';
import { Empleado } from './empleado.model';

@Component({
  selector: 'app-empleados-list',
  templateUrl: './empleados-list.component.html'
})
export class EmpleadosListComponent {
  empleados: Empleado[] = [];
  loading = false;

  constructor(
    private excelExportService: ExcelExportService,
    private pdfExportService: PdfExportService,
    private cdr: ChangeDetectorRef
  ) {}

  async onExport(event: { type: 'excel' | 'pdf' }): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();

    try {
      let result;

      if (event.type === 'excel') {
        result = await this.excelExportService.exportToExcel({
          data: this.empleados,
          columns: EMPLEADOS_EXCEL_COLUMNS,
          fileName: 'empleados',
          sheetName: 'Empleados',
          includeTimestamp: true
        });
      } else {
        result = await this.pdfExportService.exportToPdf({
          data: this.empleados,
          columns: EMPLEADOS_PDF_COLUMNS,
          fileName: 'empleados',
          title: 'Listado de Empleados',
          orientation: 'landscape',
          includeDate: true,
          includeTimestamp: true,
          logo: {
            path: '/lcc_negativo.png'
          }
        });
      }

      if (result.success) {
        this.showAlert('success', 'Exportado correctamente');
      } else {
        this.showAlert('error', result.error || 'Error al exportar');
      }
    } catch (error) {
      this.showAlert('error', 'Error inesperado al exportar');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private showAlert(type: string, message: string): void {
    // Tu lógica de alertas aquí
    console.log(`[${type}] ${message}`);
  }
}
```

### 3. Template HTML

**`empleados-list.component.html`**:

```html
<app-generic-table
  [data]="empleados"
  [columns]="columns"
  [loading]="loading"
  (downloadExcel)="onExport({ type: 'excel' })"
  (downloadPdf)="onExport({ type: 'pdf' })"
></app-generic-table>
```

## API Reference

### ExportColumn<T>

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `header` | `string` | Texto del encabezado de la columna |
| `getValue` | `(row: T) => string \| number \| null \| undefined` | Función para extraer/formatear el valor de cada fila |
| `width` | `number` (opcional) | Ancho de la columna (caracteres para Excel, mm para PDF) |

### ExcelExportConfig<T>

| Propiedad | Tipo | Descripción | Por defecto |
|-----------|------|-------------|-------------|
| `data` | `T[]` | Array de datos a exportar | - |
| `columns` | `ExportColumn<T>[]` | Definiciones de columnas | - |
| `fileName` | `string` (opcional) | Nombre base del archivo | `'export'` |
| `sheetName` | `string` (opcional) | Nombre de la hoja | `'Hoja1'` |
| `includeTimestamp` | `boolean` (opcional) | Incluir timestamp en nombre | `true` |
| `headerStyle` | `ExcelHeaderStyle` (opcional) | Estilos del encabezado | Brand colors |

### PdfExportConfig<T>

| Propiedad | Tipo | Descripción | Por defecto |
|-----------|------|-------------|-------------|
| `data` | `T[]` | Array de datos a exportar | - |
| `columns` | `ExportColumn<T>[]` | Definiciones de columnas | - |
| `fileName` | `string` (opcional) | Nombre base del archivo | `'export'` |
| `title` | `string` (opcional) | Título del documento | Sin título |
| `orientation` | `'portrait' \| 'landscape'` (opcional) | Orientación de página | `'landscape'` |
| `includeDate` | `boolean` (opcional) | Incluir fecha en documento | `true` |
| `includeTimestamp` | `boolean` (opcional) | Incluir timestamp en nombre | `true` |
| `logo` | `PdfLogoConfig` (opcional) | Configuración del logo | Sin logo |
| `headerStyle` | `PdfHeaderStyle` (opcional) | Estilos del encabezado | Brand colors |
| `bodyStyle` | `PdfBodyStyle` (opcional) | Estilos del cuerpo | Valores por defecto |
| `marginLeft` | `number` (opcional) | Margen izquierdo en mm | `7` |
| `marginRight` | `number` (opcional) | Margen derecho en mm | `7` |

### ExportResult

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `success` | `boolean` | Indica si la exportación fue exitosa |
| `error` | `string` (opcional) | Mensaje de error si falló |
| `fileName` | `string` (opcional) | Nombre del archivo generado |

## Tips y Mejores Prácticas

1. **Separar columnas Excel y PDF**: Usa headers completos en Excel y abreviados en PDF
2. **Validar datos**: Siempre proporciona valores por defecto (ej: `|| '-'`)
3. **Gestión de carga**: Muestra un indicador de carga durante la exportación
4. **Manejo de errores**: Muestra alertas apropiadas al usuario
5. **Anchos de columna**: Ajusta según el contenido esperado
6. **Timestamp opcional**: Desactiva si necesitas nombres de archivo fijos
7. **Lazy loading**: Las librerías se cargan solo cuando se necesitan

## Colores por Defecto

Los servicios usan los colores de la marca por defecto:

- **Excel**: `#008C8A` (fondo), `#FFFFFF` (texto)
- **PDF**: `RGB(0, 140, 138)` (fondo), `RGB(255, 255, 255)` (texto)

Puedes sobrescribirlos usando `headerStyle` en la configuración.

## Troubleshooting

### Error: "Cannot find module 'xlsx-js-style'"

Instala las dependencias:
```bash
npm install xlsx-js-style jspdf jspdf-autotable
```

### El PDF no muestra el logo

Verifica que la ruta del logo sea correcta y que la imagen esté en la carpeta `public/`.

### Los anchos de columna no se aplican correctamente

Ajusta los valores según el contenido. Para PDF usa mm, para Excel usa caracteres.

### Caracteres especiales se ven mal

Asegúrate de que tus datos estén en UTF-8 y que los helpers formateen correctamente.
