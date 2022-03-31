import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SpSnackBarComponent } from '../sp-snackbar/sp-snackbar.component';

@Injectable({
  providedIn: 'root',
})
export class SpSnackBarService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Opens SpSnackBar.
   * @param {string} message - Snackbar notification message
   * @param {string} action - Action button text.
   * @param {string} matIcon -  Angular Material icon. More on how to embed icons: {@link fonts.google.com/icons}. Ex -> For "Thumb up" icon use "thumb_up" as parameter.
   */
  async openSnackBar(message: string, action: string, matIcon?: string) {
    try {
      this.snackBar.openFromComponent(SpSnackBarComponent, {
        verticalPosition: 'bottom',

        data: { message: message, action: action, matIcon: matIcon },
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
