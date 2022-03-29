import { Component, OnInit } from '@angular/core';
import { Album } from '../_models/album.model';

//Media service to handle CRUD operations on media (pictures at this point)
//Add subscription to subscribe to an event
import { MediaService } from '../_services/media.service';
import { AccountService } from '../_services/account.service';
import { Subscription } from 'rxjs';
import { User } from '../_models/user.model';
@Component({
  selector: 'app-photo-albums',
  templateUrl: './photo-albums.component.html',
  styleUrls: ['./photo-albums.component.scss'],
})
export class PhotoAlbumsComponent implements OnInit {
  //User albums will be an array
  albums: Album[] = [];
  //Image reference
  imagePrefix = `http://localhost:4000`;
  //CSS classes for masonry grid
  masonCSS = ['wide', 'tall', 'big'];
  //Array of randomly assigned classes
  masonClasses: string[] = [];
  //Array of url strings
  albumCovers: string[] = [];

  //constructor(private mediaService: MediaService) {}
  constructor(
    private accountService: AccountService,
    private mediaService: MediaService
  ) {}

  async ngOnInit() {
    try {
      await this.manageMediaSubscriptions();
      await this.assignMansonryClassesToClassArray();
      await this.sanitizeImages();
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  ngOnDestroy() {
    //this.subscription.unsubscribe();
    //this.manageMediaSubscriptions
  }
  /**
   * Sanitizes images and assings the last image of an album as an album cover.
   * If a user's
   */
  async sanitizeImages() {
    try {
      console.log('Inside of image load check');
      const imageLocPrefix = `http://localhost:4000`;
      for (let i = 0; i < this.albums.length; i++) {
        const imageExists = this.albums[i].images[
          this.albums[i].images.length - 1
        ]
          ? true
          : false;
        console.log('Does image exists?');
        console.log(imageExists);
        if (imageExists) {
          const albumCover = await this.mediaService.getObjectUrl(
            `${imageLocPrefix}${
              this.albums[i].images[this.albums[i].images.length - 1].image_url
            }`
          );

          this.albumCovers.push(albumCover);
        } else {
          this.albumCovers.push('false');
        }
      }
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async manageMediaSubscriptions() {
    try {
      console.log('Inside of manage media');
      this.accountService.userData$.subscribe((user: User) => {
        console.log(user);
        this.albums = user.albums!;
      });
      /*this.accountService.currentUser.subscribe((user) => {
        this.albums = user.albums!;
      });*/
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  //------!!!!!TODO: When a user first integrates their account
  //THEY DO NOT HAVE THEIR GUILDS DOWNLOADED, YOU MUST DO THIS, RETURN THEIT GUILDS
  //AND PASS THEM ALONG IMAGE ALBUMS SUBJECT
  //------!!!!!

  async assignMansonryClassesToClassArray() {
    try {
      for (let i = 0; i < this.albums.length; i++) {
        this.masonClasses.push(
          this.masonCSS[Math.floor(Math.random() * this.masonCSS.length)]
        );
        console.log(this.masonClasses);
      }
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
