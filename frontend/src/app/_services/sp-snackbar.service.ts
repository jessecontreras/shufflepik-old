import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { SpSnackBarComponent } from '../sp-snackbar/sp-snackbar.component';

@Injectable({
  providedIn: 'root',
})
export class SpSnackBarService {
  public onAction = new Subject<any>();

  constructor(private snackBar: MatSnackBar) {}
  /**
   *
   * Opens SpSnackBar.
   * @param {string} message  Snackbar notification message
   * @param {string} action  Action button text.
   * @param {string} matIcon   Angular Material icon. More on how to embed icons: {@link fonts.google.com/icons}. Ex -> For "Thumb up" icon use "thumb_up" as parameter.
   * @param {number} duration The amount, in seconds, the snackbar will be open for.
   *
   */
  ///@returns {Promise<MatSnackBarRef<SpSnackBarComponent>>} snackBarRef Reference to SpSnackBar dispatched from sp-snackbar service.
  // */
  async openSnackBar(
    message: string,
    action: string,
    matIcon?: string,
    duration?: number
  ) {
    try {
      this.snackBar.open('the');
      //Default for duration is milliseconds so we're changing that
      const snackBarDuration = duration ? duration * 1000 : 3000;
      const snackBarRef = this.snackBar
        .openFromComponent(SpSnackBarComponent, {
          verticalPosition: 'top',
          duration: snackBarDuration,
          data: { message: message, action: action, matIcon: matIcon },
        })
        .afterDismissed()
        .subscribe(() => {
          this.onAction.next(true);
          //return new BehaviorSubject<boolean>(true);
        });

      return snackBarRef;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  //private async the() {}
  /**
   * Dismisses SpSnackBar.
   */
  async dismiss() {
    try {
      this.snackBar.dismiss();
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
