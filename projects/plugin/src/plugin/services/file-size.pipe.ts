import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'bsFileSize',
    pure: false,
    standalone: true
})
export class FileSizePipe implements PipeTransform {
  constructor() {}

  transform(size: number): string {
    let res = size;
    let unit = 'B';

    if (size >= 1099511627776) {
      res = size / 1099511627776;
      unit = 'TB';
    } else if (size >= 1073741824) {
      res = size / 1073741824;
      unit = 'GB';
    } else if (size >= 1048576) {
      res = size / 1048576;
      unit = 'MB';
    } else if (size >= 1024) {
      res = size / 1024;
      unit = 'KB';
    }

    return Math.round(res * 100) / 100 + ' ' + unit;
  }
}
