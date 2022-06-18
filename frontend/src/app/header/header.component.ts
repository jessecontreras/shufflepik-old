import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterEvent,
} from '@angular/router';
import { Location } from '@angular/common';

import { AccountService } from '../_services/account.service';
import {
  MatSnackBar,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

import { User } from '../_models/user.model';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit {
  constructor(
    private accountService: AccountService,
    private router: Router,
    private location: Location,
    private snackBar: MatSnackBar
  ) {
    this.routerUrlDetection();
  }
  //Navigation card flag
  navCardOpen: boolean = false;
  //Flag that checks that user is logged in
  userLoggedIn: boolean = false;
  //Send verify email flag
  emailVerifySubmitted: boolean = false;
  //Display back button boolean
  displayBackButton: boolean = false;
  //Notifies us if user's Discord i connected
  discordConnected: boolean = false;
  //Flag for email validation success page
  emailValidationSuccessPage: boolean = false;
  //Flag for the Thanks Bot Download Page
  thanksBotDownloadPage: boolean = false;
  //Flag for login page
  loginPage: boolean = false;
  //Flag for reset password page
  resetPasswordPage: boolean = false;
  //verticakl position of snackBar
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  //previousUrl
  previousUrl!: string;
  //currentUrl
  currentUrl!: string;
  //user
  user!: User;

  queryParamsValue?: Observable<string>;

  //Route word check "enum"
  routerCharCheck = {
    Album: 'album',
    ValEmailPage: '',
    ValEmailErr: 'validateEmailError',
    ValEmailSuccess: 'email-validation-successful',
    BotDownload: 'thanks-bot-download',
    Home: 'home',
    Login: 'login',
    Settings: 'user-settings',
    IntegrateUser: 'integrateUser',
    RefreshUserData: 'refreshUserData',
    IntegrateUserParams: 'home?integrateUser=',
    RefreshUserDataParams: 'home?refreshUserData=',
    ResetPassword: 'reset-password',
  };
  //System responses "enum"
  systemResponses = {
    ValidateEmailPrompt:
      'Click on "Send email" if you would like an email sent to verify your email.',
    ValidateEmailSuccess:
      'Thank you for validating your email! You are good to go 😎',
    ValidateEmailError:
      'Something went wrong with validating your email. Request another link or contact us if you believe this is an error.',
  };

  ngOnInit(): void {
    this.userSubscription();
  }

  /**
   * Toggles navigation card.
   * Must stop event propogation because there is a
   *
   * @param event Pointer event
   */
  toggleNavCard(event: MouseEvent) {
    event.stopPropagation();
    this.navCardOpen = !this.navCardOpen;
  }

  closeNavCard(event: MouseEvent) {
    this.navCardOpen = false;
  }

  /**
   * Logs user out of their account
   */
  logout() {
    this.accountService.logout();
  }

  async userSubscription() {
    try {
      this.accountService.userData$.subscribe((user) => {
        this.user = user;
        this.userLoggedIn = user ? true : false;
        if (this.user) {
          if (this.user.discord.connected) {
            //If image name is null use default avatar
            let avatarNameIndex = this.user.discord.avatar!.lastIndexOf('/');
            let avatarNameAndExt = this.user.discord.avatar?.substring(
              avatarNameIndex + 1
            );
            this.user.discord.avatar = avatarNameAndExt?.includes('null.')
              ? '../../assets/global-images/discord-placeholder.png'
              : this.user.discord.avatar;
          }
        }
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async toggleBackButton() {
    try {
      this.displayBackButton = !this.displayBackButton;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Detects and checks for reserved routes for relative response.
   */
  async routerUrlDetection() {
    try {
      this.router.events.subscribe(async (event) => {
        if (event instanceof NavigationEnd) {
          //Reset all values on navigatiom change, these properties are stateless between navigation.
          this.displayBackButton = false;
          this.loginPage = false;
          this.thanksBotDownloadPage = false;
          this.emailValidationSuccessPage = false;
          //For whatever reason, toggleNavCard() is triggered on page load after logging in. Check for this and set navCardOpen to false
          // if (event.url.match(`/`) && event.urlAfterRedirects.match(`/home`)) {
          //Keep track of our previously visited url
          this.previousUrl = this.currentUrl;
          //Keep track of our current url
          this.currentUrl = event.url;
          if (this.currentUrl.match(`/`)) {
            this.resetPasswordPage = false;
            this.thanksBotDownloadPage = false;
            this.emailValidationSuccessPage = false;
            if (event.urlAfterRedirects.match(`/home`)) {
              this.navCardOpen = false;
            }
          }

          //Navigation is at home but not after login nor after redirect from a non shufflepik page
          if (
            this.currentUrl.match(`/${this.routerCharCheck.Home}`) &&
            this.previousUrl &&
            !this.previousUrl.includes(`${this.routerCharCheck.Login}`)
          ) {
            //this.accountService.getGuilds();
            this.accountService.getUser();
          }
          if (
            this.currentUrl.includes(this.routerCharCheck.Album) ||
            this.currentUrl.match(`/${this.routerCharCheck.Settings}`)
          ) {
            this.displayBackButton = true;
          }
          if (this.currentUrl.match(`/${this.routerCharCheck.ValEmailErr}`)) {
            this.snackBar
              .open(this.systemResponses.ValidateEmailError, 'OK', {
                verticalPosition: this.verticalPosition,
              })
              .afterDismissed()
              .subscribe(() => {
                this.router.navigate(['/home']);
              });
          }
          if (
            this.currentUrl.match(`/${this.routerCharCheck.ValEmailSuccess}`)
          ) {
            await this.accountService.updateEmailValidationStatus();
            this.emailValidationSuccessPage = true;
          }
          if (this.currentUrl.match(`/${this.routerCharCheck.BotDownload}`)) {
            this.thanksBotDownloadPage = true;
          }
          if (this.currentUrl.match(`/${this.routerCharCheck.Login}`)) {
            this.loginPage = true;
          }
          if (
            this.currentUrl.includes(`${this.routerCharCheck.ResetPassword}`)
          ) {
            this.resetPasswordPage = true;
          }
          if (
            this.currentUrl.includes(
              `${this.routerCharCheck.IntegrateUserParams}`
            )
          ) {
            const userData = this.currentUrl.substring(
              this.currentUrl.indexOf('=') + 1
            );
            const userIntegrated = await this.accountService.integrateAccounts(
              this.accountService.user._id,
              userData
            );
            if (userIntegrated !== true) {
              this.snackBar.open(userIntegrated, 'OK', {
                verticalPosition: this.verticalPosition,
              });
            }
          }
          if (
            this.currentUrl.includes(
              `${this.routerCharCheck.RefreshUserDataParams}`
            )
          ) {
            const userData = this.currentUrl.substring(
              this.currentUrl.indexOf('=') + 1
            );
            this.accountService.refreshUserData(
              this.accountService.user._id,
              userData
            );
          }
        }
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async inviteSp() {
    window.location.href = environment.botInvitationLink;
  }

  /**
   * Displays option to re
   */
  async showSendEmailSnackbar() {
    try {
      this.snackBar
        .open(this.systemResponses.ValidateEmailPrompt, 'Send email', {
          verticalPosition: this.verticalPosition,
          duration: 7500,
        })
        .afterDismissed()
        .subscribe(async (sbData) => {
          if (sbData.dismissedByAction) {
            const serverResponse =
              await this.accountService.sendEmailValidation();
            this.snackBar.open(serverResponse, 'OK', {
              verticalPosition: this.verticalPosition,
            });
          }
        });
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  goBack(): void {
    this.location.back();
  }
}
