import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Location } from '@angular/common';

import { AccountService } from '../_services/account.service';
import { MatSnackBar } from '@angular/material/snack-bar';

import { User } from '../_models/user.model';
import { Observable } from 'rxjs';
import { DiscordService } from '../_services/discord.service';

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

  currentUser!: User;

  queryParamsValue?: Observable<string>;

  //Route word check "enum"
  routerCharCheck = {
    Album: 'album',
    ValEmailPage: '',
    ValEmailErr: 'validateEmailError',
    ValEmailSuccess: 'validateEmailSuccess',
    BotDownload: 'thanks-bot-download',
    Login: 'login',
    Settings: 'user-settings',
    IntegrateUser: 'integrateUser',
    RefreshUserData: 'refreshUserData',
    IntegrateUserParams: 'home?integrateUser=',
    RefreshUserDataParams: 'home?refreshUserData=',
  };
  //System responses "enum"
  systemResponses = {
    ValidateEmailPrompt:
      'Click on "Send email" if you would like an email sent to you to verify your email. You will not be able to upload pictures if email is not validated.',
    ValidateEmailSuccess:
      'Thank you for validating your email! You are good to go 😎',
    ValidateEmailError:
      'Something went wrong with validating your email. Request another link or contact us if you think this is an error.',
  };

  /**
   * Toggles navigation card.
   * Must stop event propogation because there is a
   *
   * @param event Pointer event
   */
  /*toggleNavCard(event: any) {
    event.stopPropagation();
    console.log(event);
    this.navCardOpen = !this.navCardOpen;
    console.log(this.navCardOpen);
  }*/

  toggleNavCard(event: MouseEvent) {
    console.log(event);
    event.stopPropagation();
    console.log('open nav card');
    console.log(typeof event);
    this.navCardOpen = !this.navCardOpen;
  }

  closeNavCard(event: MouseEvent) {
    //event.stopPropagation();
    console.log('close nav card');
    this.navCardOpen = false;
  }

  /**
   * Logs user out of their account
   */
  logout() {
    this.accountService.logout();
  }

  ngOnInit(): void {
    this.userSubscription();
  }

  ngOnDestroy() {
    //this.accountService.currentUserSubject.unsubscribe();
  }

  async userSubscription() {
    try {
      this.accountService.userData$.subscribe((user) => {
        this.currentUser = user;
        console.log('Made it to user subscription in HEADER. USER IS:');
        console.log(user);
        this.userLoggedIn = user ? true : false;
        if (this.currentUser) {
          if (this.currentUser.discord.connected) {
            this.currentUser.discord.avatar = user.discord?.avatar;
            this.currentUser.discord.username = user.discord?.username;
          }
        }
      });

      /*try {
      this.accountService.currentUser.subscribe((user) => {
        //this.currentUser = userData;
        //this.routerEventSubscription();
        console.log('In the user subscription part of header');
        //console.log(userData);
        this.currentUser = user;
        console.log(this.currentUser);

        this.userLoggedIn = user ? true : false;
        //this.discordConnected = userData ? userData.discord_connected : false;
        if (this.currentUser) {
          if (this.currentUser.discord.connected) {
            this.currentUser.discord.avatar = user.discord?.avatar;
            this.currentUser.discord.username = user.discord?.username;
          }
        }
      });*/
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
          //this.navCardOpen = false;
          console.log('Router detection');
          console.log(event);
          //const parameterKey =
          //For whatever reason, toggleNavCard() is triggered on page load after logging in. Check for this and set navCardOpen to false
          if (event.url.match(`/`) && event.urlAfterRedirects.match(`/home`)) {
            this.navCardOpen = false;
          }
          if (
            event.url.includes(this.routerCharCheck.Album) ||
            event.url.match(`/${this.routerCharCheck.Settings}`)
          ) {
            console.log('Included album');
            this.displayBackButton = true;
          }
          if (event.url.match(`/${this.routerCharCheck.ValEmailErr}`)) {
            this.snackBar
              .open(this.systemResponses.ValidateEmailError, 'OK')
              .afterDismissed()
              .subscribe(() => {
                this.router.navigate(['/home']);
              });
          }
          if (event.url.match(`/${this.routerCharCheck.ValEmailSuccess}`)) {
            await this.accountService.updateEmailValidationStatus();
            this.emailValidationSuccessPage = true;
            this.snackBar
              .open(this.systemResponses.ValidateEmailSuccess, 'OK')
              .afterDismissed()
              .subscribe(() => {
                this.router.navigate(['/home']);
              });
          }
          if (event.url.match(`/${this.routerCharCheck.BotDownload}`)) {
            this.thanksBotDownloadPage = true;
          }
          if (event.url.match(`/${this.routerCharCheck.Login}`)) {
            this.loginPage = true;
          }
          if (
            event.url.includes(`${this.routerCharCheck.IntegrateUserParams}`)
          ) {
            const userData = event.url.substring(event.url.indexOf('=') + 1);
            await this.accountService.integrateAccounts(
              this.accountService.user._id,
              userData
            );
          }
          if (
            event.url.includes(`${this.routerCharCheck.RefreshUserDataParams}`)
          ) {
            const userData = event.url.substring(event.url.indexOf('=') + 1);
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

  /**
   * Displays option to re
   */
  async showSendEmailSnackbar() {
    try {
      let snackBarRef = this.snackBar
        .open(this.systemResponses.ValidateEmailPrompt, 'Send email', {
          duration: 7500,
        })
        .afterDismissed()
        .subscribe(async (sbData) => {
          if (sbData.dismissedByAction) {
            const serverResponse =
              await this.accountService.sendEmailValidation();
            this.snackBar.open(serverResponse, 'OK');
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
