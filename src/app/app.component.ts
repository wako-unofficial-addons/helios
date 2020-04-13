import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { AppService } from './services/app.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  ready = false;

  constructor(private platform: Platform, private appService: AppService) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.appService.loadPlugins().subscribe(() => {
        this.ready = true;
      });
    });
  }
}
