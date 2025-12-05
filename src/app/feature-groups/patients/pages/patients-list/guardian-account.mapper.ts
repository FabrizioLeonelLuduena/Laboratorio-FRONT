/**
 * Mapper to extract guardian account information from patient data.
 */
import { GuardianRequestDto, PatientResponse } from '../../models/PatientModel';

/**
 * Normalized guardian account data required by the password reset flow.
 */
export interface GuardianAccountInfo {
  email: string;
  userId: number | null;
  document?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roleIds?: number[];
  branchId?: number | null;
}

/**
 * Types to handle flexible number representations from the API.
 */
type NumberLike = number | string;
/**
 * Array of NumberLike values.
 */
type NumberLikeArray = NumberLike | NumberLike[];

/**
 * Extends the Guardian DTO with additional metadata returned by the API.
 * This keeps the mapper aligned with the backend response without loosening the type system.
 */
type GuardianApiResponse = GuardianRequestDto & {
  id?: NumberLike | null;
  userId?: NumberLike | null;
  user_id?: NumberLike | null;
  username?: string | null;
  userName?: string | null;
  document?: string | number | null;
  first_name?: string | null;
  last_name?: string | null;
  is_owner?: boolean;
  roleIds?: NumberLikeArray;
  role_ids?: NumberLikeArray;
  roleId?: NumberLikeArray;
  role_id?: NumberLikeArray;
  roles?: NumberLikeArray;
  branchId?: NumberLike | null;
  branch_id?: NumberLike | null;
  contactValue?: string | null;
  contacts?:
    | string
    | Array<{
        contactType?: string;
        contact_value?: string;
        contactValue?: string;
      }>;
};

const normalizeNumber = (value: NumberLike | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toNumberArray = (value: NumberLikeArray | undefined): number[] | undefined => {
  if (value === undefined || value === null) return undefined;

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => normalizeNumber(item))
      .filter((item): item is number => item !== null);
    return normalized.length ? normalized : undefined;
  }

  const parsed = normalizeNumber(value);
  return parsed === null ? undefined : [parsed];
};

const pickPrimaryGuardian = (guardians: GuardianApiResponse[]): GuardianApiResponse | null => {
  if (!guardians.length) return null;

  return (
    guardians.find((guardian) => guardian.isOwner === true || guardian.is_owner === true) ??
    guardians[0] ??
    null
  );
};

const extractGuardianEmail = (guardian: GuardianApiResponse): string | null => {
  const fallbackContacts = guardian.contacts;
  const candidates: Array<string | null | undefined> = [
    guardian.email,
    guardian.contactValue
  ];

  if (typeof fallbackContacts === 'string') {
    candidates.push(fallbackContacts);
  } else if (Array.isArray(fallbackContacts)) {
    const firstEmail = fallbackContacts.find(
      (contact) => contact?.contactType === 'EMAIL' && contact.contactValue
    )?.contactValue;
    const firstValue = firstEmail ?? fallbackContacts.find((contact) => contact?.contactValue)?.contactValue;
    candidates.push(firstValue ?? fallbackContacts.find((contact) => contact?.contact_value)?.contact_value);
  }

  const chosen = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.trim().length > 0
  );

  return chosen ? chosen.trim() : null;
};

/**
 * Maps the guardian array from the backend response into a normalized guardian account.
 */
export const extractGuardianAccount = (
  patient: PatientResponse | null | undefined
): GuardianAccountInfo | null => {
  if (!patient || !Array.isArray(patient.guardians) || !patient.guardians.length) return null;

  const guardians = patient.guardians as GuardianApiResponse[];
  const guardian = pickPrimaryGuardian(guardians);
  if (!guardian) return null;

  const email = extractGuardianEmail(guardian);
  if (!email) return null;

  const rawUserId = guardian.userId ?? guardian.user_id ?? guardian.id ?? null;
  const userId = normalizeNumber(rawUserId);
  const roleIds = toNumberArray(
    guardian.roleIds ??
      guardian.role_ids ??
      guardian.roleId ??
      guardian.role_id ??
      guardian.roles
  );
  const branchId = normalizeNumber(guardian.branchId ?? guardian.branch_id ?? null);

  return {
    email,
    userId,
    document: guardian.document ? String(guardian.document) : undefined,
    firstName: guardian.firstName ?? guardian.first_name ?? undefined,
    lastName: guardian.lastName ?? guardian.last_name ?? undefined,
    username: guardian.username ?? guardian.userName ?? (guardian.document ? String(guardian.document) : undefined),
    roleIds,
    branchId
  };
};
