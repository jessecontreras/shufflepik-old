import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpSnackBarComponent } from './sp-snackbar.component';

describe('SpSnackBarComponent', () => {
  let component: SpSnackBarComponent;
  let fixture: ComponentFixture<SpSnackBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SpSnackBarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SpSnackBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
