import { Component } from '@angular/core';
import { SpSnackBarService } from './_services/sp-snackbar.service';
import { ConnectivityService } from './_services/connectivity.service';
import { CheckForUpdateService } from './_services/check-for-update.service';
import { HandleUnrecoverableStateService } from './_services/handle-unrecoverable-state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(
    private _snackBar: SpSnackBarService,
    private connectivityService: ConnectivityService,
    private sw: CheckForUpdateService,
    private handleState: HandleUnrecoverableStateService
  ) {
    this.handleState.handleUnrecoverableState();
    this.sw.checkForUpdates();
  }
  offline!: boolean;
  ngOnInit() {
    window.addEventListener('online', this.onNetworkStatusChange.bind(this));
    window.addEventListener('offline', this.onNetworkStatusChange.bind(this));
    this.onNetworkStatusChange();
    this.consoleLogGif();
  }

  /**
   * Determines if application is connected to a data network.
   *
   */
  async onNetworkStatusChange() {
    try {
      this.offline = !navigator.onLine;
      if (this.offline) {
        const isConnectedToInternet = false;
        await this.connectivityService.updateConnectionStatus(
          isConnectedToInternet
        );
        this._snackBar.openSnackBar(
          'Offline check connection',
          'OK',
          'wifi_off'
        );
      } else {
        const isConnectedToInternet = true;
        await this.connectivityService.updateConnectionStatus(
          isConnectedToInternet
        );
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }


  async consoleLogGif() {
    try {
      const backgroundImage = [
        'background-image: url(https://c.tenor.com/JAWmQlZAqOwAAAAd/drake-drakepointing.gif)',
        'background-size: cover',
        'color: black',
        'padding: 100px',
        'font-weight: bolder',
        'font-size: 40px',
        '-webkit-text-stroke-width: 1px',
        '-webkit-text-stroke-color: #4e54c8',
        'text-transform: uppercase',
        'text-align: center',
        'letter-spacing: 1px',
      ].join(' ;');
      console.log('%c👀', backgroundImage);

      console.log(
        "%cHey curious critter! If you'd like to help us make Shufflepik a better experience through feedback hit us up 📧 via info@shufflpik.com. If you'd like to make the app better through development hit up our main squeeze 👨‍💻 via jesse@shufflepik.com",
        'font-size:20px; background-color:#4e54c8; color: white'
      );
      console.log(
        '%c🚨 Do not type nor copy and paste text or commands here! Your data will get stolen if you get caught slippin.',
        'font-size:16px; background-color:red; color: white'
      );
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
