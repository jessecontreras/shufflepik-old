import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorDownloadingBotComponent } from './error-downloading-bot.component';

describe('ErrorDownloadingBotComponent', () => {
  let component: ErrorDownloadingBotComponent;
  let fixture: ComponentFixture<ErrorDownloadingBotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ErrorDownloadingBotComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ErrorDownloadingBotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
