import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Album } from '../_models/album.model';
import { MediaService } from '../_services/media.service';
import { DialogService } from '../_services/dialog.service';
import { DialogData } from '../_models/dialog.model';
import { Image } from '../_models/image.model';
import { AccountService } from '../_services/account.service';
import { User } from '../_models/user.model';

@Component({
  selector: 'app-album',
  templateUrl: './album.component.html',
  styleUrls: ['./album.component.scss'],
})
export class AlbumComponent implements OnInit {
  //Album
  album!: Album;
  //Album id
  albumId?: number;
  //Delete image flag
  deleteImage: boolean = false;
  //Display image overlay flag
  displayImageOverlay: boolean = false;
  //Image loading flag
  imagesDoneLoading?: boolean = false;
  //Image index
  imageIndex!: number | null;
  //This will be a reference array filled with index values that represent an existing image value
  sanitizedAlbumImages: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private mediaService: MediaService,
    private location: Location,
    private dialogService: DialogService,
    private accountService: AccountService
  ) {}

  /**
   * Initialization lifecycle hook called after data bound properties established.
   * Async to ensure that all subscription values are gathered before imageLoadCheck()
   */
  async ngOnInit() {
    try {
      await this.albumSubscription();
      await this.sanitizeImages();
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async albumSubscription() {
    try {
      /*this.mediaService.imageAlbums.subscribe(async (albumInfo: any) => {
        console.log('So this was called');
        this.albumId = Number(this.route.snapshot.paramMap.get('id'));
        this.album = albumInfo.find((album: any) => {
          return this.albumId === Number(album.id);
        });
      });*/
      /* this.accountService.currentUser.subscribe((user: User) => {
        console.log('Inside of albumsubscription');
        console.log(user);
        this.albumId = Number(this.route.snapshot.paramMap.get('id'));
        this.album = user.albums?.find((album) => {
          return this.albumId === Number(album.id);
          // return this.albumId === Number(album.id);
        })!;
      });*/

      this.accountService.userData$.subscribe((user: User) => {
        console.log('inside of account subscription:');
        console.log(user);
        this.albumId = Number(this.route.snapshot.paramMap.get('id'));
        this.album = user.albums?.find((album: Album) => {
          console.log(this.album);
          return this.albumId === Number(album.id);
        })!;
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Sanitizes images and assings images to respective album.
   */
  async sanitizeImages() {
    try {
      console.log('Inside of image load check');
      console.log(this.album);
      const imageLocPrefix = `http://localhost:4000`;
      for (let i = 0; i < this.album.images.length; i++) {
        console.log(this.album.images[i].image_url);
        const sanitizedUrl = await this.mediaService.getObjectUrl(
          `${imageLocPrefix}${this.album.images[i].image_url}`
        );
        this.sanitizedAlbumImages.push(sanitizedUrl);
      }
      console.log(this.sanitizedAlbumImages);
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Opens a dialog with the selected image as background.
   */
  async openImageDialog(imageData: DialogData) {
    try {
      console.log('image is:');
      console.log(imageData);

      this.dialogService.openDialog(imageData);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Displays displayImageOverlay flag.
   * @param index Image index, a number.
   */
  async displayOverlay(index: number) {
    try {
      console.log('display overlay triggered');
      this.imageIndex = index;
      this.displayImageOverlay = true;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  /**
   * Displays displayImageOverlay flag.
   * @param index Image index, a number.
   */
  async hideOverlay() {
    try {
      this.displayImageOverlay = false;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Deletes selected image
   * @param image Image object
   */
  async deleteSelectedImage(image: Image) {
    try {
      console.log('Made it to delete selected image');
      console.log(image);

      const deletedImageIndex: any = await this.mediaService.deleteImage(image);
      console.log(deletedImageIndex);
      console.log('Should be updated');
      this.sanitizedAlbumImages.splice(deletedImageIndex, 1);
      this.deleteImage = false;

      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  toggleDeleteImage() {
    //this.deleteImage = !this.deleteImage;
  }

  /**
   * Sets delete image flag to true. Uses image index to determine which image is selected.
   * @param index  Image index, a number.
   */
  deleteImageTrue(index: number) {
    console.log('YO YOU CLICKED THIS');
    this.deleteImage = true;
    this.imageIndex = index;
  }
  /**
   * Sets delete image flag to false.
   */
  deleteImageFalse() {
    this.deleteImage = false;
    this.imageIndex = null;
  }

  goBack(): void {
    this.location.back();
  }
}
