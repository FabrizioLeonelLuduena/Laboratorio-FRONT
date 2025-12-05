import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { BreadcrumbService } from '../../../../shared/services/breadcrumb.service';
import { PageTitleService } from '../../../../shared/services/page-title.service';
import { StudiesManagerComponent } from '../studies/container-studies/estudios-manager.component';

/**
 * Component for the Post-Analytical Management home page.
 * Handles post-analytical processes and result reporting.
 */
@Component({
  selector: 'app-post-analytical-home',
  imports: [StudiesManagerComponent],
  templateUrl: './post-analytical-home.component.html',
  styleUrl: './post-analytical-home.component.css'
})
export class PostAnalyticalHomeComponent implements OnInit {
  private pageTitleService = inject(PageTitleService);
  private breadcrumbService = inject(BreadcrumbService);
  private route = inject(ActivatedRoute);

  /**
   * Sets the page title on component initialization.
   */
  ngOnInit(): void {
    this.pageTitleService.setTitle('Post-Analítica');
    this.breadcrumbService.buildFromRoute(this.route);
  }
}
