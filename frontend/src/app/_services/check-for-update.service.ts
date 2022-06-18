import { ApplicationRef, Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { concat, first, interval, lastValueFrom, Subject } from 'rxjs';
import { SpSnackBarService } from './sp-snackbar.service';

@Injectable({
  providedIn: 'root',
})
export class CheckForUpdateService {
  constructor(
    private appRef: ApplicationRef,
    private updates: SwUpdate,
    private _snackbar: SpSnackBarService
  ) {
    // Allow the app to stabilize first, before starting
    // polling for updates with `interval()`.
    const appIsStable$ = this.appRef.isStable.pipe(
      first((isStable) => isStable === true)
    );
    //TODO change every time it checks for new version
    const everyHour$ = interval(1 * 1 * 10 * 1000); //this is every minute btw
    const everyHourOnceAppIsStable$ = concat(appIsStable$, everyHour$);

    everyHourOnceAppIsStable$.subscribe(() => updates.checkForUpdate());
  }

  /**
   * Check for service worker updates.
   */
  public async checkForUpdates() {
    try {
      this.updates.versionUpdates.subscribe(async (event) => {
        await this.promptUser();
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Prompt user to update to new version of angular
   */
  private async promptUser() {
    try {
      this._snackbar.openSnackBar(
        'Click OK to upgrade Shufflepik, otherwise ignore',
        'OK',
        'update',
        30
      );
      this._snackbar.onAction.subscribe((event: any) => {
        if (event.dismissedByAction) {
          document.location.reload();
        }
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
