import { TestBed } from '@angular/core/testing';

import { WelcomeMessageGeneratorService } from './welcome-message-generator';

describe('WelcomeMessageGeneratorService', () => {
  let service: WelcomeMessageGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WelcomeMessageGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
