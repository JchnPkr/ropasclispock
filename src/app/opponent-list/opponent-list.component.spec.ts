import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OpponentListComponent } from './opponent-list.component';

describe('OpponentListComponent', () => {
  let component: OpponentListComponent;
  let fixture: ComponentFixture<OpponentListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OpponentListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OpponentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
