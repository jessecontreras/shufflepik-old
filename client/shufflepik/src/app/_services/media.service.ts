//ng imports
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';

import { Router } from '@angular/router';
import {
  BehaviorSubject,
  lastValueFrom,
  Observable,
  Subject,
  throwError,
} from 'rxjs';
//local imports
import { Upload, upload } from '../_helpers/upload';
import { AccountService } from './account.service';
//models

import { catchError, retry } from 'rxjs/operators';
import { Album } from '../_models/album.model';
import { User } from '../_models/user.model';
import { Image } from '../_models/image.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MediaService {
  public imageAlbums!: Observable<Album[]>;
  //public imageAlbumsSubject!: BehaviorSubject<any>;
  public userSubject!: BehaviorSubject<User>;
  //private _imagesLoading = new Subject<number>();
  private _imagesLoading = new Subject<any>();
  private images: Map<HTMLElement, boolean> = new Map();
  //private imagesLoading = 0;
  private imagesLoading: any;
  imagesLoading$ = this._imagesLoading.asObservable();

  constructor(
    private http: HttpClient,
    private accountService: AccountService,
    private sanitizer: DomSanitizer
  ) {
    console.log('Inside of constructor of this thing.');
    //this.userSubject = this.accountService.userSubject;

    /*if (JSON.parse(localStorage.getItem('user')!)) {
          this.userSubject = 
    }*/
    /*this.imageAlbumsSubject = new BehaviorSubject<Album[]>(
        JSON.parse(localStorage.getItem('user')!).albums
      );*/
    // this.imageAlbums = this.imageAlbumsSubject.asObservable();
    //console.log(this.albums);
    //this.imageAlbums = this.accountService.user.albums;
  }
  //}

  /**
   * Gets a user's Albums
   */
  public get albums() {
    return this.accountService.user.albums;
    /*return this.accountService.user.albums
      ? this.accountService.user.albums
      : [];*/
  }

  //Upload image
  //upload(imageData: FormData): Observable<Upload> {
  // uploadImage(imageData: FormData): Observable<Upload> {
  uploadImage(imageData: FormData): Observable<Upload> {
    //: Observable<Upload> {
    try {
      console.log('Made it to front end service upload\n image info is:');

      // Display the key/value pairs
      for (var pair of imageData.entries()) {
        console.log(pair[0]);
        console.log(pair[1]);
      }
      return this.http
        .post(`${environment.apiUrl}/media/image`, imageData, {
          reportProgress: true,
          observe: 'events',
        })
        .pipe(upload())
        .pipe(retry(3), catchError(this.handleError));
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(
        `Backend returned code ${error.status}, body was: `,
        error.error
      );
    }
    // Return an observable with a user-facing error message.
    return throwError('Something bad happened; please try again later.');
  }

  /**
   * Gets the selected album.
   *
   * @param id Album id
   * @returns an Album.
   */
  async getAlbum(id: number): Promise<Album> {
    try {
      console.log('id is:');
      console.log(id);
      console.log(this.albums);
      const album = this.albums?.find((album: Album) => {
        console.log(album);
        let albumID = Number(album.id);
        console.log(albumID);
        return albumID === id;
      });

      return album!;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /*async sanitizeImage(img: Image) {
    try {
      const jwt = this.accountService.currentUserValue.jwt;
      const jwt = this.accountService.user.jwt;
      const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
      let imageBlob = await lastValueFrom(
        this.http.get(img.image_url, { headers, responseType: 'blob' })
      );
      //.toPromise();
      console.log(imageBlob);
      imageBlob = imageBlob as Blob;
      let objectUrl = URL.createObjectURL(imageBlob);
      console.log('Made it all the way to tranform and back from backend');
      console.log(objectUrl);
      objectUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl) as string;
      return objectUrl;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }*/

  /**
   * Deletes selected image from a user's album.
   *
   * @param image Image to delete
   * @returns
   */
  async deleteImage(image: Image) {
    try {
      console.log('Made it to delete image service');
      console.log(image);

      const imageData = {
        image_id: image._id,
        image_url: image.image_url,
      };

      //Place  imageData object in http options (body), this is necessary because http.delete does not allow to pass body/object through a simple paramter.
      const options = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
        body: imageData,
      };

      const deletedImage = await lastValueFrom(
        this.http.delete(`${environment.apiUrl}/media/image`, options)
      );
      // .toPromise();
      console.log('should have made it back from the backend');
      console.log(deletedImage);
      const deletedImageIndex = await this.removeImageFromAlbum(deletedImage);

      return deletedImageIndex;

      // return deletedImage;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   *
   * Helper functions that should only be needed by this file.
   *
   */

  /**
   * Removes image from local storage and updates related Subscription.
   *
   * @param deletedImage Image that has been deleted from backend, that must now be removed from frontend.
   * @returns
   */
  async removeImageFromAlbum(deletedImage: any) {
    try {
      //Extract album id from image_url
      const albumID = deletedImage.image_url.split('/')[2];
      //Get album index
      const selectedAlbumIndex = this.albums!.findIndex((album: Album) => {
        return album.id === albumID;
      });

      //Find index of Deleted images
      const indexOfDeletedImage = this.albums![
        selectedAlbumIndex
      ].images.findIndex((image: Image) => {
        return image._id === deletedImage.image_id;
      });

      /**
       * console.log('In this');
        console.log(image._id);
        console.log(typeof image._id);
        console.log(deletedImage.image_id);
        console.log(typeof deletedImage.image_id);

       */
      console.log('Index of deleted image');
      console.log(indexOfDeletedImage);
      //Return a new images array 'updatedImages' with same images except the one we deleted on backend.
      /*const updatedImages = this.albums[selectedAlbumIndex].images.filter(
        (image: Image) => image._id !== deletedImage.image_id
      );*/
      //Update our image albums
      this.albums![selectedAlbumIndex].images.splice(indexOfDeletedImage, 1);
      //this.userSubject = this.accountService.currentUserSubject;
      this.userSubject = this.accountService.userSubject;
      //Replace images array with our new images array.
      //this.albums[selectedAlbumIndex].images = updatedImages;
      this.userSubject.value.albums = this.albums;
      localStorage.setItem('user', JSON.stringify(this.userSubject.value));
      this.userSubject.next(this.userSubject.value);

      return indexOfDeletedImage;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Updates Album Subject of a newly and corresponding image upload.
   *
   * @param imageData An array of objects, an object is made of an image url and an image title.
   * @returns
   */
  async updateAlbumSubject(imageData: Image[]) {
    try {
      console.log('albums are:');
      const albums = this.albums ? this.albums : [];
      console.log(this.albums);

      for (let i = 0; i < imageData.length; i++) {
        const albumID = imageData[i].image_url.split('/')[2];
        for (let j = 0; j < albums.length; j++) {
          if (albums[j].id === albumID) {
            albums[j].images.push(imageData[i]);
            //this.userSubject = this.accountService.currentUserSubject;
            this.userSubject = this.accountService.userSubject;
            this.userSubject.value.albums = albums; //this.albums;
            localStorage.setItem(
              'user',
              JSON.stringify(this.userSubject.value)
            );
            //this.userSubject.next(this.userSubject.value);
            this.accountService.userSubject.next(this.userSubject.value);
          }
        }
      }
      console.log('albums are:');
      console.log(this.albums);
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async imageLoading(image: HTMLElement) {
    try {
      console.log('Image loading');
      console.log(image);
      const imageString = image.outerHTML;
      //Static images will have class tags, dynamic images will not. Only track dynamically generated images
      const isStaticImage = imageString.includes('<img class=');
      if (
        (!this.images.has(image) && !isStaticImage) ||
        (this.images.get(image) && !isStaticImage)
      ) {
        this.images.set(image, false);
        // this.imagesLoading++;
        console.log('images loading', this.imagesLoading);
        this._imagesLoading.next(image);
        //this._imagesLoading.next(this.imagesLoading);
        return;
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getObjectUrl(url: string): Promise<string> {
    //return null;
    //const jwt = this.accountService.currentUserValue.jwt;
    const jwt = this.accountService.user.jwt;
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    try {
      /*let imageBlob = await this.http
        .get(url, { headers, responseType: 'blob' })
        .toPromise();*/
      let imageBlob = await lastValueFrom(
        this.http.get(url, { headers, responseType: 'blob' })
      );

      console.log(imageBlob);
      imageBlob = imageBlob as Blob;
      let objectUrl = URL.createObjectURL(imageBlob);
      console.log('Made it all the way to tranform and back from backend');
      console.log(objectUrl);
      objectUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl) as string;
      return objectUrl;
      //  return '';
    } catch (err) {
      console.log('there was an error');
      console.log(err);
      return '../../assets/global-images/fallback.png';
    }
  }

  async imageLoadedOrError(image: HTMLElement) {
    try {
      if (this.images.has(image) && !this.images.get(image)) {
        console.log('normal?');
        console.log(this.images);
        this.images.set(image, true);
        //this.imagesLoading--;
        console.log('images loading', this.imagesLoading);
        //this._imagesLoading.next(this.imagesLoading);
        this._imagesLoading.next(image);
      } /*else if (img.outerHTML.includes('<img')) {
        console.log('Something happened');
        console.log(img);
        this.images.set(img, true);
        this.imagesLoading--;
        console.log('images loading', this.imagesLoading);
        this._imagesLoading.next(this.imagesLoading);
      }*/
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
} //end class
