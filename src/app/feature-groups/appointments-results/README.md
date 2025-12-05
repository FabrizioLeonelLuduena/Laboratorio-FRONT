# Appointments Results Module

## Overview

This module implements a complete appointment configuration and availability management system for Angular 20. It provides a comprehensive solution for managing appointment templates, querying availability, and booking appointments through a RESTful API.

## Features

- **🔧 Configuration Management**: Create, update, and manage appointment configuration templates
- **📅 Availability Search**: Query available appointment slots with flexible date ranges
- **🔄 Recurring Rules**: Support for both specific date and recurring appointment configurations
- **🏢 Multi-Branch Support**: Branch-specific appointment management
- **✅ Form Validation**: Comprehensive client-side validation with custom validators
- **📱 Responsive Design**: Mobile-friendly interface with progressive enhancement
- **🔔 Notifications**: Built-in notification system for user feedback
- **📊 Real-time State**: Reactive state management with Angular signals
- **🎨 Modern UI**: Clean, accessible interface (Material Design ready)

## Architecture

### Components
- `AppointmentsHomeComponent`: Main component with tabbed interface for configuration and availability

### Services
- `AppointmentConfigurationService`: HTTP client for API operations
- `NotificationService`: User notification management
- `AppointmentValidators`: Custom form validation logic

### Models
- `AppointmentConfiguration`: Complete configuration entity
- `CreateAppointmentConfiguration`: DTO for creating configurations
- `UpdateAppointmentConfiguration`: DTO for updating configurations
- `AvailableAppointment`: Available appointment slot information

### Pipes
- `AppointmentTimePipe`: Format time strings (HH:mm:ss → HH:mm)
- `AppointmentDatePipe`: Format date strings with Spanish localization

## API Integration

This module integrates with the `/api/v1/appointment-configurations` endpoints:

### Configuration Endpoints
- `POST /appointment-configurations` - Create new configuration
- `PUT /appointment-configurations/{id}` - Update existing configuration
- `GET /appointment-configurations/{id}` - Get configuration by ID
- `GET /appointment-configurations/branch/{branchId}` - Get all branch configurations
- `DELETE /appointment-configurations/{id}` - Soft delete configuration
- `PATCH /appointment-configurations/{id}/reactivate` - Reactivate configuration

### Availability Endpoint
- `GET /appointment-configurations/availability` - Query available slots

## Usage

### Basic Setup

1. Import the module in your app routes:

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'appointments',
    loadChildren: () => import('./feature-groups/appointments-results/routes/appointments-results.routes')
      .then(m => m.appointmentsResultsRoutes)
  }
];
```

2. Use the service in your components:

```typescript
import { AppointmentConfigurationService } from './appointments-results';

@Component({...})
export class MyComponent {
  private appointmentService = inject(AppointmentConfigurationService);

  searchAvailability() {
    this.appointmentService.getAvailability({ branchId: 1 }).subscribe(
      slots => console.log('Available slots:', slots)
    );
  }
}
```

### Configuration Management

```typescript
// Create a new configuration
const newConfig: CreateAppointmentConfiguration = {
  branchId: 1,
  startTime: '09:00:00',
  endTime: '17:00:00',
  appointmentsCount: 10,
  isRecurring: true,
  recurringDayOfWeek: 1, // Monday
  validFromDate: '2025-01-01',
  validToDate: '2025-12-31',
  createdUser: 123
};

this.appointmentService.createConfiguration(newConfig).subscribe(
  result => console.log('Created:', result)
);
```

### Availability Queries

```typescript
// Default window (next 15 days)
this.appointmentService.getAvailability({ branchId: 1 }).subscribe();

// Specific date
this.appointmentService.getAvailability({ 
  branchId: 1, 
  date: '2025-10-15' 
}).subscribe();

// Date range
this.appointmentService.getAvailability({ 
  branchId: 1, 
  fromDate: '2025-10-01',
  toDate: '2025-10-07'
}).subscribe();
```

### Custom Validation

```typescript
// Use custom validators in forms
this.formBuilder.group({
  startTime: ['', [Validators.required, AppointmentValidators.timeFormat()]],
  endTime: ['', [Validators.required, AppointmentValidators.timeFormat()]],
  appointmentsCount: [1, [AppointmentValidators.appointmentCount(1, 50)]]
}, {
  validators: [
    AppointmentValidators.timeRange('startTime', 'endTime'),
    AppointmentValidators.dateRange('validFromDate', 'validToDate')
  ]
});
```

### Notifications

```typescript
import { NotificationService } from './appointments-results';

@Component({...})
export class MyComponent {
  private notifications = inject(NotificationService);

  onSuccess() {
    this.notifications.success('Configuration saved successfully!');
  }

  onError() {
    this.notifications.error('Failed to save configuration', 'Validation Error');
  }
}
```

## Business Logic

### Configuration Types

1. **Recurring Configurations**: Apply to specific days of the week within a date range
   - Example: "Every Monday from 9 AM to 5 PM, 10 appointments available"
   - Used for regular operating schedules

2. **Specific Configurations**: Apply to all days within a date range
   - Example: "December 15-30, 2025, all days 2 PM to 6 PM, 5 appointments"
   - Used for special periods or holidays

### Optimistic Locking

The system uses version-based optimistic locking to prevent concurrent modifications:

```typescript
// Always include the latest version when updating
const updateConfig: UpdateAppointmentConfiguration = {
  id: config.id,
  version: config.version, // Current version from database
  // ... other fields
};
```

### Soft Delete

Configurations are never permanently deleted. Instead, they are marked as inactive:
- Maintains historical data
- Prevents disruption of existing appointments
- Allows reactivation if needed

## Development

### Prerequisites
- Angular 20+
- TypeScript 5.0+
- RxJS 7.0+

### Project Structure
```
appointments-results/
├── components/
│   └── appointments-home/
├── models/
├── pipes/
├── routes/
└── services/
```

### Testing

```bash
# Run unit tests
ng test

# Run e2e tests
ng e2e
```

### Building for Production

```bash
# Build with optimizations
ng build --prod
```

## Configuration

### Environment Variables

```typescript
// environment.ts
export const environment = {
  apiUrl: 'https://api.example.com',
  appointmentsApi: '/api/v1/appointment-configurations'
};
```

### Customization

The module is designed to be highly customizable:

1. **Styling**: Override CSS custom properties or replace stylesheets
2. **Validation**: Add custom validators or modify existing ones
3. **UI Components**: Replace with Material Design or other component libraries
4. **API Integration**: Modify service to work with different backend APIs

## License

This module is part of a larger healthcare management system. Please refer to the main project license for usage terms.

## Support

For questions or issues, please refer to the main project documentation or contact the development team.