import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';


/**
 * User Management feature home component.
 */
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    RouterOutlet
  ],
  templateUrl: './user-home.component.html',
  styleUrl: './user-home.component.css'
})
export class UserHomeComponent {

}
