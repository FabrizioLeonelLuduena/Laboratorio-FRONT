import { Component } from '@angular/core';

/** Component which displays a "unauthorized" message
 * when a user tries to access a route they don't have permission for.
 */
@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [],
  templateUrl: './unauthorized.component.html',
  styleUrl: './unauthorized.component.css'
})

export class UnauthorizedComponent {

}
