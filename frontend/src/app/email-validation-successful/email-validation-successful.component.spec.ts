import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailValidationSuccessfulComponent } from './email-validation-successful.component';

describe('EmailValidationSuccessfulComponent', () => {
  let component: EmailValidationSuccessfulComponent;
  let fixture: ComponentFixture<EmailValidationSuccessfulComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmailValidationSuccessfulComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailValidationSuccessfulComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
