import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { Filtros } from '../../models/models';

/**
 * Component for filtering studies
 */
@Component({
  selector: 'app-estudios-filtros',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InputTextModule, SelectModule, DatePickerModule, FloatLabelModule],
  templateUrl: './estudios-filtros.component.html',
  styleUrls: ['./estudios-filtros.component.css']
})
/**
 * EstudiosFiltrosComponent handles study filtering
 */
export class EstudiosFiltrosComponent implements OnInit {
  /**
   *funcion que ejecuta el primer ciclo de vida de angular
   */
  ngOnInit(): void {
    this.filtrosChange.emit(this.filtros);
  }
  @Input() filtros!: Filtros;
  @Output() filtrosChange = new EventEmitter<Filtros>();

  estadosOptions = [
    { label: 'Cualquiera', value: 'Cualquiera' },
    { label: 'No firmada', value: 'No firmada' },
    { label: 'Firmada parcial', value: 'Firmada parcial' },
    { label: 'Lista para firmar', value: 'Lista para firmar' },
    { label: 'Firmada total', value: 'Firmada total' }
  ];

  /**
   * Emits filter changes
   */
  onFiltroChange() {

    const { fechaDesde, fechaHasta } = this.filtros;

    // Validar coherencia entre ambas fechas
    if (fechaDesde && fechaHasta) {
      if (fechaHasta < fechaDesde) {
        // Si la fecha hasta es menor, sincronizar fechaDesde
        this.filtros.fechaDesde = fechaHasta;
      }  if (fechaDesde > fechaHasta) {
        // Si la fecha desde es mayor, sincronizar fechaHasta
        this.filtros.fechaHasta = fechaDesde;
      }
    }


    this.filtrosChange.emit(this.filtros);
  }
}
