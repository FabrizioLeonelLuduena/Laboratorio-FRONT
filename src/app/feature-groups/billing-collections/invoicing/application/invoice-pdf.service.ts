import { Injectable } from '@angular/core';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { BillingItem } from '../domain/billing-item.model';
import { Billing } from '../domain/billing.model';
import { PAYMENT_METHOD_LABELS } from '../domain/payment-method.enum';

/** jsPDF type extended with autoTable metadata. */
interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

/**
 * Service for generating PDF invoices using jsPDF
 */
@Injectable({
  providedIn: 'root'
})
export class InvoicePdfService {
  private readonly COLORS = {
    primary: '#14b8a6',
    primaryDark: '#0d9488',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    black: '#1f2937'
  };

  /**
   * Constructor for InvoicePdfService
   */
  constructor() {}

  /**
   * Generate PDF for a billing/invoice
   * @param billing The billing data to generate PDF for
   * @returns jsPDF instance
   */
  generateInvoicePDF(billing: Billing): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    yPos = this.addHeader(doc, pageWidth, yPos);

    // Invoice Info
    yPos = this.addInvoiceInfo(doc, billing, yPos);

    // Customer Info
    yPos = this.addCustomerInfo(doc, billing, yPos);

    // Items Table
    yPos = this.addItemsTable(doc, billing.items, yPos);

    // Totals Section
    yPos = this.addTotalsSection(doc, billing, pageWidth, yPos);

    // Payment Methods
    if (billing.paymentMethods && billing.paymentMethods.length > 0) {
      this.addPaymentMethods(doc, billing, yPos);
    }

    // Footer
    this.addFooter(doc);

    return doc;
  }

  /**
   * Generate and download PDF
   * @param billing The billing data
   * @param filename Optional filename
   */
  downloadInvoicePDF(billing: Billing, filename?: string): void {
    const doc = this.generateInvoicePDF(billing);
    const pdfFilename = filename || `Factura_${billing.invoiceNumber || 'draft'}_${Date.now()}.pdf`;
    doc.save(pdfFilename);
  }

  /**
   * Generate and open PDF in new tab
   * @param billing The billing data
   */
  previewInvoicePDF(billing: Billing): void {
    const doc = this.generateInvoicePDF(billing);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Add header with company logo/name
   */
  private addHeader(doc: jsPDF, pageWidth: number, yPos: number): number {
    // Company name/logo
    doc.setFontSize(24);
    doc.setTextColor(this.COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Factura', pageWidth / 2, yPos, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(this.COLORS.gray);
    doc.setFont('helvetica', 'normal');
    doc.text('Laboratorio Castillo Chidiak', pageWidth / 2, yPos + 7, { align: 'center' });

    // Line separator
    doc.setDrawColor(this.COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 12, pageWidth - 20, yPos + 12);

    return yPos + 20;
  }

  /**
   * Add invoice information section
   */
  private addInvoiceInfo(doc: jsPDF, billing: Billing, yPos: number): number {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.black);

    // Invoice number
    if (billing.invoiceNumber) {
      doc.text(`Factura N°: ${billing.invoiceNumber}`, 20, yPos);
    } else {
      doc.text('Factura: BORRADOR', 20, yPos);
    }

    // Invoice date
    doc.setFont('helvetica', 'normal');
    const invoiceDate = new Date(billing.invoiceDate);
    doc.text(`Fecha: ${invoiceDate.toLocaleDateString('en-US')}`, 20, yPos + 6);

    // Invoice type
    doc.text(`Tipo: ${billing.invoiceType || 'B'}`, 20, yPos + 12);

    return yPos + 20;
  }

  /**
   * Add customer information section
   */
  private addCustomerInfo(doc: jsPDF, billing: Billing, yPos: number): number {
    // Section title
    doc.setFillColor(this.COLORS.lightGray);
    doc.rect(20, yPos, 170, 8, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.black);
    doc.text('DATOS DEL CLIENTE', 22, yPos + 5);

    yPos += 12;

    // Customer details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text(`Cliente: ${billing.customerName || 'N/A'}`, 22, yPos);
    yPos += 6;

    if (billing.customerIdentification) {
      doc.text(`Identificación fiscal: ${billing.customerIdentification}`, 22, yPos);
      yPos += 6;
    }

    if (billing.customerAddress) {
      doc.text(`Domicilio comercial: ${billing.customerAddress}`, 22, yPos);
      yPos += 6;
    }

    if (billing.observations) {
      doc.text(`Observaciones: ${billing.observations}`, 22, yPos);
      yPos += 6;
    }

    return yPos + 5;
  }

  /**
   * Add items table
   */
  private addItemsTable(doc: jsPDF, items: BillingItem[], yPos: number): number {
    const tableData = items.map(item => [
      item.description || '',
      item.quantity?.toString() || '0',
      `$${(item.unitPrice || 0).toFixed(2)}`,
      `${(item.discountPercentage || 0).toFixed(1)}%`,
      `${(item.vatRate || 0).toFixed(1)}%`,
      `$${(item.totalAmount || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Descripción', 'Cant.', 'Precio unitario', 'Descuento', 'IVA', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [20, 184, 166],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [31, 41, 55]
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 70 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 25 }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 20, right: 20 }
    });

    const finalY = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? yPos + 40;
    return finalY + 10;
  }

  /**
   * Add totals section
   */
  private addTotalsSection(doc: jsPDF, billing: Billing, pageWidth: number, yPos: number): number {
    const rightX = pageWidth - 20;
    const labelX = rightX - 60;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.COLORS.gray);

    // Subtotal
    doc.text('Subtotal:', labelX, yPos, { align: 'right' });
    doc.text(`$${(billing.subtotalAmount || 0).toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 6;

    // Discount
    if (billing.discountAmount && billing.discountAmount > 0) {
      doc.text('Descuento:', labelX, yPos, { align: 'right' });
      doc.text(`-$${billing.discountAmount.toFixed(2)}`, rightX, yPos, { align: 'right' });
      yPos += 6;
    }

    // Taxable amount
    doc.text('Base imponible:', labelX, yPos, { align: 'right' });
    doc.text(`$${(billing.taxableAmount || 0).toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 6;

    // VAT
    doc.text('IVA:', labelX, yPos, { align: 'right' });
    doc.text(`$${(billing.vatAmount || 0).toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 6;

    doc.setDrawColor(this.COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(labelX - 5, yPos, rightX, yPos);
    yPos += 5;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.primary);
    doc.text('TOTAL:', labelX, yPos, { align: 'right' });
    doc.text(`$${(billing.totalAmount || 0).toFixed(2)}`, rightX, yPos, { align: 'right' });

    return yPos + 10;
  }

  /**
   * Add payment methods section
   */
  private addPaymentMethods(doc: jsPDF, billing: Billing, yPos: number): number {
    doc.setFillColor(this.COLORS.lightGray);
    doc.rect(20, yPos, 170, 8, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.black);
    doc.text('MEDIOS DE PAGO', 22, yPos + 5);

    yPos += 12;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    billing.paymentMethods?.forEach(payment => {
      const methodLabel = PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod;
      const amountText = `$${(payment.amount || 0).toFixed(2)}`;

      doc.text(`• ${methodLabel}:`, 22, yPos);
      doc.text(amountText, 190, yPos, { align: 'right' });
      yPos += 5;
    });

    return yPos + 5;
  }

  /**
   * Add footer with page numbers and generation info
   */
  private addFooter(doc: jsPDF): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(this.COLORS.gray);

    const now = new Date();
    const generatedText = `Generado el ${now.toLocaleDateString('en-US')} a las ${now.toLocaleTimeString('en-US')}`;
    doc.text(generatedText, pageWidth / 2, pageHeight - 10, { align: 'center' });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }
  }
}
