import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalUserRegisterComponent } from './internal-user-register.component';

describe('InternalUserRegisterComponent', () => {
  let component: InternalUserRegisterComponent;
  let fixture: ComponentFixture<InternalUserRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternalUserRegisterComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(InternalUserRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
