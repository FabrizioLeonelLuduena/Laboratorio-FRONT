import { Routes } from '@angular/router';

import { AnalyticalHomeConfigurationComponent } from '../analysis-catalog/presentation/pages/analytical-home/analytical-home.component';
import { NbuVersionManagementComponent } from '../analysis-catalog/presentation/pages/nbu-version-management/nbu-version-management.component';
import { AnalyticalHomeComponent } from '../analytical/analytical-home/analytical-home.component';
import { TemplateManagementComponent } from '../analytical/components/template-management/template-management.component';
import { WorksheetFillComponent } from '../analytical/components/worksheet-fill/worksheet-fill.component';
import { AnalyticalManagementHomeComponent } from '../management-home/analytical-management-home.component';
import { PrintComponent } from '../pre-analytical/components/print/print.component';
import { PreAnalyticalHomeComponent } from '../pre-analytical/pre-analytical-home/pre-analytical-home.component';
import { StatusFollowmentDetailComponent } from '../status-followment/status-followment-detail/status-followment-detail.component';
import { StatusFollowmentHomeComponent } from '../status-followment/status-followment-home/status-followment-home.component';

export const analyticalManagementRoutes: Routes = [
  {
    path: '',
    component: AnalyticalManagementHomeComponent,
    data: { breadcrumb: 'Gestión de Analítica' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pre-analytical' },
      { path: 'configuration', component: AnalyticalHomeConfigurationComponent, data: { breadcrumb: 'Catálogo' } },
      { path: 'configuration/nbu-versions', component: NbuVersionManagementComponent, data: { breadcrumb: 'Versiones NBU' } },
      { path: 'pre-analytical', component: PreAnalyticalHomeComponent, data: { breadcrumb: 'Pre-Analítica' } },
      { path: 'analytical', component: AnalyticalHomeComponent, data: { breadcrumb: 'Analítica' } },
      { path: 'worksheets/templates', component: TemplateManagementComponent, data: { breadcrumb: 'Plantillas' } },
      { path: 'worksheets/templates/edit/:id', component: TemplateManagementComponent, data: { breadcrumb: 'Editar Plantilla' } },
      { path: 'worksheets/templates/:analysisShortCode', component: TemplateManagementComponent, data: { breadcrumb: 'Plantillas por análisis' } },
      { path: 'worksheets/templates/new', component: TemplateManagementComponent, data: { breadcrumb: 'Nueva Plantilla' } },
      { path: 'worksheets/fill/:id', component: WorksheetFillComponent, data: { breadcrumb: 'Completar Planilla' } },
      { path: 'post-analytical', loadChildren: () => import('../post-analytical/routes/post-analytical.routes').then(m => m.POST_ANALYTICAL_ROUTES), data: { breadcrumb: 'Post-Analítica' } },
      { path: 'print', component: PrintComponent, data: { breadcrumb: 'Reimpresión de etiquetas' } },
      { path: 'status-followment', component: StatusFollowmentHomeComponent, data: { breadcrumb: 'Analítica' } },
      { path: 'status-followment/detail/:id', component: StatusFollowmentDetailComponent, data: { breadcrumb: 'Detalle de Protocolo' } }
    ]
  }
];
