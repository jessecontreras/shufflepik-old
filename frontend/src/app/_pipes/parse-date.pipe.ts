import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'parseDate',
})
export class ParseDatePipe implements PipeTransform {
  /**
   * Parses GMT string into Date object
   *
   * @param dateString  GMT formatted string.
   * @returns Date object.
   */
  transform(dateString: string): Date {
    if (dateString == '' || dateString == null) {
      return new Date();
    }
    return new Date(dateString);
  }
}
