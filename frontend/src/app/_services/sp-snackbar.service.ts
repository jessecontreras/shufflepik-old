import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { lastValueFrom, Subject, Subscription } from 'rxjs';
import { SpSnackBarComponent } from '../sp-snackbar/sp-snackbar.component';

@Injectable({
  providedIn: 'root',
})
export class SpSnackBarService {
  constructor(private snackBar: MatSnackBar) {}
  onAction = new Subject();
  /**
   * Opens SpSnackBar.
   * @param {string} message  Snackbar notification message
   * @param {string} action  Action button text.
   * @param {string} matIcon   Angular Material icon. More on how to embed icons: {@link fonts.google.com/icons}. Ex -> For "Thumb up" icon use "thumb_up" as parameter.
   * @param {number} duration The amount, in seconds, the snackbar will be open for.
   */
  async openSnackBar(
    message: string,
    action: string,
    matIcon?: string,
    duration?: number
  ) {
    try {
      //Default for duration is milliseconds so we're changing that
      const snackBarDuration = duration ? duration * 1000 : 3000;
      this.snackBar
        .openFromComponent(SpSnackBarComponent, {
          verticalPosition: 'top',
          duration: snackBarDuration,
          data: { message: message, action: action, matIcon: matIcon },
        })
        .onAction()
        .subscribe(() => {
          this.onAction.next({ dismissedByAction: true });
        });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

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
