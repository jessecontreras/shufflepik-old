import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoAlbumsComponent } from './photo-albums.component';

describe('PhotoAlbumsComponent', () => {
  let component: PhotoAlbumsComponent;
  let fixture: ComponentFixture<PhotoAlbumsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PhotoAlbumsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PhotoAlbumsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
