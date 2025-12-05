import { Injectable } from '@angular/core';

import { jsPDF } from 'jspdf';

import { UserResponse } from '../models/login-model';

/**
 * PDF Configuration Constants
 * Centralizes all magic numbers and styling values for PDF generation
 */
const PDF_CONFIG = {
  // Font sizes
  TITLE_FONT_SIZE: 18,
  SECTION_FONT_SIZE: 12,
  FIELD_FONT_SIZE: 10,
  DATE_FONT_SIZE: 10,

  // Colors (RGB)
  PRIMARY_COLOR: [0, 140, 138] as [number, number, number],
  BLACK_COLOR: [0, 0, 0] as [number, number, number],

  // Spacing
  SECTION_SPACING: 8,
  FIELD_SPACING: 6,
  SUBSECTION_SPACING: 5,
  TITLE_SPACING: 15,

  // Positions
  LEFT_MARGIN: 14,
  FIELD_VALUE_OFFSET: 60,
  INITIAL_Y: 20,

  // Fonts
  FONT_FAMILY: 'helvetica',
  FONT_BOLD: 'bold',
  FONT_NORMAL: 'normal'
} as const;

/**
 * PDF Text Content
 * User-facing strings in Spanish for end users
 */
const PDF_CONTENT = {
  TITLE: 'Mis Datos Personales',
  GENERATION_DATE_LABEL: 'Fecha de generación',
  SECTIONS: {
    PERSONAL_INFO: 'Información Personal',
    ACCOUNT_STATUS: 'Estado de la Cuenta',
    WORK_INFO: 'Información Laboral',
    DATES: 'Fechas'
  },
  FIELDS: {
    FULL_NAME: 'Nombre completo',
    USERNAME: 'Nombre de usuario',
    DOCUMENT: 'Documento',
    EMAIL: 'Email',
    STATUS: 'Estado',
    EMAIL_VERIFIED: 'Email verificado',
    ROLES: 'Roles',
    BRANCH_ID: 'Sucursal ID'
  },
  VALUES: {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    YES: 'Sí',
    NO: 'No',
    NO_ROLES: 'Sin roles',
    NOT_ASSIGNED: 'No asignada',
    NOT_AVAILABLE: 'No disponible'
  },
  DATE_FIELDS: {
    CREATED: 'Fecha de creación',
    LAST_UPDATED: 'Última actualización'
  },
  FILE_PREFIX: 'mis-datos'
} as const;

/**
 * UserDataPdfService
 *
 * Service responsible for generating PDF documents with user data.
 * Follows Single Responsibility Principle by handling only PDF generation logic.
 *
 * @remarks
 * Extracted from UserSettingsComponent to improve maintainability and testability.
 * Uses configuration constants to avoid magic numbers and facilitate styling changes.
 */
@Injectable({
  providedIn: 'root'
})
export class UserDataPdfService {
  /**
   * Generates a PDF document with user personal data
   *
   * @param user - User data to include in the PDF
   * @returns The generated PDF filename
   */
  generateUserDataPdf(user: UserResponse): string {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y: number = PDF_CONFIG.INITIAL_Y;

    // Title
    y = this.addTitle(doc, pageWidth, y);

    // Generation date
    y = this.addGenerationDate(doc, pageWidth, y);

    // Section: Personal Info
    y = this.addPersonalInfoSection(doc, user, y);

    // Section: Account Status
    y = this.addAccountStatusSection(doc, user, y);

    // Section: Work Info
    y = this.addWorkInfoSection(doc, user, y);

    // Section: Dates
    this.addDatesSection(doc, user, y);

    // Save and return filename
    const fileName = this.generateFileName();
    doc.save(fileName);

    return fileName;
  }

  /**
   * Adds the document title
   */
  private addTitle(doc: jsPDF, pageWidth: number, y: number): number {
    doc.setFontSize(PDF_CONFIG.TITLE_FONT_SIZE);
    doc.setFont(PDF_CONFIG.FONT_FAMILY, PDF_CONFIG.FONT_BOLD);
    doc.text(PDF_CONTENT.TITLE, pageWidth / 2, y, { align: 'center' });
    return y + PDF_CONFIG.TITLE_SPACING;
  }

  /**
   * Adds the generation date
   */
  private addGenerationDate(doc: jsPDF, pageWidth: number, y: number): number {
    doc.setFontSize(PDF_CONFIG.DATE_FONT_SIZE);
    doc.setFont(PDF_CONFIG.FONT_FAMILY, PDF_CONFIG.FONT_NORMAL);
    const dateText = `${
      PDF_CONTENT.GENERATION_DATE_LABEL
    }: ${new Date().toLocaleDateString('es-AR')}`;
    doc.text(dateText, pageWidth / 2, y, { align: 'center' });
    return y + PDF_CONFIG.TITLE_SPACING;
  }

  /**
   * Adds the Personal Information section
   */
  private addPersonalInfoSection(
    doc: jsPDF,
    user: UserResponse,
    y: number
  ): number {
    y = this.addSection(doc, PDF_CONTENT.SECTIONS.PERSONAL_INFO, y);
    y = this.addField(
      doc,
      PDF_CONTENT.FIELDS.FULL_NAME,
      `${user.firstName} ${user.lastName}`,
      y
    );
    y = this.addField(doc, PDF_CONTENT.FIELDS.USERNAME, user.username, y);
    y = this.addField(doc, PDF_CONTENT.FIELDS.DOCUMENT, user.document, y);
    y = this.addField(doc, PDF_CONTENT.FIELDS.EMAIL, user.email, y);
    return y + PDF_CONFIG.SUBSECTION_SPACING;
  }

  /**
   * Adds the Account Status section
   */
  private addAccountStatusSection(
    doc: jsPDF,
    user: UserResponse,
    y: number
  ): number {
    y = this.addSection(doc, PDF_CONTENT.SECTIONS.ACCOUNT_STATUS, y);
    y = this.addField(
      doc,
      PDF_CONTENT.FIELDS.STATUS,
      user.isActive ? PDF_CONTENT.VALUES.ACTIVE : PDF_CONTENT.VALUES.INACTIVE,
      y
    );
    y = this.addField(
      doc,
      PDF_CONTENT.FIELDS.EMAIL_VERIFIED,
      user.isEmailVerified ? PDF_CONTENT.VALUES.YES : PDF_CONTENT.VALUES.NO,
      y
    );
    return y + PDF_CONFIG.SUBSECTION_SPACING;
  }

  /**
   * Adds the Work Information section
   */
  private addWorkInfoSection(
    doc: jsPDF,
    user: UserResponse,
    y: number
  ): number {
    y = this.addSection(doc, PDF_CONTENT.SECTIONS.WORK_INFO, y);
    const rolesText =
      user.roles.map((r) => r.name).join(', ') || PDF_CONTENT.VALUES.NO_ROLES;
    y = this.addField(doc, PDF_CONTENT.FIELDS.ROLES, rolesText, y);
    y = this.addField(
      doc,
      PDF_CONTENT.FIELDS.BRANCH_ID,
      user.branchId?.toString() || PDF_CONTENT.VALUES.NOT_ASSIGNED,
      y
    );
    return y + PDF_CONFIG.SUBSECTION_SPACING;
  }

  /**
   * Adds the Dates section
   */
  private addDatesSection(doc: jsPDF, user: UserResponse, y: number): number {
    y = this.addSection(doc, PDF_CONTENT.SECTIONS.DATES, y);
    y = this.addField(
      doc,
      PDF_CONTENT.DATE_FIELDS.CREATED,
      this.formatDate(user.createdDatetime),
      y
    );
    y = this.addField(
      doc,
      PDF_CONTENT.DATE_FIELDS.LAST_UPDATED,
      this.formatDate(user.lastUpdatedDatetime),
      y
    );
    return y;
  }

  /**
   * Adds a section title to the PDF
   */
  private addSection(doc: jsPDF, title: string, y: number): number {
    doc.setFontSize(PDF_CONFIG.SECTION_FONT_SIZE);
    doc.setFont(PDF_CONFIG.FONT_FAMILY, PDF_CONFIG.FONT_BOLD);
    doc.setTextColor(...PDF_CONFIG.PRIMARY_COLOR);
    doc.text(title, PDF_CONFIG.LEFT_MARGIN, y);
    doc.setTextColor(...PDF_CONFIG.BLACK_COLOR);
    return y + PDF_CONFIG.SECTION_SPACING;
  }

  /**
   * Adds a field (label: value) to the PDF
   */
  private addField(
    doc: jsPDF,
    label: string,
    value: string,
    y: number
  ): number {
    doc.setFontSize(PDF_CONFIG.FIELD_FONT_SIZE);
    doc.setFont(PDF_CONFIG.FONT_FAMILY, PDF_CONFIG.FONT_BOLD);
    doc.text(`${label}:`, PDF_CONFIG.LEFT_MARGIN, y);
    doc.setFont(PDF_CONFIG.FONT_FAMILY, PDF_CONFIG.FONT_NORMAL);
    doc.text(value, PDF_CONFIG.FIELD_VALUE_OFFSET, y);
    return y + PDF_CONFIG.FIELD_SPACING;
  }

  /**
   * Formats a date for display in the PDF
   */
  private formatDate(date: Date | string | undefined | null): string {
    if (!date) return PDF_CONTENT.VALUES.NOT_AVAILABLE;

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return PDF_CONTENT.VALUES.NOT_AVAILABLE;

    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Generates the PDF filename with current date
   */
  private generateFileName(): string {
    const dateStr = new Date().toISOString().split('T')[0];
    return `${PDF_CONTENT.FILE_PREFIX}_${dateStr}.pdf`;
  }
}
