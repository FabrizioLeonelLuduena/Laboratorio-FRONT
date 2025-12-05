/**
 * Shared patient data helpers used across multiple components.
 * Keep these generic and free of framework concerns so they can be unit tested easily.
 */

/**
 * Map backend patient status enum to a badge token used by `GenericBadgeComponent`.
 *
 * Returned tokens: 'activo' | 'inactivo' | 'pendiente' | 'minimo' | 'completo' | 'verificado'
 * The mapping is case-insensitive.
 *
 * @param status - Backend status (e.g. 'MIN', 'COMPLETE', 'VERIFIED', 'DEACTIVATED')
 * @returns Badge token to apply visual styling in the UI
 */
export function mapPatientStatusToBadge(status?: string): 'activo' | 'inactivo' | 'pendiente' | 'minimo' | 'completo' | 'verificado' {
  const s = String(status ?? '').toUpperCase();
  switch (s) {
  case 'MIN':
    return 'minimo';
  case 'COMPLETE':
    return 'completo';
  case 'VERIFIED':
    return 'verificado';
  case 'DEACTIVATED':
    return 'inactivo';
  default:
    return 'pendiente';
  }
}

/**
 * Optional human-readable labels (uppercase) for patient verification status.
 * Keys are backend enum values.
 */
export const statusLabel: Record<string, string> = {
  MIN: 'MÍNIMO',
  COMPLETE: 'COMPLETO',
  VERIFIED: 'VERIFICADO',
  DEACTIVATED: 'DESACTIVADO'
};

// ---- Additional helpers moved from feature module's patient-data-helpers ----

/**
 * Translate gender/sex enum values from backend into Spanish labels.
 *
 * Examples: 'MALE' -> 'Masculino', 'FEMALE' -> 'Femenino'
 *
 * @param value - Gender value from backend
 * @returns Translated label or the original value when unknown
 */
export function translateGender(value: string | null | undefined): string | null {
  if (!value) return null;

  const translations: Record<string, string> = {
    MALE: 'Masculino',
    FEMALE: 'Femenino',
    OTHER: 'Otro'
  };

  const upperValue = String(value).toUpperCase();
  return translations[upperValue] || value;
}

/**
 * Calculate a detailed age object (years + human label) from a birth date.
 *
 * Supports input formats: ISO (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`),
 * DD/MM/YYYY and DD-MM-YYYY. Returns `years: null` when date is invalid
 * or in the future.
 *
 * @param birthDate - Birth date as string or `Date`.
 * @returns Object with `years` (number|null) and `label` (string|null)
 */
export function computeAgeDetail(
  birthDate: string | Date | null | undefined
): { years: number | null; label: string | null } {
  if (!birthDate) return { years: null, label: null };

  let date: Date;
  if (typeof birthDate === 'string') {
    const iso = birthDate.split('T')[0];
    if (iso.includes('/')) {
      const parts = iso.split('/').map((p) => Number(p));
      if (parts.length === 3) {
        const [day, month, year] = parts;
        date = new Date(year, month - 1, day);
      } else {
        return { years: null, label: null };
      }
    } else {
      const parts = iso.split('-').map((p) => Number(p));
      let year, month, day;
      if (parts[0] > 31) {
        [year, month, day] = parts;
      } else if (parts[2] > 31) {
        [day, month, year] = parts;
      } else {
        if (parts[0] >= 1900) {
          [year, month, day] = parts;
        } else {
          [day, month, year] = parts;
        }
      }
      if (!year || !month || !day) return { years: null, label: null };
      date = new Date(year, month - 1, day);
    }
  } else if (birthDate instanceof Date) {
    date = birthDate;
  } else {
    return { years: null, label: null };
  }

  if (Number.isNaN(date.getTime())) return { years: null, label: null };

  const today = new Date();
  if (today < date) return { years: null, label: null };

  let years = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const dayDiff = today.getDate() - date.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--;

  if (years >= 1) {
    const label = `${years} ${years === 1 ? 'año' : 'años'}`;
    return { years, label };
  }

  const totalMonths = (today.getFullYear() - date.getFullYear()) * 12 + (today.getMonth() - date.getMonth());
  const days = Math.floor((today.getTime() - new Date(date.getFullYear(), date.getMonth() + totalMonths, date.getDate()).getTime()) / (1000 * 60 * 60 * 24));

  if (totalMonths > 0) {
    const label = `${totalMonths} meses ${days > 0 ? `y ${days} días` : ''}`.trim();
    return { years: 0, label };
  }

  const label = `${days} ${days === 1 ? 'día' : 'días'}`;
  return { years: 0, label };
}

/**
 * Convenience wrapper that returns only the human-readable age label.
 *
 * @param birthDate - Birth date as string or `Date`.
 * @returns Localized age label (e.g. '3 años', '5 meses y 2 días') or null
 */
export function calculateAge(birthDate: string | Date | null | undefined): string | null {
  if (!birthDate) return null;
  try {
    const ageDetail = computeAgeDetail(birthDate);
    return ageDetail.label;
  } catch {
    return null;
  }
}

/**
 * Format a birth date into a localized short date string (es-AR).
 *
 * Accepts the same input formats as `computeAgeDetail` and returns `null`
 * when the input cannot be parsed.
 *
 * @param birthDate - Birth date as string or `Date`
 * @returns Localized date (e.g. '29/11/2003') or null
 */
export function formatBirthDate(birthDate: string | Date | null | undefined): string | null {
  if (!birthDate) return null;
  try {
    let date: Date;
    if (typeof birthDate === 'string') {
      const iso = birthDate.split('T')[0];
      if (iso.includes('/')) {
        const parts = iso.split('/').map((p) => Number(p));
        const [day, month, year] = parts;
        date = new Date(year, month - 1, day);
      } else {
        const parts = iso.split('-').map((p) => Number(p));
        let year, month, day;
        if (parts[0] > 31) {
          [year, month, day] = parts;
        } else if (parts[2] > 31) {
          [day, month, year] = parts;
        } else {
          if (parts[0] >= 1900) {
            [year, month, day] = parts;
          } else {
            [day, month, year] = parts;
          }
        }
        date = new Date(year, month - 1, day);
      }
    } else if (birthDate instanceof Date) {
      date = birthDate;
    } else {
      return null;
    }
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('es-AR');
  } catch {
    return null;
  }
}

/**
 * Return the primary address object for a patient.
 *
 * The function prefers a singular `address` field; if not present
 * it falls back to the first address marked with `isPrimary` or the
 * first element of the `addresses` array.
 *
 * @param patient - Patient object that may contain `address` or `addresses`
 * @returns Address object or null
 */
export function extractPrimaryAddress(patient: any): any | null {
  if (!patient) return null;
  if (patient.address) return patient.address;
  const addresses = patient.addresses;
  if (Array.isArray(addresses) && addresses.length > 0) {
    const primary = addresses.find((a: any) => a?.isPrimary) ?? addresses[0];
    return primary;
  }
  return null;
}

/**
 * Format an address object into a single-line human readable string.
 *
 * Example: `Av. Libertad Nº 123 Piso 3 Depto A`.
 *
 * @param address - Address object with fields like `street`, `streetNumber`, `floor`, `apartment`
 * @returns Formatted address or null when empty
 */
export function formatAddress(address: any): string | null {
  if (!address) return null;
  const parts: any[] = [];
  if (address.street) parts.push(address.street);
  if (address.streetNumber) parts.push(address.streetNumber);
  if (address.number) parts.push(address.number);
  if (address.floor) parts.push(`Piso ${address.floor}`);
  if (address.apartment) parts.push(`Depto ${address.apartment}`);
  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Extract city/locality from patient's primary address.
 *
 * @param patient - Patient object
 * @returns City/locality string or null
 */
export function extractLocality(patient: any): string | null {
  const address = extractPrimaryAddress(patient);
  if (!address) return null;
  return address.city || address.locality || null;
}

/**
 * Extract province from patient's primary address.
 *
 * @param patient - Patient object
 * @returns Province string or null
 */
export function extractProvince(patient: any): string | null {
  const address = extractPrimaryAddress(patient);
  if (!address) return null;
  return address.province || null;
}

/**
 * Extract the primary medical coverage (plan name or insurer) for display.
 *
 * The function checks several common fields used across APIs and
 * falls back to the first item in the `coverages` array.
 *
 * @param patient - Patient object
 * @returns Coverage string or null
 */
export function extractPrimaryCoverage(patient: any): string | null {
  if (!patient) return null;
  const direct =
    patient.primaryCoverage ??
    patient.primaryCoverageName ??
    patient.coverage ??
    patient.coverageName ??
    patient.obraSocial ??
    patient.insurance;
  if (direct) return String(direct);
  const coverages = patient.coverages;
  if (Array.isArray(coverages) && coverages.length > 0) {
    const primary = coverages.find((c: any) => c?.isPrimary) ?? coverages[0];
    if (primary?.planName) return String(primary.planName);
    if (primary?.planAcronym) return String(primary.planAcronym);
    if (primary?.insurerName) return String(primary.insurerName);
    if (primary?.insurerAcronym) return String(primary.insurerAcronym);
    if (primary?.coverage) return String(primary.coverage);
    if (primary?.name) return String(primary.name);
    if (primary?.planId) return `Plan ID: ${primary.planId}`;
  }
  return null;
}

/**
 * Retrieve the patient's phone number.
 *
 * Prefers a direct `phone` field, then searches `contacts` for PHONE/WHATSAPP
 * and falls back to the first contact value.
 *
 * @param patient - Patient object
 * @returns Phone string or null
 */
export function extractPhone(patient: any): string | null {
  if (!patient) return null;
  if (patient.phone) return String(patient.phone);
  const contacts = patient.contacts;
  if (Array.isArray(contacts) && contacts.length > 0) {
    const phoneContact = contacts.find((c: any) => c?.contactType === 'PHONE' || c?.contactType === 'WHATSAPP');
    if (phoneContact?.contactValue) return String(phoneContact.contactValue);
    const firstContact = contacts.find((c: any) => c?.contactValue);
    if (firstContact?.contactValue) return String(firstContact.contactValue);
  }
  return null;
}

/**
 * Extract the insurer/obra social name for a patient.
 *
 * Tries direct fields first and then falls back to the primary coverage entry.
 *
 * @param patient - Patient object
 * @returns Insurer name or null
 */
export function extractInsurerName(patient: any): string | null {
  if (!patient) return null;
  let insurerName: string | null = null;
  if (patient.insurerName) insurerName = String(patient.insurerName);
  else if (patient.insurerAcronym) insurerName = String(patient.insurerAcronym);
  else {
    const coverages = patient.coverages;
    if (Array.isArray(coverages) && coverages.length > 0) {
      const primary = coverages.find((c: any) => c?.isPrimary) ?? coverages[0];
      if (primary?.insurerName) insurerName = String(primary.insurerName);
      else if (primary?.insurerAcronym) insurerName = String(primary.insurerAcronym);
      else if (primary?.coverage) insurerName = String(primary.coverage);
    }
  }
  return insurerName ? `${insurerName}` : null;
}

/**
 * Extract the patient's email address from direct field or contacts.
 *
 * @param patient - Patient object
 * @returns Email string or null
 */
export function extractEmail(patient: any): string | null {
  if (!patient) return null;
  if (patient.email) return String(patient.email);
  const contacts = patient.contacts;
  if (Array.isArray(contacts) && contacts.length > 0) {
    const emailContact = contacts.find((c: any) => c?.contactType === 'EMAIL');
    if (emailContact?.contactValue) return String(emailContact.contactValue);
  }
  return null;
}

/**
 * Extract a generic location string for the patient (city/locality/province).
 *
 * @param patient - Patient object
 * @returns Location string or null
 */
export function extractLocation(patient: any): string | null {
  if (!patient) return null;
  if (patient.location) return String(patient.location);
  if (patient.city) return String(patient.city);
  const address = patient.address;
  if (address) {
    if (address.city) return String(address.city);
    if (address.locality) return String(address.locality);
    if (address.province) return String(address.province);
  }
  return null;
}

/**
 * Extract the plan name from the primary coverage entry.
 *
 * @param patient - Patient object
 * @returns Plan name or null
 */
export function extractPlanName(patient: any): string | null {
  if (!patient) return null;
  const coverages = patient.coverages;
  if (Array.isArray(coverages) && coverages.length > 0) {
    const primary = coverages.find((c: any) => c?.isPrimary) ?? coverages[0];
    if (primary?.planName) return String(primary.planName);
    if (primary?.plan) return String(primary.plan);
  }
  return null;
}

/**
 * Extract the affiliate/member number from the primary coverage.
 *
 * @param patient - Patient object
 * @returns Affiliate number or null
 */
export function extractAffiliateNumber(patient: any): string | null {
  if (!patient) return null;
  const coverages = patient.coverages;
  if (Array.isArray(coverages) && coverages.length > 0) {
    const primary = coverages.find((c: any) => c?.isPrimary) ?? coverages[0];
    if (primary?.affiliateNumber) return String(primary.affiliateNumber);
    if (primary?.memberNumber) return String(primary.memberNumber);
  }
  return null;
}
