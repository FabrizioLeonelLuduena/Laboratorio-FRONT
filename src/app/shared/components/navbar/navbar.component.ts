import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';


import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { PopoverModule } from 'primeng/popover';
import { ToolbarModule } from 'primeng/toolbar';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/authentication/auth.service';

import { filter } from 'rxjs/operators';

import {
  NotificationsBellComponent
} from '../../../notifications/components/notifications-bell/notifications-bell.component';
import { NavItem } from '../../models/NavItem';
import { HelpCenterService } from '../../services/help-center.service';
import { TutorialService, TutorialKey } from '../../services/tutorial.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { GenericModalComponent } from '../generic-modal/generic-modal.component';

/**
 * Navbar principal superior con branding, enlaces rápidos y menú de usuario.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    ToolbarModule,
    ButtonModule,
    AvatarModule,
    MenuModule,
    PopoverModule,
    GenericModalComponent,
    BreadcrumbComponent,
    NotificationsBellComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  /** Nombre de la aplicación visible */
  @Input() appName = 'Laboratorio Castillo Chidiak';

  /** Enlaces de navegación rápidos */
  @Input() navItems: NavItem[] = [];

  /** Indica si está en modo móvil */
  @Input() isHandset = false;

  /** Indica si se muestra el botón de ayuda */
  @Input() showHelp = false;

  /** Título del modal de ayuda */
  @Input() helpTitle = 'Ayuda';

  /** Contenido del modal de ayuda (HTML o texto plano) */
  @Input() helpContent = '<p>Información de ayuda del sistema.</p>';

  /** Emite el evento para abrir/cerrar sidebar */
  @Output() menuClick = new EventEmitter<void>();

  /** Controla la visibilidad del modal de ayuda */
  helpModalVisible = false;

  /** Referencia al menú emergente del usuario */
  @ViewChild('userMenu') userMenu!: Menu;

  /** Injects the authentication service to handle logout. */
  private authService = inject(AuthService);
  private helpCenterService = inject(HelpCenterService);
  private tutorialService = inject(TutorialService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);


  private routerSubscription: Subscription | undefined;
  public showTutorialButton = false;
  private readonly tutorialRoutes: TutorialKey[] = [
    'coverage-administration',
    'care-management',
    'procurement-inventory',
    'user-management',
    'patients',
    'analysis-list',
    'attention-detail',
    'attention-workflow',
    'attentions',
    'billing-collections',
    'pre-analytical',
    'post-analytical',
    'analytical',
    'appointments-results'
  ];

  notificationsOpen = false;
  unreadCount = 0;

  /** User menu options */
  userMenuItems = [
    {
      label: 'Perfil',
      icon: 'pi pi-user',
      command: () => this.onProfile()
    },
    {
      label: 'Ajustes',
      icon: 'pi pi-cog',
      command: () => this.onSettings()
    },
    {
      separator: true
    },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () => this.onLogout()
    }
  ];

  /**
   * Lifecycle hook that is called after Angular has initialized all data-bound properties of a directive.
   * Subscribes to router events to control the visibility of the tutorial button.
   */
  ngOnInit(): void {
    // Check initial route on component load
    const initialRoute = this.tutorialRoutes.find(route => this.router.url.includes(route));
    this.showTutorialButton = !!initialRoute;
    this.cd.detectChanges();

    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      const currentRoute = this.tutorialRoutes.find(route => event.urlAfterRedirects.includes(route));
      this.showTutorialButton = !!currentRoute;
      this.cd.detectChanges();
    });
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   * Unsubscribes from router events.
   */
  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  /**
   * Emits an event to toggle the sidebar.
   */
  onToggleSidebar(): void {
    this.menuClick.emit();
  }

  /**
   * Handles the profile action in the user menu.
   */
  onProfile(): void {
    this.router.navigate(['/user-management/profile']);
  }

  /**
   * Handles the settings action in the user menu.
   */
  onSettings(): void {
    this.router.navigate(['/user-management/settings']);
  }

  /**
   * Handles the logout action in the user menu.
   */
  onLogout(): void {
    this.authService.logout();
  }

  /**
   * Opens the user menu.
   * @param event The click event.
   */
  openUserMenu(event: Event): void {
    this.userMenu.toggle(event);
  }

  /**
   * Opens the help modal.
   */
  openHelp() {
    this.helpCenterService.open();
  }

  /**
   * Closes the help modal.
   */
  closeHelp(): void {
    this.helpModalVisible = false;
  }

  /**
   * Triggers the tutorial for the current page.
   * Emits the full URL path to allow components to filter by their specific route.
   */
  startCurrentTutorial(): void {
    const currentRoute = this.tutorialRoutes.find(route => this.router.url.includes(route));
    if (currentRoute) {
      // Emit the full current URL so components can filter by their specific path
      this.tutorialService.startTutorial(this.router.url);
    }
  }

  /**
   *dsad
   */
  openFaq() {
    window.open('/manual', '_blank');
  }
}
