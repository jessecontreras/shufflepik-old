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
    console.log(user);
    const isLoggedIn = user && user.jwt;
    let isApiUrl;
    console.log('In jwt interceptor');
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
    console.log(`request url ${request.url}`);
    console.log(isApiUrl);
    console.log(isLoggedIn);
    if (isLoggedIn && isApiUrl) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${user.jwt}`,
        },
      });
      console.log('request is:');
      console.log(request);
    }
    //TODO THIS
    return next.handle(request).pipe(
      //next: (event) => {
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse && event.body.jwt && isLoggedIn) {
          console.log('Made it here jwt, response');
          console.log(event);
          console.log('Is this a user or an updated thing?');
          console.log(event.body);

          if (event.body.jwt) {
            //Make a deep copy of event
            let clonedEvent = JSON.parse(JSON.stringify(event));
            //if (event.body.jwt && isLoggedIn) {
            //Update jwt value for user
            user.jwt = clonedEvent.body.jwt;
            //user.jwt = event.body.jwt;
            //Update changes to local storage
            localStorage.setItem('user', JSON.stringify(user));
            //Update changes to user subject
            this.accountService.userSubject.next(user);

            //delete clonedEvent.body.jwt;
            //delete jwt from updated event object
            // delete updatedEvent.body.jwt;
            //console.log('Updated event is:');
            //console.log(updatedEvent);
            //this.updateUserJwtToken(event.body.jwt);
            let bodyValue; // = Object.keys(event.body).length > 2 ? {} : null; //null;//event.body;

            console.log('JWT interceptor');

            for (const [key, value] of Object.entries(event.body)) {
              console.log(key);
              console.log(typeof key);
              console.log(value);
              console.log(typeof value);
              //TODO
              //Attach the non-jwt body value to our body value, this normalizes data coming over the wire.
              /*if (key !== 'jwt') {
                bodyValue = value;
              }*/
              if (key === 'jwt') {
                delete event.body[key];
              }
            }
            console.log('Event body now');
            console.log(event);
            //return event.clone({ body: bodyValue });
            //return event.clone({ body: clonedEvent });
            return event;
          }
        }
        return event;
        //  }
        // return event;
        // },
      }) //end map
    ); //end pipe;

    /*return next.handle(request).pipe(
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          console.log('response event is:');
          console.log(event);
          //User
          const user = this.accountService.user;
          if (event.body.jwt && isLoggedIn) {
            //refrence user
            console.group('User is');
            console.log(user);
            //Update jwt value for user
            user.jwt = event.body.jwt;
            //Update changes to user subject
            this.accountService.userSubject.next(user);
            //Update changes to local storage
            localStorage.setItem('user', JSON.stringify(user));
            //Make a copy of event

            let updatedEvent = JSON.parse(JSON.stringify(event));

            //delete jwt from updated event object
            delete updatedEvent.body.jwt;
            console.log('Updated event is:');
            console.log(updatedEvent);

            //return updatedEvent;
            //updatedEvent = delete updatedEvent.body.jwt;
            // const propertyToRemove = event.body.jwt;
            //const { event : { body: { jwt, ...restOfBody } }, ...eventDetails } = event;
            //delete jwt value from event
            //delete event.body.jwt
          }
          return event;
        }
        return event;
      })
    );*/
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
