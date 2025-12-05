import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalUserTableComponent } from './internal-user-table.component';

describe('InternalUserTableComponent', () => {
  let component: InternalUserTableComponent;
  let fixture: ComponentFixture<InternalUserTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternalUserTableComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(InternalUserTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
