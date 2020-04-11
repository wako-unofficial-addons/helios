import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class ToastService {
  constructor(private toastCtrl: ToastController, private translateService: TranslateService) {}

  simpleMessage(translateKey: string, interpolateParams?: any, duration = 2000, position = 'top') {
    this.translateService.get(translateKey, interpolateParams).subscribe((message) => {
      this.toastCtrl
        .create({
          message: message,
          mode: 'ios',
          position: position as any,
          duration: duration
        })
        .then((alert) => {
          alert.present();
        });
    });
  }
}
