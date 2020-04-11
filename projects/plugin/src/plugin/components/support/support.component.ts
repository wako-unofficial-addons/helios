import { Component, OnInit } from '@angular/core';
import { BrowserService } from '@wako-app/mobile-sdk';

@Component({
  selector: 'wk-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {
  constructor() {}

  ngOnInit() {}

  openBrowser(url: string) {
    BrowserService.open(url, false);
  }
}
