import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';

import { NbuVersion } from '../../../domain/nbu-version.model';

/**
 *
 */
@Component({
  selector: 'app-nbu-version-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, SpinnerComponent],
  templateUrl: './nbu-version-list.component.html',
  styleUrl: './nbu-version-list.component.css'
})
export class NbuVersionListComponent {
  @Input() versions: NbuVersion[] = [];
  @Input() isLoading = false;
  @Input() selectedVersion: NbuVersion | null = null;

  @Output() versionSelected = new EventEmitter<NbuVersion | null>();

  searchTerm = '';

  /**
   * Filters versions based on the search term
   */
  get filteredVersions(): NbuVersion[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) return this.versions;
    return this.versions.filter(v =>
      (v.versionCode?.toLowerCase().includes(term)) ||
      (String(v.publicationYear ?? '').includes(term))
    );
  }

  /**
   * Handles version selection/deselection
   */
  selectVersion(version: NbuVersion): void {
    if (this.selectedVersion?.id === version.id) {
      this.selectedVersion = null;
      this.versionSelected.emit(null);
    } else {
      this.selectedVersion = version;
      this.versionSelected.emit(version);
    }
  }

  /**
   * Checks if a version is currently selected
   */
  isSelected(version: NbuVersion): boolean {
    return this.selectedVersion?.id === version.id;
  }
}