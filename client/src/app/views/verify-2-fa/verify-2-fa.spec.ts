import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Verify2FA } from './verify-2-fa';

describe('Verify2FA', () => {
  let component: Verify2FA;
  let fixture: ComponentFixture<Verify2FA>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Verify2FA],
    }).compileComponents();

    fixture = TestBed.createComponent(Verify2FA);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
