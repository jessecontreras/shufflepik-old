import { Component } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormControl,
} from '@angular/forms';
//import { MatSnackBar, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { interval } from 'rxjs';
import { TooltipPosition } from '@angular/material/tooltip';

//Services
//Models

//Third party modules
import * as dayjs from 'dayjs';
import { AccountService } from '../_services/account.service';
import { SpSnackBarService } from '../_services/sp-snackbar.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  //Login Form
  registerForm!: FormGroup;
  //Boolean indicator of from submission
  submitted = false;
  //Years in DOB select
  dobYears?: Array<number>;
  //Months in DOB select
  dobMonths?: Array<string>;
  //Days in DOB select
  dobDays?: Array<number>;
  //Genders in gender select
  genders?: Array<string>;
  //User password
  userDOB?: string;
  //Password input placeholder
  pwPlaceholder: string = 'Password';
  //Placeholder text for email input
  emailPlaceholderText: string = 'Email';
  //Tooltip position
  toolTipPosition: TooltipPosition = 'above';
  //Set the position as form control
  position = new FormControl(this.toolTipPosition);
  //SnackBar vetical position
  //verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private _snackBar: SpSnackBarService, //MatSnackBar,
    public dialogRef: MatDialogRef<RegisterComponent>
  ) {}

  ngOnInit() {
    this.formSetup();
  }

  /**
   * Creates login form as a FormBuilder group
   */
  async formSetup() {
    try {
      this.registerForm = this.fb.group({
        registerEmail: ['', [Validators.required, Validators.email]],
        registerPassword: ['', [Validators.required, Validators.minLength(5)]],
        gender: ['', Validators.required],
        dobMonth: ['', Validators.required],
        dobDay: ['', Validators.required],
        dobYear: ['', Validators.required],
      });

      this.dobYears = await this.getYears();
      this.dobMonths = await this.getMonths();
      this.dobDays = await this.getDays();
      this.genders = await this.getGenders();

      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  //convenience getter for easy access to form fields, this will be used mainly on view side (html)
  get f() {
    return this.registerForm.controls;
  }

  async getDays() {
    try {
      let days = [];
      for (let i = 1; i <= 31; i++) {
        days.push(i);
        if (i == 31) {
          return days;
        }
      }
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getMonths() {
    try {
      let months = [];
      for (let i = 0; i < 12; i++) {
        let currentMonth = dayjs(dayjs().month(i).toString()).format('MMMM');
        months.push(currentMonth);
        if (i == 11) {
          return months;
        }
      }
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getYears() {
    try {
      let years = [];
      const ageLimit = 13;
      let dobYearStart = dayjs().year() - ageLimit;
      const yearsLimit = 100;
      years.push(dobYearStart);

      for (let i = yearsLimit; i >= 0; i--) {
        dobYearStart--;

        years.push(dobYearStart);
        if (i == 0) {
          return years;
        }
      }
      return;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async getGenders() {
    try {
      return ['she/her', 'he/him', 'they/them'];
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * Takes in the month as a spelled-out month and returns month as a number.
   * Ex: 'March' --returns--> 3
   *
   * @param month - Month written out as a string.
   * @returns - Number representation of a month.
   */
  async monthToNumber(month: string) {
    try {
      switch (month) {
        case 'January':
          return 1;
        case 'February':
          return 2;
        case 'March':
          return 3;
        case 'April':
          return 4;
        case 'May':
          return 5;
        case 'June':
          return 6;
        case 'July':
          return 7;
        case 'August':
          return 8;
        case 'September':
          return 9;
        case 'October':
          return 10;
        case 'November':
          return 11;
        case 'December':
          return 12;
        default:
          return 'error';
      }
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  /**
   * Will check if user is at least 13 years old.
   *
   * @param dob - Formatted date of birth.
   * @returns - boolean relative to user's age. True if 13 years old or older. False otherwise.
   */
  async ageCheck(dob: any) {
    try {
      const thirteenYearsAgo = dayjs()
        .subtract(13, 'year')
        .startOf('day')
        .format();
      const validAge = dob <= thirteenYearsAgo ? true : false;
      return validAge;
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

  async register() {
    try {
      this.submitted = true;

      //Email error check
      if (this.f['registerEmail'].errors) {
        this.f['registerEmail'].reset();
        this.emailPlaceholderText = 'Please enter a valid email';
      }

      //Password error check
      if (this.f['registerPassword'].errors) {
        this.f['registerPassword'].reset();
        this.pwPlaceholder = '5 character minimum password necessary';
      }

      //Get the user's DOB month in number format
      const dobMonth = await this.monthToNumber(this.f['dobMonth'].value);
      //Set User's date of birth, format it.
      this.userDOB = dayjs(
        `${this.f['dobYear'].value}-${dobMonth}-${this.f['dobDay'].value}`
      )
        .startOf('day')
        .format();

      //Will check if user it at least 13 years old.
      const validAge = await this.ageCheck(this.userDOB);

      //Set errors on invalid age
      if (!validAge) {
        this.f['dobMonth'].setErrors({ incorrect: true });
        this.f['dobDay'].setErrors({ incorrect: true });
        this.f['dobYear'].setErrors({ incorrect: true });
      } else {
        this.f['dobMonth'].setErrors(null);
        this.f['dobDay'].setErrors(null);
        this.f['dobYear'].setErrors(null);
      }

      //Final form check for errors, return if so
      if (this.registerForm.invalid) {
        return;
      }

      //Using form details create User Object
      //_id and token are set to null as they will be set in the backend
      const user = {
        _id: null,
        token: null,
        email: this.f['registerEmail'].value,
        password: this.f['registerPassword'].value,
        dob: this.userDOB,
        gender: this.f['gender'].value,
        discord: {
          connected: false,
        },
        email_validation: {
          validated: false,
        },
      };

      //Service (backend API) response to user registration request
      let serviceResponse = await this.accountService.register(user);

      //Snackback will display service response
      /*let snackBarRef = this.snackBar.open(serviceResponse, '', {
        verticalPosition: this.verticalPosition,
      });*/
      if (String(serviceResponse).includes('already exists')) {
        this._snackBar.openSnackBar(serviceResponse, 'OK', 'warning', 5);
      } else {
        this._snackBar.openSnackBar(
          serviceResponse,
          'OK',
          'sentiment_very_satisfied',
          5
        );
        this._snackBar.onAction.subscribe(() => {
          this.dialogRef.close();
        });
      }
      //3 second delay between start of snackbar success message and the close (closure/closing) of snackbar success message and dialog.
      //const seconds = interval(3000);
      /*seconds.pipe().subscribe(() => {
        snackBarRef.dismiss();
        //Close dialog only if service response is a successful one.
        if (!String(serviceResponse).includes('already exists')) {
          this.dialogRef.close();
        }
      });*/
      //Set submit back to false;
      this.submitted = false;
      return;
    } catch (err) {
      console.log(err);
      //Set submit back to false;
      this.submitted = false;
      throw err;
    }
  }
}
