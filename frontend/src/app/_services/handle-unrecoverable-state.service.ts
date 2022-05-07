import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { SpSnackBarService } from './sp-snackbar.service';

@Injectable({
  providedIn: 'root',
})
export class HandleUnrecoverableStateService {
  constructor(
    private updates: SwUpdate,
    private _snackBar: SpSnackBarService
  ) {}

  handleUnrecoverableState() {
    this.updates.unrecoverable.subscribe((event) => {
      this._snackBar.openSnackBar(
        'An error occured, please reload page',
        'OK',
        'error'
      );
      console.log(
        `An error occurred that we cannot recover from:\n ${event.reason}`
      );
    });
  }
}
