import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientsReportsComponent } from './patients-reports.component';

describe('PatientsReportsComponent', () => {
  let component: PatientsReportsComponent;
  let fixture: ComponentFixture<PatientsReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientsReportsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PatientsReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
