//Ng components and modules
import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountService } from '../_services/account.service';
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
  //resetEmailForm!: FormGroup;
  //Form submission flag
  submitted = false;
  //Placeholder text for email input
  emailPlaceholderText: string = 'Email';

  //Reset email form
  resetEmailForm = this.fb.group({
    resetPasswordEmail: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private accountService: AccountService
  ) {}

  ngOnInit() {
    //this.formSetup();
  }

  /**
   * Convenience getter for easy access to form fields.
   */
  get f(): { [key: string]: AbstractControl } {
    return this.resetEmailForm.controls;
  }

  /**
   * Creates new FormGroup instance and options.
   */
  /*async formSetup() {
    try {
      this.resetEmailForm = this.fb.group({
        resetPasswordEmail: ['', [Validators.required, Validators.email]],
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }*/

  /**
   * Submits email form.
   */
  async submit() {
    try {
      console.log('Made it to submit');
      console.log(this.f);
      ///console.log( .resetPasswordEmail);
      this.submitted = true;
      //Email error check
      if (this.f['resetPasswordEmail'].errors) {
        this.f['resetPasswordEmail'].reset();
        this.emailPlaceholderText = 'Please enter a valid email';
        return;
      }
      console.log('Email is:');
      console.log(this.f['resetPasswordEmail'].value);
      //Use account service to send email reset instructions
      const response = await this.accountService.sendResetPasswordEmail(
        this.f['resetPasswordEmail'].value
      );

      console.log(response);

      //Open snackbar and configure options
      this.snackBar.open(
        'If the email you entered exists in our system we will send an email with password reset instructions 📧',
        'OK',
        {
          verticalPosition: 'top',
        }
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
