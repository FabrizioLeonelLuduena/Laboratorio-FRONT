/**
 * PDF export utility for patient data
 * Handles the generation of PDF files with complete patient information
 */

import { AlertType } from '../../../../shared/components/generic-alert/generic-alert.component';
import { Address } from '../../models/PatientModel';

import { PatientRow } from './patient-list.model';

/**
 * PDF export constants
 */
const PDF_CONSTANTS = {
  TITLE: 'Listado de Pacientes',
  DATE_LABEL: 'Fecha',
  SHEET_NAME: 'Pacientes'
} as const;

/**
 * PDF column headers (abbreviated for space constraints)
 */
const PDF_HEADERS = [
  'DNI',
  'Apellido',
  'Nombre',
  'F. Nac.',
  'Edad',
  'Género',
  'Sexo',
  'Email',
  'Teléfono',
  'Dirección',
  'Localidad',
  'Provincia',
  'CP',
  'O. Social',
  'Plan',
  'N° Afiliado',
  'Estado'
] as const;

/**
 * Helper functions interface for PDF export
 * Contains all necessary functions to format and extract patient data
 */
export interface PdfExportHelpers {
  formatBirthDate: (birthDate: string | Date | null | undefined) => string | null | undefined;
  calculateAge: (birthDate: string | Date | null | undefined) => string | null | undefined;
  translateGender: (gender: string | null | undefined) => string | null | undefined;
  extractEmail: (patient: PatientRow) => string | null | undefined;
  extractPhone: (patient: PatientRow) => string | null | undefined;
  extractPrimaryAddress: (patient: PatientRow) => Address | null | undefined;
  formatAddress: (address: Address | null | undefined) => string | null | undefined;
  extractLocality: (patient: PatientRow) => string | null | undefined;
  extractProvince: (patient: PatientRow) => string | null | undefined;
  extractInsurerName: (patient: PatientRow) => string | null | undefined;
  extractPlanName: (patient: PatientRow) => string | null | undefined;
  extractAffiliateNumber: (patient: PatientRow) => string | null | undefined;
  statusLabel: Record<string, string>;
  showAlert: (type: AlertType, title: string, text: string) => void;
}

/**
 * Export complete patients data to PDF using jsPDF and autoTable
 * @param fullPatients Array of complete patient data from backend
 * @param helpers Object containing helper functions from the component
 */
/**
 * Load image from URL and convert to base64
 * @param url Image URL to load
 * @returns Promise with base64 data URL
 */
async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
}

/**
 * Exports the given patients list to a PDF file using jsPDF and jsPDF-AutoTable.
 * Builds the document header (title, date, optional logo) and a table with
 * fully formatted patient information, then saves the file and shows a status alert.
 *
 * @param fullPatients Full list of patients received from the backend.
 * @param helpers Helper callbacks used to format patient fields and display alerts.
 * @returns Promise that resolves when the PDF has been generated and saved.
 */
export async function exportPatientsToPdf(
  fullPatients: PatientRow[],
  helpers: PdfExportHelpers
): Promise<void> {
  try {
    // Dynamic import to avoid bundling if not used
    // @ts-ignore - jspdf se instalará cuando sea necesario
    const jsPDFModule = await import('jspdf');
    // @ts-ignore - jspdf-autotable se instalará cuando sea necesario
    const autoTableModule = await import('jspdf-autotable');

    const { jsPDF } = jsPDFModule;
    const doc = new jsPDF('landscape'); // Landscape mode for more columns

    // Add title
    doc.setFontSize(16);
    doc.text(PDF_CONSTANTS.TITLE, 14, 15);

    // Try to add logo to the right of the title
    try {
      const logoUrl = '/lcc_negativo.png';
      const logoBase64 = await loadImageAsBase64(logoUrl);

      // Position logo to the right of the title
      // Landscape width is 297mm, center the logo better
      const logoWidth = 48; // Width of logo in mm
      const logoHeight = 14.4; // Height of logo in mm (adjusted to maintain aspect ratio)
      const logoX = 230; // X position (adjusted to be more centered)
      const logoY = 8; // Y position (aligned with title)

      doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch {
      // If logo fails to load, continue without it
    }

    // Add date
    doc.setFontSize(10);
    doc.text(`${PDF_CONSTANTS.DATE_LABEL}: ${new Date().toLocaleDateString('es-AR')}`, 14, 22);

    // Prepare table data with complete information (same as Excel)
    const tableData = fullPatients.map(patient => [
      patient.dni || '-',
      patient.lastName || '-',
      patient.firstName || '-',
      helpers.formatBirthDate(patient.birthDate) || '-',
      helpers.calculateAge(patient.birthDate) || '-',
      helpers.translateGender(patient.gender) || '-',
      helpers.translateGender(patient.sexAtBirth) || '-',
      helpers.extractEmail(patient) || '-',
      helpers.extractPhone(patient) || '-',
      helpers.formatAddress(helpers.extractPrimaryAddress(patient)) || '-',
      helpers.extractLocality(patient) || '-',
      helpers.extractProvince(patient) || '-',
      helpers.extractPrimaryAddress(patient)?.zipCode || '-',
      helpers.extractInsurerName(patient) || '-',
      helpers.extractPlanName(patient) || '-',
      helpers.extractAffiliateNumber(patient) || '-',
      helpers.statusLabel[patient.status ?? 'MIN'] || patient.status || 'Mínimo'
    ]);

    // Generate table using autoTable from the module
    autoTableModule.default(doc, {
      startY: 28,
      head: [[...PDF_HEADERS]],
      body: tableData,
      margin: { left: 7, right: 7 }, // Center the table with equal margins
      styles: {
        fontSize: 6,
        cellPadding: 1.5,
        halign: 'center' // Center align cell content
      },
      headStyles: {
        fillColor: [0, 140, 138], // Brand primary color background (RGB for #008C8A)
        textColor: [255, 255, 255], // White text
        fontStyle: 'bold',
        fontSize: 7
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 16 },   // DNI
        1: { cellWidth: 18 },   // Apellido
        2: { cellWidth: 18 },   // Nombre
        3: { cellWidth: 16 },   // F. Nac.
        4: { cellWidth: 10 },   // Edad
        5: { cellWidth: 14 },   // Género
        6: { cellWidth: 14 },   // Sexo
        7: { cellWidth: 24 },   // Email
        8: { cellWidth: 16 },   // Teléfono
        9: { cellWidth: 28 },   // Dirección
        10: { cellWidth: 18 },  // Localidad
        11: { cellWidth: 16 },  // Provincia
        12: { cellWidth: 10 },  // CP
        13: { cellWidth: 16 },  // O. Social
        14: { cellWidth: 16 },  // Plan
        15: { cellWidth: 16 },  // N° Afiliado
        16: { cellWidth: 14 }   // Estado
      }
    });

    // Save file with format: pacientes_DD-MM-YYYY.pdf
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const fileName = `pacientes_${day}-${month}-${year}.pdf`;
    doc.save(fileName);

    helpers.showAlert('success', 'Exportación exitosa', 'Los pacientes se exportaron a PDF correctamente.');
  } catch {
    helpers.showAlert('error', 'Error al exportar', 'No se pudieron exportar los pacientes a PDF.');
  }
}
