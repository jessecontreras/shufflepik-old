import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TooltipPosition } from '@angular/material/tooltip';
import { FaqComponent } from '../faq/faq.component';
import { User } from '../_models/user.model';
import { AccountService } from '../_services/account.service';
import { DiscordService } from '../_services/discord.service';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss'],
})
export class UserSettingsComponent implements OnInit {
  constructor(
    private accountService: AccountService,
    private discordService: DiscordService,
    public dialog: MatDialog
  ) {}
  //Current user
  user!: User;
  //Flag that prompts conformation of account deletion
  deleteAccountPrompt: boolean = false;
  //Positions tooltip above target element
  tooltipPosition: TooltipPosition = 'above';

  /**
   * Subscribe to account subscription to return user.
   */
  async userSubscription() {
    try {
      this.accountService.userData$.subscribe((user: User) => {
        this.user = user;
      });
      /*this.accountService.currentUser.subscribe((user) => {
        this.user = user;
      });*/
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

  /**
   * Open the link of a url in a new tab.
   *
   * @param url url of a link.
   */
  async openLink(url: string) {
    window.open(url, '_blank');
  }

  async promptAccountDeletion() {
    try {
      this.deleteAccountPrompt = true;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Sets deleteAccountPrompt flag to false.
   */
  async undoDeleteAccount() {
    try {
      this.deleteAccountPrompt = false;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Opens Faq dialog.
   */
  async openFaqDialog() {
    this.dialog.open(FaqComponent);
  }

  /**
   * Deletes a user account.
   */
  async deleteAccount() {
    try {
      await this.accountService.delete(this.accountService.user._id);

      this.accountService.logout();
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  ngOnInit(): void {
    this.userSubscription();
  }
}
