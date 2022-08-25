import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AccountService } from '../_services/account.service';
import { environment } from 'src/environments/environment.prod';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private accountService: AccountService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // what
    // add auth header with jwt if user is logged in and request is to the api url
    const user = this.accountService.user;
    const isLoggedIn = user && user.jwt;
    let isApiUrl;

    if (
      request.url.startsWith(
        `${environment.apiUrl}/${environment.protectedRoute1}`
      ) ||
      request.url.startsWith(
        `${environment.apiUrl}/${environment.protectedRoute2}`
      ) ||
      request.url.startsWith(
        `${environment.apiUrl}/${environment.protectedRoute3}`
      )
    ) {
      isApiUrl = true;
    } else {
      isApiUrl = false;
    }

    if (isLoggedIn && isApiUrl) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${user.jwt}`,
        },
      });

    }
    //TODO THIS
    return next.handle(request).pipe(
      //next: (event) => {
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse && event.body.jwt && isLoggedIn) {


          if (event.body.jwt) {
            //Make a deep copy of event
            let clonedEvent = JSON.parse(JSON.stringify(event));
 
            //Update jwt value for user
            user.jwt = clonedEvent.body.jwt;
    
            //Update changes to local storage
            localStorage.setItem('user', JSON.stringify(user));
            //Update changes to user subject
            this.accountService.userSubject.next(user);


            let bodyValue; // = Object.keys(event.body).length > 2 ? {} : null; //null;//event.body;

         

            for (const [key, value] of Object.entries(event.body)) {
   
  
              if (key === 'jwt') {
                delete event.body[key];
              }
            }

            return event;
          }
        }
        return event;
        //  }
        // return event;
        // },
      }) //end map
    ); //end pipe;

  }

  /**
   * Updates and attaches jwt token to user.
   *
   * @param {string}jwt - A json web token
   * @returns {Promise<void>}
   */
  async updateUserJwtToken(jwt: string): Promise<void> {
    try {
      const jwtToken = jwt;
      const user = this.accountService.user;
      //Update user's jwt value
      user.jwt = jwtToken;
      //Update changes to user subject
      this.accountService.userSubject.next(user);
      //Update changes to local storage
      localStorage.setItem('user', JSON.stringify(user));
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
