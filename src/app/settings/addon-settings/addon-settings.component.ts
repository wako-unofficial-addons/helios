import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { PluginLoaderService } from '../../services/plugin-loader.service';

@Component({
  selector: 'wk-addon-settings',
  templateUrl: './addon-settings.component.html',
  styleUrls: ['./addon-settings.component.scss']
})
export class AddonSettingsComponent implements OnInit {
  @ViewChild('settingsRef', { read: ViewContainerRef, static: true })
  settingsRef: ViewContainerRef;

  constructor(private pluginLoader: PluginLoaderService) {}

  ngOnInit() {
    this.pluginLoader.createComponent('settings', this.settingsRef, null);
  }
}
