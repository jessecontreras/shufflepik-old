import { Inject, Injectable, ErrorHandler } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Upload, upload } from '../_helpers/upload';
import { Observable, lastValueFrom } from 'rxjs';

import { environment } from 'src/environments/environment.prod';
import { AccountService } from './account.service';
import { User } from '../_models/user.model';

@Injectable({ providedIn: 'root' })
export class DiscordService {
  constructor(
    private http: HttpClient,
    private accountService: AccountService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  getUser() {}

  upload(imageData: FormData): Observable<Upload> {
    try {
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

    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async redirectToDiscordAccessPage() {
    try {
      this.document.location.href = environment.xchangeInfo;
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
      const user = { id: currentUserID, data: data };
      const integratedUser = await lastValueFrom(
        this.http.post<User>(`${environment.apiUrl}/discord/integrate`, user)
      );
      localStorage.setItem('user', JSON.stringify(integratedUser));
      //Emit changes to user subject
      this.accountService.userSubject.next(integratedUser);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async refreshUserData(currentUserID: string, data: any) {
    try {
      const user = { id: currentUserID, data: data };
      const refreshedUser = await lastValueFrom(
        this.http.post<User>(`${environment.apiUrl}/discord/refresh-user`, user)
      );
      localStorage.setItem('currentItem', JSON.stringify(refreshedUser));

      this.accountService.userSubject.next(refreshedUser);
      //   this.accountService.currentUserSubject.next(refreshedUser);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
} //end class
