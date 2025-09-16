import { Component } from '@angular/core';
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { ProviderComponent } from '../../components/provider/provider.component';
import { QualityComponent } from '../../components/quality/quality.component';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

@Component({
  templateUrl: './providers.component.html',
  imports: [
    QualityComponent,
    ProviderComponent,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
  ],
})
export class ProvidersComponent {
  constructor(public modalCtrl: ModalController) {
    addIcons({ closeOutline });
  }
}
