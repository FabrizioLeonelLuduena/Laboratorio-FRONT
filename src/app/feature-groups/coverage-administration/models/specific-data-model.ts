/**
 * SpecificData interface
 */
export interface SpecificDataDTO {
  socialHealth: SocialHealthDataDTO | null;
  selfPay: SelfPayDataDTO | null;
  privateHealth: PrivateHealthDataDTO | null;
}

/**
 * SocialHealth specific information
 */
export interface SocialHealthDataDTO{
  cuit:string;
}

/**
 * PrivateHealth specific information
 */
export interface PrivateHealthDataDTO{
  cuit:string;
  copay_policy:string;
}

/**
 * SelfPay specific information
 */
export interface SelfPayDataDTO{
  accepted_payment_methods:string;
}
