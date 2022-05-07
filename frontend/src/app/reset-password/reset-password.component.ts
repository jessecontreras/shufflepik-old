import { Component, ErrorHandler, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MatSnackBar,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { AccountService } from '../_services/account.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  //Login Form
  changePasswordForm!: FormGroup;
  //Boolean indicator of from submission
  submitted = false;
  //SnackBar vetical position
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  //Error message string
  error = '';
  //Placeholder for email
  passwordPlaceholder = 'Password';
  //Placeholder for password
  confirmPasswordPlaceholder = 'Confirm Password';
  //Prompt notifying user if passwords match
  passwordMatchPrompt = '';

  //url id
  urlId: string | null = '';

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.formSetup();
    this.doPasswordsMatch();
    this.getRouteParam();
  }

  /**
   * Convenience getter for form controls
   */
  get f() {
    return this.changePasswordForm.controls;
  }

  /**
   * Creates change password form as a FormBuilder group
   */
  formSetup() {
    this.changePasswordForm = this.fb.group({
      password: ['', Validators.required, Validators.minLength(5)],
      confirmPassword: ['', Validators.required, Validators.minLength(5)],
    });
  }

  async doPasswordsMatch() {
    try {
      this.changePasswordForm.valueChanges.subscribe((formControls) => {
        if (
          formControls.password.length > 0 &&
          formControls.confirmPassword.length > 0
        ) {
          formControls.password !== formControls.confirmPassword
            ? (this.passwordMatchPrompt = 'Passwords do not match')
            : (this.passwordMatchPrompt = '');
        } else {
          this.passwordMatchPrompt = '';
        }
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Submit reset password form.
   */
  async submit() {
    try {
      this.submitted = true;
      //TODO, create front end/template error messages
      //Password error check
      if (this.f['password'].errors) {
        this.f['password'].setValue('');
        this.passwordPlaceholder = '5 character password minimum';
        return;
      }
      //Confirm password error check
      if (this.f['confirmPassword'].errors) {
        this.f['confirmPassword'].setValue('');
        this.confirmPasswordPlaceholder = '5 character password minimum';
        return;
      }
      const passwordMatch = await this.doPasswordsMatch();

      if (this.passwordMatchPrompt.length > 0) {
        this.passwordMatchPrompt = 'Passwords must match';
        return;
      }

      const response = await this.accountService.resetPassword(
        `${this.urlId}`,
        this.f['password'].value
      );
      const snackBarRef = this.snackBar.open(JSON.stringify(response), 'OK', {
        verticalPosition: this.verticalPosition,
      });
      this.submitted = false;
      snackBarRef.afterDismissed().subscribe((action) => {
        if (action.dismissedByAction === true) {
          this.router.navigate(['/']);
        }
      });

      //TODO: SET UP FRONT END SERVICE/BACKEND PROCESSING FOR SUBMIT BUTTON.
      //CHECK AGAINST TOKEN AND IF USER HAS ALREADY USED TOKEN TO
      //RENDER IT UNUSABLE

      //this.submitted = false;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getRouteParam() {
    try {
      this.urlId = this.route.snapshot.paramMap.get('id');
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
} //End class
