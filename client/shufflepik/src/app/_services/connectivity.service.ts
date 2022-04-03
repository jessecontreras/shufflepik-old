import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConnectivityService {
  //Observable string sources
  private connectionStatusSource: BehaviorSubject<Boolean>;
  //Observable string stream
  connectionStatus$: Observable<any>;

  constructor() {
    //Behavior subject has default true value
    this.connectionStatusSource = new BehaviorSubject<Boolean>(true);
    this.connectionStatus$ = this.connectionStatusSource.asObservable();
  }

  /**
   * Updates connection status
   * @param {boolean} status - Connection status.
   */
  async updateConnectionStatus(status: boolean) {
    try {
      this.connectionStatusSource.next(status);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
