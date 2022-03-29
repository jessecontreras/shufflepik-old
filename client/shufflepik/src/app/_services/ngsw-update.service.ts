import { ApplicationRef, Injectable } from '@angular/core';
//import { SwUpdate } from '@angular/service-worker';
import { concat, interval } from 'rxjs';
import { first } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class NgswUpdateService {
  /* constructor(appRef: ApplicationRef, updates: SwUpdate) {
     //Allow the app to stabilize first, before starting
     //polling for updates with `interval()`
     const appIsStable$ = appRef.isStable.pipe(
       first((isStable) => isStable === true)
     );
     const everyMinute$ = interval(1 * 60 * 1000);
     const everyMinuteOnceAppIsStable$ = concat(appIsStable$, everyMinute$);
     everyMinuteOnceAppIsStable$.subscribe(() => updates.checkForUpdate());
     this.updates = updates;
   }*/
  /*constructor(private updates: SwUpdate) {
    if (updates.isEnabled) {
      interval(1 * 60 * 1000).subscribe(async () => {
        await updates.checkForUpdate();
        console.log('checking for updates');
      });
    }
  }

  async checkForUpdates() {
    try {
      console.log('Inside of check for updates');
      this.updates.available.subscribe((event) => {
        console.log(event);
        this.promptUser();
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async promptUser() {
    try {
      console.log('updating to new version');
      await this.updates.activateUpdate();
      document.location.reload();
    } catch (err) {
      console.log(err);
      throw err;
    }
  }*/
}
