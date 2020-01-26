import { Component, OnInit } from '@angular/core';
import { BrowserService } from '@wako-app/mobile-sdk';

@Component({
  selector: 'wk-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {

  constructor(private browserService: BrowserService) {
  }

  ngOnInit() {
  }

  openBrowser(url: string) {
    this.browserService.open(url, false);
  }
}
