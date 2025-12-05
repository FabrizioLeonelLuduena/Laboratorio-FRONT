import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientsCardDetailComponent } from './patients-card-detail.component';

describe('PatientsCardDetailComponent', () => {
  let component: PatientsCardDetailComponent;
  let fixture: ComponentFixture<PatientsCardDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientsCardDetailComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientsCardDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
