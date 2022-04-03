import { Component } from '@angular/core';
import { SpSnackBarService } from './_services/sp-snackbar.service';
import { ConnectivityService } from './_services/connectivity.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(
    private snackBar: SpSnackBarService,
    private connectivityService: ConnectivityService
  ) {}
  offline!: boolean;
  ngOnInit() {
    window.addEventListener('online', this.onNetworkStatusChange.bind(this));
    window.addEventListener('offline', this.onNetworkStatusChange.bind(this));
    this.onNetworkStatusChange();
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
        this.snackBar.openSnackBar(
          'Offline check connection',
          'OK',
          'wifi_off'
        );
      } else {
        const isConnectedToInternet = true;
        await this.connectivityService.updateConnectionStatus(
          isConnectedToInternet
        );
        this.snackBar.dismiss();
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
