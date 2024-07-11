import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BrowserService } from '@wako-app/mobile-sdk';
import { addIcons } from "ionicons";
import { peopleOutline } from "ionicons/icons";
import { IonList, IonListHeader, IonLabel, IonIcon, IonItem } from "@ionic/angular/standalone";

@Component({
    selector: 'wk-support',
    templateUrl: './support.component.html',
    styleUrls: ['./support.component.scss'],
    standalone: true,
    imports: [TranslateModule, IonList, IonListHeader, IonLabel, IonIcon, IonItem],
})
export class SupportComponent implements OnInit {
    constructor() {
        addIcons({ peopleOutline });
    }

    ngOnInit() { }

    openBrowser(url: string) {
        BrowserService.open(url, false);
    }
}
