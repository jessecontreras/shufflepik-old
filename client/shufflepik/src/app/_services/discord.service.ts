import { Inject, Injectable, ErrorHandler } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Upload, upload } from '../_helpers/upload';
import { Observable, lastValueFrom } from 'rxjs';

import { environment } from 'src/environments/environment';
import { MediaService } from './media.service';
import { AccountService } from './account.service';
import { User } from '../_models/user.model';

@Injectable({ providedIn: 'root' })
export class DiscordService {
  constructor(
    private http: HttpClient,
    private accountService: AccountService,
    private mediaService: MediaService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  getUser() {}
  //Upload image
  //upload(imageData: FormData): Observable<Upload> {
  upload(imageData: FormData): Observable<Upload> {
    try {
      console.log('Made it to front end service upload\n image info is:');

      // Display the key/value pairs
      for (var pair of imageData.entries()) {
        console.log(pair[0]);
        console.log(pair[1]);
      }
      return this.http
        .post(`${environment.apiUrl}/discord`, imageData, {
          reportProgress: true,
          observe: 'events',
        })
        .pipe(upload());
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Despite the name of this function, service will access accounts and merge them into one.
   */
  async accessDiscordAccount(currentUserID: string) {
    try {
      //Create an object to send over through HTTP
      /*const user = { id: currentUserID };
      console.log('Made it to access discord service');
      console.log(currentUserID);
      await this.redirectToDiscord();
      /* const resp = await this.http
        .post(`${environment.apiUrl}/discord/access`, user)
        .toPromise();
      console.log('MADE IT BACK TO SERVICE FROM REDIRECT');
      //console.log(resp);*/
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async redirectToDiscordAccessPage() {
    try {
      this.document.location.href =
        'https://discord.com/api/oauth2/authorize?client_id=825496326107430982&redirect_uri=https%3A%2F%2F6f66-104-63-110-204.ngrok.io%2Fdiscord%2Fx-user-info&response_type=code&scope=identify%20email%20connections%20guilds%20applications.commands';
      return true;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Integrates a Shufflepik user and their Discord account.
   *
   * @param currentUserID - User's id.
   * @param data - data required for backend stuff. Should be a string.
   */
  async integrateAccounts(currentUserID: string, data: string) {
    try {
      console.log('Made it to integrate account service');
      const user = { id: currentUserID, data: data };
      console.log('In service user id is: user');
      //Call integrate on SP API
      /*const integratedUser: any = await this.http
        .post(`${environment.apiUrl}/discord/integrate`, user)
        .toPromise();*/

      const integratedUser = await lastValueFrom(
        this.http.post<User>(`${environment.apiUrl}/discord/integrate`, user)
      );

      console.log(
        'Made it back to integrate accounts (from backend, user is: )'
      );
      console.log(integratedUser);
      //Set returned albums in local storage
      // localStorage.setItem('albums', JSON.stringify(integratedUser.albums));
      //Emit changes to albums subject
      //this.mediaService.imageAlbumsSubject.next(integratedUser.albums);

      console.log('In the service and back from backend');
      //Set returned user in local storage
      localStorage.setItem('user', JSON.stringify(integratedUser));
      //Emit changes to user subject
      this.accountService.userSubject$.next(integratedUser);
      //  this.accountService.currentUserSubject.next(integratedUser);
      //Remove albums from user object to avoid redundant data.
      //delete integratedUser.albums;
      //console.log(integratedUser);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async refreshUserData(currentUserID: string, data: any) {
    try {
      console.log('Made it to refresh user data waaas goood');
      const user = { id: currentUserID, data: data };
      /* const refreshedUser = await this.http
        .post(`${environment.apiUrl}/discord/refresh-user`, user)
        .toPromise();*/
      const refreshedUser = await lastValueFrom(
        this.http.post<User>(`${environment.apiUrl}/discord/refresh-user`, user)
      );
      console.log('In the service back from beackend');
      localStorage.setItem('currentItem', JSON.stringify(refreshedUser));
      console.log('Refreshed user is:');
      console.log(refreshedUser);
      this.accountService.userSubject$.next(refreshedUser);
      //   this.accountService.currentUserSubject.next(refreshedUser);
    } catch (err) {
      console.log('Made it to error');
      console.log(err);
      throw err;
    }
  }
} //end class
