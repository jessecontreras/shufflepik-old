import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { Pipe, PipeTransform } from '@angular/core';
import { AccountService } from '../_services/account.service';

@Pipe({
  name: 'authImage',
})
export class AuthImagePipe implements PipeTransform {
  constructor(
    private http: HttpClient,
    private accountService: AccountService,
    private sanitizer: DomSanitizer
  ) {}
  async transform(url: string): Promise<string> {
    //return null;
    //const jwt = this.accountService.currentUserValue.jwt;
    const jwt = this.accountService.user.jwt;
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    try {
      let imageBlob = await this.http
        .get(url, { headers, responseType: 'blob' })
        .toPromise();
      imageBlob = imageBlob as Blob;
      let objectUrl = URL.createObjectURL(imageBlob);

      objectUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl) as string;
      return objectUrl;
      //return this.sanitizer.bypassSecurityTrustUrl(objectUrl);
    } catch (err) {
      console.log(err);
      return '../../assets/global-images/fallback.png';
    }
  }
}
