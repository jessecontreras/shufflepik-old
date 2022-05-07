//Ng components and modules
import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  AbstractControl,
} from '@angular/forms';
//import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountService } from '../_services/account.service';
import { SpSnackBarService } from '../_services/sp-snackbar.service';
//Local components and modules

//Services
//Models
//Third party modules

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent implements OnInit {
  //forgotPasswordForm!: FormGroup;
  //Form submission flag
  submitted = false;
  //Placeholder text for email input
  emailPlaceholderText: string = 'Email';

  //Reset email form
  forgotPasswordForm = this.fb.group({
    resetPasswordEmail: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private _snackBar: SpSnackBarService, //MatSnackBar,
    private accountService: AccountService
  ) {}

  ngOnInit() {
    //this.formSetup();
  }

  /**
   * Convenience getter for easy access to form fields.
   */
  get f(): { [key: string]: AbstractControl } {
    return this.forgotPasswordForm.controls;
  }

  /**
   * Submits email form.
   */
  async submit() {
    try {
      this.submitted = true;
      //Email error check
      if (this.f['resetPasswordEmail'].errors) {
        this.f['resetPasswordEmail'].reset();
        this.emailPlaceholderText = 'Please enter a valid email';
        return;
      }
      //Use account service to send email reset instructions
      const response = await this.accountService.sendResetPasswordEmail(
        this.f['resetPasswordEmail'].value
      );
      //Open snackbar and configure options
      /* this.snackBar.open(
        'If the email you entered exists in our system we will send an email with password reset instructions 📧',
        'OK',
        {
          verticalPosition: 'top',
        }
      );*/
      this._snackBar.openSnackBar(
        'If the email you entered exists we wills end an email with password reset instructions',
        'OK',
        'mail',
        5
      );
      //Set submit flag back to false
      this.submitted = false;
      //Reset input field.
      this.f['resetPasswordEmail'].reset();
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
