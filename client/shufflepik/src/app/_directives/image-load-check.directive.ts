import {
  Directive,
  EventEmitter,
  Output,
  ElementRef,
  HostListener,
  OnInit,
} from '@angular/core';
import { MediaService } from '../_services/media.service';

@Directive({
  selector: 'img',
})
export class ImageLoadCheckDirective {
  @Output() loaded = new EventEmitter();

  @HostListener('load')
  onLoad() {
    this.mediaService.imageLoadedOrError(this.elRef.nativeElement);
  }

  @HostListener('error')
  onError() {
    this.mediaService.imageLoadedOrError(this.elRef.nativeElement);
  }

  constructor(private elRef: ElementRef, private mediaService: MediaService) {
    mediaService.imageLoading(elRef.nativeElement);
  }
}
