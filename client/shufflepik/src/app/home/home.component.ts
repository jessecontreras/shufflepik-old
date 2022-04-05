import { Component, ViewChild, ElementRef, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { take } from 'rxjs/operators';
import { interval, timer } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';

//import { FileSizeValidator } from '@app/_validators/file-size.validator';

import { Subscription } from 'rxjs';
import { Upload } from '../_helpers/upload';
import { User } from '../_models/user.model';
import { DialogData } from '../_models/dialog.model';
import { WelcomeMessageGeneratorService } from '../_services/welcome-message-generator';
import { MediaService } from '../_services/media.service';
import { AccountService } from '../_services/account.service';
import { DiscordService } from '../_services/discord.service';
import { DialogService } from '../_services/dialog.service';
import { ConnectivityService } from '../_services/connectivity.service';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  constructor(
    public fb: FormBuilder,
    private mediaService: MediaService,
    private snackBar: MatSnackBar,
    private accountService: AccountService,
    private discordService: DiscordService,
    private dialogService: DialogService,
    private messageGenerator: WelcomeMessageGeneratorService,
    private connectivityService: ConnectivityService
  ) {
    //this.userSubcsription();
    this.dataConnectivitySubscription();
  }

  @ViewChild('fileInput')
  fileInput!: ElementRef;
  @ViewChild('cancelUpload') cancelUpload!: ElementRef;
  //Message for upload, can be error or successful message
  uploadImageMessage: string | null = null;
  //URL for image preview
  imgUrl: any; //string | ArrayBuffer | null = null;
  //Image preview flag
  imagePreview: boolean = false;
  //File selected to upload
  selectedFile!: Blob;
  //File name
  selectedFileName!: string;
  //Form used to upload image
  uploadForm!: FormGroup;
  //Subscription for upload file
  private fileSubscription: Subscription | undefined;
  //Upload, variable to update us on upload progress
  upload: Upload | undefined;
  //this will be the progress bar value
  simulatedProgressValue: number = 0;
  //Timer interval
  timerInterval: any;
  //Do you simulate progress bar or not?
  simulateProgress!: boolean;
  //Informs when progress bar is done.
  progressComplete: boolean = false;
  //Informs if user has Discord connected to Shufflepik
  discordConnected!: boolean;
  //Informs if user is ready to upload
  navigateToUpload: boolean = false;
  //Informs if user wants to move back from upload to guild sleection
  navigateToGuildSelection: boolean = false;
  //Timer value
  timerValue: number = 2500;
  //Informs if guild has been selected to upload image
  selectedGuilds: Array<any> = []; //string;
  //If user is new send them a welcome message
  welcomeMessage!: string;
  //Is the user connected to the internet
  userHasDataConnection!: boolean;
  //Upload error message enumeration
  UploadErrorMessage = {
    UnacceptableFileType: 'Woah, allowed files only please',
    UnacceptableFileSize: 'File must be under 10MB',
  };
  //Backend user key event names
  UserKeyEvent = {
    IntegrateUser: 'integrateUser',
    RefreshUserData: 'refreshUserData',
  };
  //Maximum size for an image file
  maxFileSize = 10000000; //10 MBs
  //Discord user object
  @Input() currentUser!: User;

  ngOnInit() {
    this.reactiveUploadForm();
    this.userSubcsription();
    this.generateWelcomeMessage();
    this.dataConnectivitySubscription();
  }

  /**
   * Generates a welcome message if user does not have discord connected.
   */
  async generateWelcomeMessage() {
    try {
      if (this.currentUser.discord) {
        if (!this.currentUser.discord.connected) {
          this.welcomeMessage =
            await this.messageGenerator.generateWelcomeMessage();
        }
      }
    } catch (err) {}
  }

  async dataConnectivitySubscription() {
    try {
      this.connectivityService.connectionStatus$.subscribe((isConnected) => {
        console.log('Does user have data connection?');
        console.log(isConnected);
        this.userHasDataConnection = isConnected;
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async userSubcsription() {
    try {
      this.accountService.userData$.subscribe((user) => {
        if (user) {
          this.currentUser = user;
          if (user.discord?.connected) {
            (this.currentUser._id = this.accountService.user._id),
              (this.currentUser.discord!.username = user.discord.username);
            this.currentUser.discord!.guilds = user.discord.guilds;
            this.currentUser.discord!.avatar = user.discord.avatar;
          }
        }
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  reactiveUploadForm() {
    this.uploadForm = this.fb.group({
      image: [''],
      imageTitle: ['', [Validators.required]],
    });
  }

  async uploadFileEvt(imageFile: any) {
    //If user doesn't have data connection don't bother with uploading image.
    let targetFile = imageFile.target
      ? imageFile.target.files[0]
      : imageFile[0];
    if (!this.userHasDataConnection) {
      this.imagePreview = false;
      this.navigateToGuildSelection = false;
      return;
    }
    //Checks file extension.
    const acceptableFileType = await this.checkImageExt(targetFile);
    const acceptableFileSize = await this.checkImageFileSize(targetFile);
    if (!acceptableFileType) {
      this.imagePreview = false;
      this.uploadImageMessage = this.UploadErrorMessage.UnacceptableFileType;
      this.navigateToGuildSelection = false;
      return;
    }
    if (!acceptableFileSize) {
      this.imagePreview = false;
      this.uploadImageMessage = this.UploadErrorMessage.UnacceptableFileSize;
      this.navigateToGuildSelection = false;
      return;
    }

    if (targetFile) {
      /*Read file to preview image. Following lines of code print out image to screen.*/
      let reader = new FileReader();
      reader.readAsDataURL(targetFile);
      reader.onload = (_event) => {
        this.imgUrl = reader.result;
        console.log(this.imgUrl);
      };
      //Set bool value for message to false. No reason to prompt user to do something they're in the process of doing.
      this.uploadImageMessage = null;
      //Assign selected file name. Will iterate through file properties object and assign file name to our varible selectedFileName.
      Array.from(targetFile).forEach((file: any) => {
        this.selectedFileName += file.name + '';
      });
      //Assign selected file to the file that user selected to be uploaded
      this.selectedFile = targetFile;
      //Set bool value for image preview to true. This activates the image preview.
      this.imagePreview = true;
      //Set bool value for image preview to true. This allows user to see their guilds.
      this.navigateToGuildSelection = true;
      // Reset if duplicate image uploaded again
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * Simulates progress bar. Function runs when
   */
  async runProgressBar() {
    try {
      this.simulateProgress = true;
      const numbers = interval(50);
      const takeTwenty = numbers.pipe(take(20));
      takeTwenty.subscribe(() => {
        if (this.simulatedProgressValue <= 100) {
          this.simulatedProgressValue += 5;
          if (this.simulatedProgressValue == 100) {
            this.snackBar.open('Picture uploaded successfully ✅  🎉', 'OK', {
              duration: this.timerValue,
            });
            return;
          }
        }
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Upload the selected file via mediaService upload function.
   * Subscription will check if progress is too fast, if so progress bar will be simulated, otherwise
   * progress bar will reflect actual progress.
   */
  async uploadFile() {
    try {
      //If upload form is invalid
      if (!this.uploadForm.valid) {
        this.uploadImageMessage = null;
        return;
      }

      const formData = await this.appendFormData();

      //Defines when upload starts
      let startTime = new Date().getTime();
      //this.mediaService.uploadImage(formData);
      //Upload service
      this.mediaService.uploadImage(formData).subscribe(async (file) => {
        console.log('Make it back from upload image');
        console.log(file);
        this.upload = file;
        if (file.http_response.errorResponse) {
          this.snackBar
            .open(file.http_response.errorResponse, 'OK')
            .afterDismissed()
            .subscribe(() => {
              this.resetUpload();
            });
        }
        if (this.upload.state != 'PENDING') {
          if (file.progress > 0 && file.progress <= 25) {
            console.log(new Date().getTime() - startTime);
            if (new Date().getTime() - startTime <= 250) {
              if (this.simulatedProgressValue == 0) {
                console.log('So this will not be simulated');
                this.simulateProgress = false;
              }
            }
          }
          if (
            this.simulateProgress !== true &&
            this.simulateProgress !== false &&
            !file.http_response.errorResponse
          ) {
            console.log('Simulate is true');
            await this.mediaService.updateAlbumSubject(
              file.http_response.updatedImages
            );
            await this.runProgressBar();
            //Reset upload form after enough time has passed after snackbar notification.
            const wait = timer(this.timerValue);
            wait.subscribe(() => {
              this.resetUpload();
            });
            console.log('File is:');
            console.log(file);
            //return;
          }
          if (
            this.simulateProgress == false &&
            !file.http_response.errorResponse
          ) {
            console.log('Made it here, no simulated');
            this.simulatedProgressValue = this.upload.progress;
            if (file.progress === 100) {
              await this.mediaService.updateAlbumSubject(
                file.http_response.updatedImages
              );

              this.snackBar
                .open('Picture uploaded successfully ✅  🎉', 'OK', {
                  duration: this.timerValue,
                })
                .afterDismissed()
                .subscribe(() => {
                  this.resetUpload();
                });
            }
          }
        }
      });
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Opens a dialog with the selected image as background.
   */
  async openImageDialog(imageData: any) {
    try {
      console.log('image is:');
      console.log(imageData);
      const dialogData: DialogData = {
        title: '📸  🌃  😎  🌄  💅  🌅  💪  💁‍♀️  🤳  🕺  🐈  🪞  😆',
        image_url: imageData,
        date_posted: '',
      };
      this.dialogService.openDialog(dialogData);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async appendFormData() {
    try {
      //Form data object will be used to send image to service
      let formData = new FormData();
      //Append data
      this.selectedGuilds.forEach((guild, index) => {
        formData.append(`guild_${index}`, `${guild}`);
      });
      formData.append('uploaded_by_id', this.currentUser?._id),
        formData.append(
          `uploaded_by_discord_username`,
          `${this.currentUser?.discord?.username}`
        );
      formData.append('image_title', this.uploadForm.get('imageTitle')!.value);
      formData.append('image', this.selectedFile, this.selectedFileName);

      return formData;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Adds a guild id to selectedGuilds array, thus highlighting the element.
   * If id exists in array remove from array, this means the user is de-selecting a selected element.
   *
   * @param id - Guild ID
   */
  async selectGuild(id: string) {
    try {
      console.log('Guild selected');
      const indexOfElement = this.selectedGuilds.indexOf(id);
      if (indexOfElement > -1) {
        this.selectedGuilds.splice(indexOfElement, 1);
      } else {
        this.selectedGuilds.push(id);
      }
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Toggles navigateToUpload boolean.
   */
  async navToUpload() {
    try {
      this.navigateToGuildSelection = false;
      this.navigateToUpload = !this.navigateToUpload;
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Toggles navigateToGuildSelection boolean.
   */
  async navToGuildSelection() {
    try {
      this.navigateToUpload = false;
      this.navigateToGuildSelection = !this.navigateToGuildSelection;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  resetUpload() {
    this.uploadForm.reset();
    this.imagePreview = false;
    this.progressComplete = false;
    this.upload = undefined;
    this.simulateProgress = false;
    this.simulatedProgressValue = 0;
    this.selectedFile = new Blob(); //this was changed from false to new Blob
    this.navigateToGuildSelection = false;
    this.imgUrl = null;
    this.navigateToUpload = false;
    this.selectedGuilds = [];
  }

  /**
   * Checks for suitable image extensions.
   *
   * @param imageFile An image file
   * @returns boolean specifying whether image is acceptable file type.
   */
  async checkImageExt(imageFile: any) {
    try {
      const mimeType = imageFile.type;
      console.log('Imagefile is:');
      console.log(imageFile);
      if (
        mimeType == 'image/jpg' ||
        mimeType == 'image/jpeg' ||
        mimeType == 'image/png'
      )
        return true;

      return false;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * File size checker, ensures files are lower than max file size, returns false if not.
   *
   * @param {file} file - More than likely an image file.
   * @returns {boolean} flag .
   */
  async checkImageFileSize(imageFile: any) {
    try {
      console.log('Inside of check image file size');
      console.log(imageFile);
      const isFileAcceptableSize =
        imageFile.size >= this.maxFileSize ? false : true;
      console.log(isFileAcceptableSize);
      return isFileAcceptableSize;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Sends user to Discord Access Page where the user integration process begins.
   */
  async connectDiscord() {
    try {
      this.discordService.redirectToDiscordAccessPage();
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
