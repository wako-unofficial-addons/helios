import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { PluginLoaderService } from '@wako-app/mobile-sdk';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'wk-addon-detail',
  templateUrl: './addon-detail.component.html',
  styleUrls: ['./addon-detail.component.scss']
})
export class AddonDetailComponent implements OnInit {
  @ViewChild('detailRef', {read: ViewContainerRef, static: true})
  detailRef: ViewContainerRef;

  constructor(private pluginLoader: PluginLoaderService) {
  }

  ngOnInit() {
    this.pluginLoader.createComponent('plugin-detail', this.detailRef);
  }
}
