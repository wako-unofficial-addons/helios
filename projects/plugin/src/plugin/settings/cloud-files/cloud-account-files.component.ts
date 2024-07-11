import { Component } from '@angular/core';
import { ModalController, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { DebridFilesComponent } from '../../components/debrid-files/debrid-files.component';
import { addIcons } from "ionicons";
import { closeOutline } from "ionicons/icons";

@Component({
    selector: 'wk-cloud-account-files',
    templateUrl: './cloud-account-files.component.html',
    styleUrls: ['./cloud-account-files.component.scss'],
    standalone: true,
    imports: [DebridFilesComponent, TranslateModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent],
})
export class CloudFilesComponent {
    constructor(public modalCtrl: ModalController) {
        addIcons({ closeOutline });
    }
}
