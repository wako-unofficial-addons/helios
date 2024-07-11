import { Component } from '@angular/core';
import { ModalController, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { DebridAccountComponent } from '../../../components/debrid-account/debrid-account.component';
import { addIcons } from "ionicons";
import { closeOutline } from "ionicons/icons";

@Component({
    selector: 'wk-cloud-account-list',
    templateUrl: './cloud-account-list.component.html',
    styleUrls: ['./cloud-account-list.component.scss'],
    standalone: true,
    imports: [DebridAccountComponent, TranslateModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent],
})
export class CloudAccountListComponent {
    constructor(public modalCtrl: ModalController) {
        addIcons({ closeOutline });
    }
}
