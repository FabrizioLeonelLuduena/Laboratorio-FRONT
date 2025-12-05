/** Attention shift shown in the list */
export interface AttentionShift{
  nro:string;
  document:number;
  dateTime:string;
  appointmentId:number;
  boxNumber?:number;
  hasData:boolean;
  hasShift:boolean;
  branchId?:number; // Optional: branch ID for filtering shifts by branch
}

/** DTO response to create an attention from a shift */
export interface AttentionShiftResponseDTO{
  attentionId:number;
  attentionState:string;
  attentionNumber:string;
  branchId:number;
  admissionDate:string;
  patientId:number;
  insurancePlanId:number;
  doctorId:number;
  indications:string;
  authorizationNumber:number;
  isUrgent:boolean;
  analysisIds:number[];
  paymentId:number;
  employeeId:number;
  attentionBox:number;
  observations:string;
  prescriptionFileUrl:string;
}

/** DTO to create an attention from a shift */
export interface AttentionFromShiftRequestDTO{
  appointmentId:number;
  attentionNumber:string;
  deskAttentionBox:number;
}

/** DTO to create an attention blank*/
export interface AttentionBlankRequestDTO{
  branchId:number;
  patientId:number;
  attentionNumber:string;
  deskAttentionBox:number;
}
