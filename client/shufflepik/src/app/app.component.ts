import { Component } from '@angular/core';
import { SpSnackBarService } from './_services/sp-snackbar.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(private snackBar: SpSnackBarService) {}
  offline!: boolean;
  ngOnInit() {
    window.addEventListener('online', this.onNetworkStatusChange.bind(this));
    window.addEventListener('offline', this.onNetworkStatusChange.bind(this));
  }
  onNetworkStatusChange() {
    this.offline = !navigator.onLine;
    if (this.offline) {
      this.snackBar.openSnackBar('Offline check connection', 'OK', 'wifi_off');
    }
    console.log(`Offline ${this.offline}`);
  }
}
