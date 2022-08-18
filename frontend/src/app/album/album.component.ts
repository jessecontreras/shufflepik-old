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
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';

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
  //
  loadingImages: any[] = [];

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

  async imageLoaded(index: number) {
    console.log(`Image with index of ${index} is loaded`);
    this.loadingImages[index].loaded = true;
  }

  async imageSubscription() {
    try {
      const albumId = this.route.snapshot.paramMap.get('id')!.toString();
      let currentAlbum: Album;
      console.log('Made it to subscription');

      for (let i = 0; i < this.accountService.user.albums?.length!; i++) {
        if (this.accountService.user.albums![i].id === albumId) {
          this.loadingImages = [
            ...Array(this.accountService.user.albums![i].images.length).fill({
              loaded: false,
            }),
          ];
          currentAlbum = this.accountService.user.albums![i];
          break;
        }
      }
      console.log('Time to reassign images');
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
      const deletedImageIndex: number = await this.mediaService.deleteImage(
        image
      );
      const reversedIndexValue = this.images.length - 1 - deletedImageIndex;

      //this.images.splice(deletedImageIndex, 1);
      //this.sanitizedImages.splice(deletedImageIndex, 1);
      this.images.splice(reversedIndexValue, 1);
      this.sanitizedImages.splice(reversedIndexValue, 1);
      this.deleteImage = false;
      //Now that the image has been deleted, we remove overlay
      await this.hideOverlay();
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  toggleDeleteImage() {}

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
