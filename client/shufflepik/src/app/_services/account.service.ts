import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  EMPTY,
  lastValueFrom,
  Observable,
  ReplaySubject,
  Subject,
} from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';

import { User } from '../_models/user.model';


import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AccountService {
  public userSubject: BehaviorSubject<User>;
  public userData$: Observable<any>;

  constructor(
    private router: Router,
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.userSubject = new BehaviorSubject<User>(
      JSON.parse(localStorage.getItem('user')!)
    );
    this.userData$ = this.userSubject.asObservable();
  }

  public get user(): User {
    return this.userSubject.value;
  }

  public get userData(): any {
    return this.userSubject.asObservable();
  }

  async login(email: string, password: string) {
    try {
      console.log('Login service');

      const response = await lastValueFrom(
        this.http
          .post<any>(`${environment.apiUrl}/users/authenticate`, {
            email,
            password,
          })
          .pipe(shareReplay(1))
      );

      console.log('Made it back from logging in! Our user is:');

      console.log(response);

      if (response._id) {
        const user = response;
        localStorage.setItem('user', JSON.stringify(user));
        this.userSubject.next(user);
        return user;
      }
      console.log('There was an error');
      console.log(response);

      return response.serverErrorMessage;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async logout() {
    try {
      localStorage.removeItem('user');
      let nullVar;
      let logout = nullVar as unknown;
      logout = null;
      this.userSubject.next(logout as User);
      this.router.navigate(['/login']);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async register(user: User): Promise<any> {
    try {
      console.log('Leaving before router');
      console.log(`${environment.apiUrl}/users/register`);
      console.log(user);
      const response = await lastValueFrom(
        this.http.post(`${environment.apiUrl}/users/register`, user)
      );

      return response;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  getAll() {
    return this.http.get<User[]>(`${environment.apiUrl}/users`);
  }

  getById(_id: string) {
    return this.http.get<User>(`${environment.apiUrl}/users/${_id}`);
  }

  update(_id: string, params: object) {
    /*return this.http.put(`${environment.apiUrl}/users/${_id}`, params).pipe(
      map((x) => {
        // update stored user if the logged in user updated their own record
        if (_id == this.currentUserValue._id) {
          // update local storage
          const user = { ...this.currentUserValue, ...params };
          localStorage.setItem('user', JSON.stringify(user));

          // publish updated user to subscribers
          this.currentUserSubject.next(user);
        }
        return x;
      })
    );*/
    return this.http.put(`${environment.apiUrl}/users/${_id}`, params).pipe(
      map((x) => {
        // update stored user if the logged in user updated their own record
        if (_id == this.user._id) {
          // update local storage
          const user = { ...this.user, ...params };
          localStorage.setItem('user', JSON.stringify(user));

          // publish updated user to subscribers
          this.userSubject.next(user);
        }
        return x;
      })
    );
  }

  async delete(_id: string) {
    try {
      console.log('in delete service');
      console.log(_id);

      const deleteResponse = await lastValueFrom(
        this.http.delete(`${environment.apiUrl}/users/${_id}`)
      );
      console.log('made it back from backend');
      console.log(deleteResponse);
      return;
    } catch (err) {}
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

      const integratedUser = await lastValueFrom(
        this.http.post<User>(`${environment.apiUrl}/users/integrate`, user)
      );
      console.log(
        'Made it back to integrate accounts (from backend, user is: )'
      );
      console.log(integratedUser);
      console.log('In the service and back from backend');
      //Set returned user in local storage
      localStorage.setItem('user', JSON.stringify(integratedUser));
      //Emit changes to user subject
      this.userSubject.next(integratedUser);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async refreshUserData(currentUserID: string, data: any) {
    try {
      console.log('Made it to refresh user data waaas goood');
      const user = { id: currentUserID, data: data };

      const refreshedUser = await lastValueFrom(
        this.http.post<User>(`${environment.apiUrl}/users/refresh-user`, user)
      );
      console.log('In the service back from beackend');
      localStorage.setItem('currentItem', JSON.stringify(refreshedUser));
      console.log('Refreshed user is:');
      console.log(refreshedUser);
      this.userSubject.next(refreshedUser);
    } catch (err) {
      console.log('Made it to error');
      console.log(err);
      throw err;
    }
  }

  async redirectToRefreshDiscordUserToken() {
    try {
      this.document.location.href =
        'https://discord.com/api/oauth2/authorize?client_id=825496326107430982&redirect_uri=https%3A%2F%2Fd6e2-47-152-194-12.ngrok.io%2Fdiscord%2Fx-user-info&response_type=code&scope=identify%20email%20connections%20guilds';
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Sends password reset instructions to user email.
   *
   * @param email account email to send reset password email.
   * @returns server response.
   */
  async sendResetPasswordEmail(email: string) {
    try {
      console.log('Made it to send reset password');
      //Wrap email in an object, just so that there's no backend controversy (in a British accent: con-truah-va-see)
      const emailObj = { email: email };
      const response = await lastValueFrom(
        this.http.post(`${environment.apiUrl}/users/forgot-password`, emailObj)
      );

      return response;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async validateEmail() {
    try {
      const verifyEmailObj = { _id: this.user._id };
      const response = await lastValueFrom(
        this.http.post(`${environment.apiUrl}/users/ve`, verifyEmailObj)
      );
      return response;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async updateEmailValidationStatus() {
    try {
      let user = this.user;
      console.log('user is:');
      console.log(user);
      let emailValidation = { validated: true };
      user['email_validation'] = emailValidation;
      localStorage.setItem('user', JSON.stringify(user));
      console.log('New user');
      console.log(user);
      this.userSubject.next(user);
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async sendEmailValidation(): Promise<any> {
    try {
      const sendEmailValidationObj = { _id: this.user._id };
      const response = await lastValueFrom(
        this.http.post(
          `${environment.apiUrl}/users/send-email-validation`,
          sendEmailValidationObj
        )
      );
      console.log('response is:');
      console.log(response);
      return response;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Resets a user's password.
   *
   * @param token - a password reset password token.
   * @param password - a user's new password.
   * @returns {string} A successful password reset or invalid token message.
   */
  async resetPassword(token: string, password: string) {
    try {
      console.log('Made it to reset password service:');
      const resetPasswordObj = { token: token, password: password };
      const response = await lastValueFrom(
        this.http.post(
          `${environment.apiUrl}/users/reset-password`,
          resetPasswordObj
        )
      );
      return response;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
