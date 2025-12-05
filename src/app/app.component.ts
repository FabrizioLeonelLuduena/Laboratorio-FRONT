import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { environment } from '../environments/environment';

import { MockDataService } from './core/services/mock-data.service';

/**
 * Root component of the application.
 * Serves as the main container for the entire application.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private mockDataService = inject(MockDataService);

  /**
   * Initialize component and load mock data if enabled
   */
  ngOnInit(): void {
    // Cargar datos mock si está activado
    if (environment.useMockData) {
      console.log('🔧 Mock data mode enabled - loading mock data...');
      this.mockDataService.loadMockData()
        .then(() => {
          console.log('✅ Mock data loaded successfully');
        })
        .catch((error) => {
          console.error('❌ Error loading mock data:', error);
        });
    }
  }
}
