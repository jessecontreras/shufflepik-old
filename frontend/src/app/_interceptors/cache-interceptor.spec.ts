import { TestBed } from '@angular/core/testing';

import { CacheInterceptor } from './cache-interceptor';

describe('CacheInterceptor', () => {
  let service: CacheInterceptor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CacheInterceptor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
