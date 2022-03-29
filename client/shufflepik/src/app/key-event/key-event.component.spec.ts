import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyEventComponent } from './key-event.component';

describe('KeyEventComponent', () => {
  let component: KeyEventComponent;
  let fixture: ComponentFixture<KeyEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KeyEventComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KeyEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
