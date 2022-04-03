import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse } from '@angular/common/http';

const maxAge = 15000;
@Injectable({
  providedIn: 'root',
})
export class CacheService {
  cache = new Map();
  ExceptionRoutes = {
    Login: 'authenticate',
    //The following serves for 'forgot-password' and 'reset-password' routes using includes()
    Password: 'password',
    CreateAccount: 'register',
  };
  get(req: HttpRequest<any>): HttpResponse<any> | undefined {
    const url = req.urlWithParams;
    const cached = this.cache.get(url);
    if (!cached) {
      return undefined;
    }

    //Do not cache these routes
    if (
      url.includes(this.ExceptionRoutes.Login) ||
      url.includes(this.ExceptionRoutes.CreateAccount) ||
      url.includes(this.ExceptionRoutes.Password)
    ) {
      return undefined;
    }

    const isExpired = cached.lastRead < Date.now() - maxAge;
    const expired = isExpired ? 'expired ' : '';
    return cached.response;
  }

  put(req: HttpRequest<any>, response: HttpResponse<any>): void {
    const url = req.urlWithParams;
    const entry = { url, response, lastRead: Date.now() };
    this.cache.set(url, entry);

    const expired = Date.now() - maxAge;
    this.cache.forEach((expiredEntry) => {
      if (expiredEntry.lastRead < expired) {
        this.cache.delete(expiredEntry.url);
      }
    });
  }
}
