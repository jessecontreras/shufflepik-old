import {
  Directive,
  Output,
  EventEmitter,
  HostBindingDecorator,
  HostListener,
  HostBinding,
  Host,
} from '@angular/core';

@Directive({
  selector: '[fileUpload]',
})
export class UploadDirective {
  //Event will expose component (decorator), will be triggered when file is dropped on host DOM element
  @Output() onFileDropped = new EventEmitter<any>();

  @HostBinding('style.background-color') public background = '#fffff';
  @HostBinding('style.opacity') public opacity = '0.5';
  @HostBinding('style.color') public color = '#4e54c8';

  //@HostBinding('style.opacity:hover') public opacityHover = '1';

  //Dragover listener, when something is dragged over our host element.
  @HostListener('dragover', ['$event']) onDragOver(evt: any) {

    evt.preventDefault();
    evt.stopPropagation();
    this.background = 'rgba(78, 84, 200, 1)';
    this.opacity = '1';
    this.color = 'rgba(255, 255, 255, 1)';
  }

  //Dragleave listener, when something is dragged away from our host element
  @HostListener('dragleave', ['$event']) public onDragLeave(evt: any) {

    evt.preventDefault();
    evt.stopPropagation();
    this.opacity = '0.5';
    this.color = 'rgba(78, 84, 200, 1)';
    this.background = 'rgba(255, 255, 255, 1)';
  }

  //Emit files in the case something is dropped on our host element
  @HostListener('drop', ['$event']) public ondrop(evt: any) {
    evt.preventDefault();
    evt.stopPropagation();
    this.background = '#4e54c8';
    this.opacity = '1';
    this.color = '#fffff';

    let files = evt.dataTransfer.files;
    if (files.length > 0) {
      this.onFileDropped.emit(files);
    }
  }

  @HostListener('mouseenter') public onMouseEnter(evt: any) {

    this.opacity = '1';
  }

  @HostListener('mouseleave') public onMouseLeave(evt: any) {

    this.opacity = '0.5';
  }

  constructor() {}
}
