//Ng (-material) components and modules
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
//Local modules and components
import { RegisterComponent } from '../register/register.component';

//Services
import { AccountService } from '../_services/account.service';
import { ForgotPasswordComponent } from '../forgot-password/forgot-password.component';
//Models

//Third party modules

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  //Login Form
  loginForm!: FormGroup;
  //Boolean indicator of from submission
  submitted = false;
  //Error message string
  error = '';
  //Placeholder for email
  emailPlaceholder = 'Email';
  //Placeholder for password
  passwordPlaceholder = 'Password';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    public accountService: AccountService,
    public dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.formSetup();
  }
  /**
   * Creates login form as a FormBuilder group
   */
  formSetup() {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  //convenience getter for easy access to form fields, this will be used mainly on view side (html)
  get f() {
    return this.loginForm.controls;
  }

  openRegisterDialog() {
    this.dialog.open(RegisterComponent);
  }

  openForgotPasswordDialog() {
    this.dialog.open(ForgotPasswordComponent);
  }

  async onLoginSubmit() {
    try {
      console.log('Made it to on submit');
      this.submitted = true;
      //Email error check

      if (this.f['email'].errors) {
        this.f['email'].reset();
        this.emailPlaceholder = 'Please enter a valid Email';
      }

      //Password error check
      if (this.f['password'].errors) {
        this.f['password'].reset();
        this.passwordPlaceholder = 'Please enter a valid Password';
      }
      // stop here if form is invalid
      if (this.loginForm.invalid) {
        return;
      }

      const response = await this.accountService.login(
        this.f['email'].value,
        this.f['password'].value
      );

      //if (user?._id ) {
      if (response?._id) {
        // get return url from query parameters or default to home page
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      } else {
        this.snackbar.open(response, 'OK', {
          duration: 5000,
          verticalPosition: 'top',
        });
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
} //end class
