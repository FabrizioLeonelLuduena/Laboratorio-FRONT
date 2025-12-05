import { Injectable, inject } from '@angular/core';

import { forkJoin, map, Observable, of } from 'rxjs';

import { InsurerService } from '../../coverage-administration/services/insurer.service';
import { PatientService } from '../../patients/services/PatientService';
import { Analysis } from '../models/analysis.models';
import { TicketDto, AttentionResponse } from '../models/attention.models';

import { AnalysisService } from './analysis.service';
import { BranchService } from './branch.service';

/**
 * Constructor
 */
@Injectable({
  providedIn: 'root'
})
export class TicketBuilderService {
  private readonly patientService = inject(PatientService);
  private readonly branchService = inject(BranchService);
  private readonly insurerService = inject(InsurerService);
  private readonly analysisService = inject(AnalysisService);

  /**
   * Builds a TicketDto from an AttentionResponse by gathering all required information
   * from different services and composing the final ticket object.
   *
   * @param attention The attention response containing base information
   * @returns An Observable of TicketDto with all required information
   */
  buildTicket(attention: AttentionResponse): Observable<TicketDto> {
    // Loading all required data in parallel
    return forkJoin({
      branch: attention.branchId
        ? this.branchService.getBranchById(attention.branchId)
        : of(null),
      patient: attention.patientId
        ? this.patientService.getPatientById(attention.patientId)
        : of(null),
      insurerPlan: attention.insurancePlanId
        ? this.insurerService
          .getCompleteById(attention.insurancePlanId)
          .pipe(map((plan) => plan ?? null))
        : of(null),
      analyses: attention.analysisIds
        ? this.getAnalyses(attention.analysisIds)
        : of([])
    }).pipe(
      map(({ branch, patient, insurerPlan, analyses }) => {
        if (!branch || !patient) {
          throw new Error('Required data not found');
        }

        // Format branch contacts
        const branchContacts = [
          branch.fullAddress,
          branch.contactInfo?.phoneNumber,
          branch.contactInfo?.email
        ].filter(Boolean) as string[];

        // Format patient full name
        const patientFullName = `${patient.lastName}, ${patient.firstName}`;

        // Get patient email from contacts if available
        const patientEmail =
          patient.contacts?.find((c) => c.contactType === 'EMAIL')
            ?.contactValue || '';

        // Normalize analyses to match Analysis model
        const formattedAnalyses: Analysis[] = analyses.map((a) => ({
          ...a,
          description: a.description ?? null
        }));

        // Calculate total price (TODO: real calculation when prices available)
        const totalPrice = 0;

        // Build and return the ticket DTO (fields must match TicketDto - snake_case)
        return {
          branchName: branch.description,
          branchContacts: branchContacts,
          date: new Date().toLocaleDateString('es-AR'),
          patientId: patient.id.toString(),
          patientFullName: patientFullName,
          patientDni: patient.dni,
          patientBirthDate: new Date(patient.birthDate).toLocaleDateString(
            'es-AR'
          ),
          email: patientEmail,
          analyses: formattedAnalyses,
          healthPlan: insurerPlan?.name || 'Particular',
          totalPrice: totalPrice.toFixed(2)
        } as TicketDto;
      })
    );
  }

  /**
   * Retrieves multiple analyses by their IDs in parallel
   * @param analysisIds Array of analysis IDs to retrieve
   * @returns Observable of Analysis array
   */
  private getAnalyses(analysisIds: number[]): Observable<Analysis[]> {
    if (!analysisIds?.length) {
      return of([]);
    }

    // Create an observable for each analysis ID request
    const analysisRequests = analysisIds.map((id) =>
      (this.analysisService as any).getFullAnalysisById(id).pipe(
        map((response) => {
          if (!response) return null;
          return response;
        })
      )
    );

    // Execute all requests in parallel and filter out any nulls
    return forkJoin(analysisRequests).pipe(
      map((results) => results.filter(Boolean) as Analysis[])
    );
  }
}
