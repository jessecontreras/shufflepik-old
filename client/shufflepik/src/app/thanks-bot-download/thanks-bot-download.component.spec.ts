import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThanksBotDownloadComponent } from './thanks-bot-download.component';

describe('ThanksBotDownloadComponent', () => {
  let component: ThanksBotDownloadComponent;
  let fixture: ComponentFixture<ThanksBotDownloadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ThanksBotDownloadComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ThanksBotDownloadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
