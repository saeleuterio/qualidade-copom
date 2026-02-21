import { TestBed } from '@angular/core/testing';

import { CallCenter } from './call-center';

describe('CallCenter', () => {
  let service: CallCenter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CallCenter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
