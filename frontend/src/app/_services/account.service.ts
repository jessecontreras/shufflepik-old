import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, lastValueFrom, Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

import { User } from '../_models/user.model';

import { environment } from 'src/environments/environment.prod';
import { Album } from '../_models/album.model';
import { Image } from '../_models/image.model';

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
      const response = await lastValueFrom(
        this.http
          .post<any>(
            `${environment.apiUrl}/users/authenticate`,
            {
              email,
              password,
            },
            { withCredentials: true }
          )
          .pipe(shareReplay(1))
      );

      if (response._id) {
        const user = response;
        localStorage.setItem('user', JSON.stringify(user));
        this.userSubject.next(user);
        //this.startRefreshTokenTimer();
        return user;
      }
      return response.serverErrorMessage;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   *  Logs user out of their account.
   *
   * @param {boolean} revokeRefreshToken Boolean that indicates if refresh token should be revoked.
   * @returns {Promise<void>}
   */
  async logout(revokeRefreshToken: boolean): Promise<void> {
    try {
      const userId = this.user._id;
      console.log(revokeRefreshToken);
      if (revokeRefreshToken === true) {
        console.log(`Did I make it here?${revokeRefreshToken}`);
        await lastValueFrom(
          this.http.post<any>(
            `${environment.apiUrl}/users/revoke-token`,
            { userId },
            { withCredentials: true }
          )
        );
      }
      localStorage.removeItem('user');
      //dummy variable just to set logout as unknown
      let nullVar;
      let logout = nullVar as unknown;
      logout = null;
      this.userSubject.next(logout as User);
      this.router.navigate(['/login']);
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async register(user: User): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.http.post(`${environment.apiUrl}/users/register`, user)
      );

      return response;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async albumsUpdate(_id: string): Promise<Album[] | void> {
    try {
      const albums = await lastValueFrom(
        this.http.get<Album[]>(`${environment.apiUrl}/users/${_id}/albums`)
      );
      const currentAlbums = this.user.albums;
      const albumChanges =
        albums.length === currentAlbums?.length ? false : true;
      if (!albumChanges) return;
      this.user.albums = albums;
      localStorage.setItem('user', JSON.stringify(this.user));

      this.userSubject.next(this.user);

      //const updateAlbums = albums.length ;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getGuilds() {
    try {
      console.log('GET GUILDS');
      const _id = this.user._id;
      const guilds = await lastValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/users/${_id}/guilds`)
      );
      //update a users guilds
      this.user.discord.guilds = guilds;
      localStorage.setItem('user', JSON.stringify(this.user));
      this.userSubject.next(this.user);
    } catch (err) {}
  }

  async getUser() {
    try {
      const _id = this.user._id;
      const updatedUser: any = await lastValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/users/${_id}/user`)
      );

      this.user.discord = updatedUser.discord;
      this.user.email_validation = updatedUser.email_validation;
      this.user.email = updatedUser.email;
      localStorage.setItem('user', JSON.stringify(this.user));
      this.userSubject.next(this.user);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getAlbums() {
    try {
      const _id = this.user._id;
      const response = await lastValueFrom(
        this.http.get<any>(`${environment.apiUrl}/users/${_id}/albums`)
      );
      const albums = Array.isArray(response) ? response : response.albums;
      console.log('Albums');
      console.log(albums);
      //update a users albums
      this.user.albums = albums;
      localStorage.setItem('user', JSON.stringify(this.user));
      this.userSubject.next(this.user);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getImages(albumId: string) {
    try {
      const _id = this.user._id;
      const response = await lastValueFrom(
        this.http.get<any>(
          `${environment.apiUrl}/users/${_id}/albums/${albumId}/images`
        )
      );
      const images = Array.isArray(response) ? response : response.images;

      //update a users images
      const currentAlbumIndex = this.user.albums?.findIndex((album: Album) => {
        return album.id === albumId;
      });
      this.user.albums![currentAlbumIndex!].images = images;
      localStorage.setItem('user', JSON.stringify(this.user));

      //currentAlbum!.images = images;
      this.userSubject.next(this.user);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  //async serversUpdate(_id:) wha t the fuck are youf fucking for

  getAll() {
    return this.http.get<User[]>(`${environment.apiUrl}/users`);
  }

  getById(_id: string) {
    return this.http.get<User>(`${environment.apiUrl}/users/${_id}`);
  }

  async delete(_id: string) {
    try {
      const deleteResponse = await lastValueFrom(
        this.http.delete(`${environment.apiUrl}/users/${_id}`)
      );

      return;
    } catch (err) {
      console.log(err);
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

      let integratedUser = await lastValueFrom(
        this.http.post<User>(`${environment.apiUrl}/users/integrate`, user)
      );
      if (integratedUser._id) {
        //Attach non-integrated user's jwt to integratedUser value, this is necessary because we intercept incoming jwts.
        integratedUser.jwt = this.user.jwt;
        //Set returned user in local storage
        localStorage.setItem('user', JSON.stringify(integratedUser));

        //Emit changes to user subject
        this.userSubject.next(integratedUser);
        return true;
      } else {
        const errorResponse = integratedUser as any;
        return errorResponse.duplicateUserError;
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async refreshUserData(currentUserID: string, data: any) {
    try {
      const user = { id: currentUserID, data: data };

      const refreshedUser = await lastValueFrom(
        this.http.post<User>(`${environment.apiUrl}/users/refresh-user`, user)
      );
      //localStorage.setItem('currentItem', JSON.stringify(refreshedUser));
      localStorage.setItem('user', JSON.stringify(refreshedUser));

      this.userSubject.next(refreshedUser);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async redirectToRefreshDiscordUserToken() {
    try {
      this.document.location.href = environment.xchangeInfo;
      //'https://discord.com/api/oauth2/authorize?client_id=825496326107430982&redirect_uri=https%3A%2F%2Fd6e2-47-152-194-12.ngrok.io%2Fdiscord%2Fx-user-info&response_type=code&scope=identify%20email%20connections%20guilds';
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
      //Wrap email in an object, just so that there's no backend controversy (in a British accent: con-truah-va-see)
      const emailObj = { email: email };
      const response = await lastValueFrom(
        this.http.post(`${environment.apiUrl}/users/forgot-password`, emailObj)
      );

      console.log(response);
      return response as any;
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
  /**
   * Updates user object email_validation status.
   *
   * @returns
   */
  async updateEmailValidationStatus() {
    try {
      if (this.user) {
        let emailValidation = { validated: true };
        if (!this.user['email_validation']) {
          this.user.email_validation = emailValidation;
        } else {
          this.user['email_validation'] = emailValidation;
        }
        localStorage.setItem('user', JSON.stringify(this.user));
        this.userSubject.next(this.user);
      }
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
          `${environment.apiUrl}/users/email-validation`,
          sendEmailValidationObj
        )
      ); //what the t

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

  /*async refreshToken() {
    try {
      const userId = this.user._id;
      const jwtToken = await lastValueFrom(
        this.http.post<any>(
          `${environment.apiUrl}/users/refresh-token`,
          {
            userId,
          },
          { withCredentials: true }
        )
      );
      /* .pipe(
            map((jwt) => {
              //upsdate jwt value
              /*this.user.jwt = jwt;
              localStorage.setItem('user', JSON.stringify(this.user));
              this.userSubject.next(this.user);
              this.startRefreshTokenTimer();
              return jwt;
            })
          )
      );

      console.log('back from http: JWT IS:');
      console.log(jwtToken);
      //update jwt value
      this.user.jwt = jwtToken;
      this.userSubject.next(this.user);
      console.log("User's jwt should have been updated as well");
      console.log(this.user.jwt);
      localStorage.setItem('user', JSON.stringify(this.user));
      await this.startRefreshTokenTimer();
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }*/
  //Variable to track our refresh token timeout
  private refreshTokenTimeout: any;
  /**
   * Timer for our refresh token, it will fire off one minute before token is set to expire.
   */
  /*private async startRefreshTokenTimer() {
    try {
      //parse json object from base64 encided jwt token
      const jwtToken = JSON.parse(atob(this.user.jwt!.split('.')[1]));
      console.log('Inside of start jwt timer');
      console.log(jwtToken);
      console.log(jwtToken.exp);
      //set a timeout to refresh the token a minute before it expires
      const expires = new Date(jwtToken.exp * 1000);
      const timeout = expires.getTime() - Date.now() - 60 * 1000;
      this.refreshTokenTimeout = setTimeout(
        async () => await this.refreshToken(),
        timeout
      );

      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }*/

  /**
   * Clears the refresh token timer.
   * @returns
   */
  private async stopRefreshTokenTimer() {
    try {
      clearTimeout(this.refreshTokenTimeout);
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
} //end servnice
