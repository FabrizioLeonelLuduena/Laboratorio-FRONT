import { Routes } from '@angular/router';

import { BranchAreasEditComponent } from '../branches-components/branch-areas-edit/branch-areas-edit.component';
import { BranchCardDetailComponent } from '../branches-components/branch-card-detail/branch-card-detail.component';
import { BranchesHomeComponent } from '../branches-components/branches-home/branches-home.component';
import { CreateBranchComponent } from '../branches-components/create-branch/create-branch.component';
import { UpdateBranchComponent } from '../branches-components/update-branch/update-branch.component';
import { BranchesDashboardComponent } from '../branches-dashboard/branches-dashboard.component';
import { AnalysisListComponent } from '../care-home/attention-list/analysis-list/analysis-list.component';
import { AttentionListComponent } from '../care-home/attention-list/attention-list.component';
import { AttentionWorkflowComponent } from '../care-home/attention-list/attention-workflow/attention-workflow.component';
import { AttentionShiftComponent } from '../care-home/attention-shift/attention-shift.component';
import { CareHomeComponent } from '../care-home/care-home.component';
import { ExtractionQueueComponent } from '../care-home/extraction/extraction-queue/extraction-queue.component';
import { DoctorHomeComponent } from '../doctor-home/doctor-home.component';
import { EmployeeHomeComponent } from '../employee-home/employee-home.component';
import { CareReportingMainComponent } from '../reporting/components/care-reporting-main/care-reporting-main.component';
//import {BillingWizardComponent} from '../../billing-collections/billing-wizard/wizard/billing-wizard.component';

export const careManagementRoutes: Routes =
  [
    { path: '', pathMatch: 'full', redirectTo: 'care-home' },
    { path: 'care-home', component: CareHomeComponent },
    { path: 'reporting', component: CareReportingMainComponent },
    { path: 'attentions', component: AttentionShiftComponent },
    { path: 'attentions-list', component: AttentionListComponent },
    { path: 'attentions/workflow', component: AttentionWorkflowComponent },
    { path: 'attentions/:id', component: AttentionWorkflowComponent },
    { path: 'branches', component: BranchesHomeComponent },
    { path: 'branches-dashboard', component: BranchesDashboardComponent },
    { path: 'create-branch', component: CreateBranchComponent },
    { path: 'branches/detail/:id', component: BranchCardDetailComponent },
    { path: 'update-branch/:id', component: UpdateBranchComponent },
    { path: 'branches/edit-areas/:id', component: BranchAreasEditComponent },
    { path: 'doctors', component: DoctorHomeComponent },
    { path: 'employees', component: EmployeeHomeComponent },
    { path: 'analysis', component: AnalysisListComponent },
    { path: 'extraction', component: ExtractionQueueComponent },
    {
      path: 'coverage-administration',
      loadChildren: () =>
        import('../../coverage-administration/routes/coverage-administration.routes')
          .then((m) => m.coverageAdministrationRoutes)
    }
  ];
