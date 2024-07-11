import { Component } from '@angular/core';
import { ModalController, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonCheckbox } from '@ionic/angular/standalone';
import { WakoCacheService } from '@wako-app/mobile-sdk';

@Component({
    selector: 'app-disclaimer',
    templateUrl: './disclaimer.component.html',
    styleUrls: ['./disclaimer.component.scss'],
    standalone: true,
    imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonCheckbox],
})
export class DisclaimerComponent {
    constructor(public modalController: ModalController) { }

    checkIt() {
        WakoCacheService.set('disclaimer-accepted', true, '3m').then(() => {
            this.modalController.dismiss();
        });
    }
}
