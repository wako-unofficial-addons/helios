import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PopoverController,
  IonToolbar,
  IonSearchbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { SourceListComponent } from '../components/source-list/source-list.component';
import { SourcePopoverFilterComponent } from '../components/source-popover-filter/source-popover-filter.component';
import { HideKeyboardEnterDirective } from '../directives/hide-keyboard-enter.directive';
import { KodiOpenMedia } from '../entities/kodi-open-media';
import { addIcons } from 'ionicons';
import { funnelOutline } from 'ionicons/icons';

@Component({
  selector: 'helios-plugin-detail',
  templateUrl: './plugin-detail.component.html',
  standalone: true,
  imports: [
    HideKeyboardEnterDirective,
    FormsModule,
    SourceListComponent,
    TranslateModule,
    IonToolbar,
    IonSearchbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
  ],
})
export class PluginDetailComponent {
  @Input()
  searchInput = '';

  @Input()
  category: 'movie' | 'tv' | 'anime' = 'movie';

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  @Input()
  searchOnOpen = false;

  @Input()
  showSourceFilter = true;

  constructor(private popoverCtrl: PopoverController) {
    addIcons({ funnelOutline });
  }

  onSearch(event: any) {
    if (event.key.toLowerCase().match('enter')) {
      this.searchInput = event.target.value ? event.target.value : '';
    }
  }

  async openFilterPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: SourcePopoverFilterComponent,
      event: event,
    });

    await popover.present();
  }
}
