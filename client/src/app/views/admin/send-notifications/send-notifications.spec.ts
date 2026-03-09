import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SendNotifications } from './send-notifications';

describe('SendNotifications', () => {
  let component: SendNotifications;
  let fixture: ComponentFixture<SendNotifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendNotifications],
    }).compileComponents();

    fixture = TestBed.createComponent(SendNotifications);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
