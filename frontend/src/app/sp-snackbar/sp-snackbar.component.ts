import { Component, Inject, OnInit } from '@angular/core';
import {
  MatSnackBarRef,
  MAT_SNACK_BAR_DATA,
} from '@angular/material/snack-bar';
import { SpSnackBarService } from '../_services/sp-snackbar.service';
@Component({
  selector: 'app-sp-snackbar',
  templateUrl: './sp-snackbar.component.html',
  styleUrls: ['./sp-snackbar.component.scss'],
})
export class SpSnackBarComponent implements OnInit {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: any,
    private snackBar: SpSnackBarService,
    private snackBarRef: MatSnackBarRef<SpSnackBarComponent>
  ) {}
  ngOnInit(): void {}

  /**
   * Dismiss snackbar
   */
  async dismiss() {
    try {
      //this.snackBar.dismiss();
      this.snackBarRef.dismissWithAction();
      //console.log(this.snackBarRef.)
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
