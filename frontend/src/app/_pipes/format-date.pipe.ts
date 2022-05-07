import { Pipe, PipeTransform } from '@angular/core';
import * as dayjs from 'dayjs';

@Pipe({
  name: 'formatDate',
})
export class FormatDatePipe implements PipeTransform {
  transform(date: Date): string {
    if (date instanceof Date) return dayjs(date).format('MMM D, YY h:mma');
    else return '';
  }
}
