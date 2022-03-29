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
  openDialog(data: DialogData): Observable<boolean> {
    return this.dialog
      .open(DialogComponent, {
        data,
        width: '80vw',
        height: '80vh',
        disableClose: true,
      })
      .afterClosed();
  }
}


