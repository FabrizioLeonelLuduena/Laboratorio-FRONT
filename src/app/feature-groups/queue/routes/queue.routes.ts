import { Routes } from '@angular/router';

import { QueueRegisterComponent } from '../queue-register/queue-register.component';
import { QueueStartComponent } from '../queue-start/queue-start.component';
import { WaitingRoomComponent } from '../waiting-room/waiting-room.component';
import { WaitingRoomExtractionsComponent } from '../waiting-room-extractions/waiting-room-extractions.component';

/**
 * Rutas para el módulo de gestión de cola de pacientes
 */
export const QUEUE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full'
  },
  {
    path: 'start',
    component: QueueStartComponent,
    title: 'Gestión de Cola - Inicio'
  },
  {
    path: 'register',
    component: QueueRegisterComponent,
    title: 'Registrar Paciente'
  },
  {
    path: 'waiting-room',
    component: WaitingRoomComponent,
    title: 'Sala de Espera'
  },
  {
    path: 'extraction-waiting-room',
    component: WaitingRoomExtractionsComponent,
    title: 'Sala de espera de extracción'
  }
];
