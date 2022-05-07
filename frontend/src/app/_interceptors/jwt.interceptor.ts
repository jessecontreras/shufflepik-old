import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AccountService } from '../_services/account.service';
import { environment } from 'src/environments/environment.prod';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private accountService: AccountService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
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

    return next.handle(request);
  }
}
