import { TestBed } from '@angular/core/testing';

import { SpSnackBarService } from './sp-snackbar.service';

describe('SpSnackbarService', () => {
  let service: SpSnackBarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpSnackBarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
