import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityCheckIn } from './activity-check-in';

describe('ActivityCheckIn', () => {
  let component: ActivityCheckIn;
  let fixture: ComponentFixture<ActivityCheckIn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityCheckIn],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityCheckIn);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
