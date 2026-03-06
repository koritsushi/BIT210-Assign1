import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitorParticipation } from './monitor-participation';

describe('MonitorParticipation', () => {
  let component: MonitorParticipation;
  let fixture: ComponentFixture<MonitorParticipation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonitorParticipation],
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorParticipation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
