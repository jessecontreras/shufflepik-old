import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { DialogComponent } from '../dialog/dialog.component';
import { DialogData } from '../_models/dialog.model';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * Opens current instance of dialog.
   */
  openDialog(
    data: DialogData,
    width?: string,
    height?: string
  ): Observable<boolean> {
    //const w = width ? width : '80vw';
    //const h = height ? height : '80vh';
    data.date_posted = data.date_posted ? data.date_posted : '';
    return this.dialog
      .open(DialogComponent, {
        data,
        //width: w,
        //  height: h,
        disableClose: true,
        panelClass: 'sp-dialog',
      })
      .afterClosed();
  }
}
