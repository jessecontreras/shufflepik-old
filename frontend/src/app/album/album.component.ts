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
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-album',
  templateUrl: './album.component.html',
  styleUrls: ['./album.component.scss'],
})
export class AlbumComponent implements OnInit {
  //Album
  //album!: Album;
  //Album id
  //albumId?: number;
  images: Image[] = [];
  //Delete image flag
  deleteImage: boolean = false;
  //Display image overlay flag
  displayImageOverlay: boolean = false;
  //Image loading flag
  imagesDoneLoading?: boolean = false;
  //Image index
  imageIndex!: number | null;
  //This will be a reference array filled with index values that represent an existing image value
  //sanitizedAlbumImages: string[] = [];
  sanitizedImages: string[] = [];

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
      await this.getImages();
      await this.imageSubscription();
      await this.sanitizeImages();

      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async imageSubscription() {
    try {
      const albumId = this.route.snapshot.paramMap.get('id')!.toString();
      let currentAlbum: Album;

      for (let i = 0; i < this.accountService.user.albums?.length!; i++) {
        if (this.accountService.user.albums![i].id === albumId) {
          currentAlbum = this.accountService.user.albums![i];
          break;
        }
      }
      this.images = currentAlbum!.images.slice().reverse();
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getImages() {
    try {
      await this.accountService.getImages(
        this.route.snapshot.paramMap.get('id')!
      );
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
      const imageLocPrefix = environment.apiUrl;
      /*for (let i = 0; i < this.album.images.length; i++) {
        const sanitizedUrl = await this.mediaService.getObjectUrl(
          `${imageLocPrefix}${this.album.images[i].image_url}`
        );
        this.sanitizedAlbumImages.push(sanitizedUrl);
      }*/
      for (let i = 0; i < this.images.length; i++) {
        const sanitizedUrl = await this.mediaService.getObjectUrl(
          `${imageLocPrefix}${this.images[i].image_url}`
        );
        this.sanitizedImages.push(sanitizedUrl);
      }
      //reverse the order of images from oldest to newest to newest to older
      //this.sanitizedAlbumImages = this.sanitizedAlbumImages.slice().reverse();
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
      const deletedImageIndex: any = await this.mediaService.deleteImage(image);
      //this.sanitizedAlbumImages.splice(deletedImageIndex, 1);
      this.sanitizedImages.splice(deletedImageIndex, 1);
      this.deleteImage = false;
      //Now that the image has been deleted, we remove overlay
      await this.hideOverlay();
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
