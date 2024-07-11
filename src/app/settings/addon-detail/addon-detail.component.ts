import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { PluginLoaderService } from '../../services/plugin-loader.service';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent } from "@ionic/angular/standalone";

@Component({
    selector: 'wk-addon-detail',
    templateUrl: './addon-detail.component.html',
    styleUrls: ['./addon-detail.component.scss'],
    standalone: true,
    imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent]
})
export class AddonDetailComponent implements OnInit {
    @ViewChild('detailRef', { read: ViewContainerRef, static: true })
    detailRef: ViewContainerRef;

    constructor(private pluginLoader: PluginLoaderService) { }

    ngOnInit() {
        this.pluginLoader.createComponent('plugin-detail', this.detailRef);
    }
}
