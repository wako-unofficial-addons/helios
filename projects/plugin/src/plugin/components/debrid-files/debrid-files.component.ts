import { Component, OnInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { DebridAccountService } from '../../services/debrid-account.service';
import { OpenSourceService } from '../../services/open-source.service';

@Component({
  selector: 'wk-debrid-files',
  templateUrl: './debrid-files.component.html',
  styleUrls: ['./debrid-files.component.scss']
})
export class DebridFilesComponent implements OnInit {
  private key = '';

  private base_link = 'https://www.premiumize.me/api';

  private api_folderAll = '/folder/list';

  public folder;

  constructor(private http: HttpClient, private debridAccountService: DebridAccountService, private openSourceService: OpenSourceService) {}

  ngOnInit() {
    this.debridAccountService
      .getPremiumizeSettings()
      .then((settings) => {
        this.key = settings.apiKey;
      })
      .then(() => {
        this.listAll('');
      });
  }

  public async listAll(folderID) {
    let data;

    if (folderID !== '') {
      data = await this.http.get(this.base_link + this.api_folderAll + '?id=' + folderID + '&apikey=' + this.key).toPromise();
    } else {
      data = await this.http.get(this.base_link + this.api_folderAll + '?apikey=' + this.key).toPromise();
    }

    this.folder = data;
  }

  //TODO
  public openLink(link) {
    this.openSourceService.open(link, 'open-kodi', null);
  }
}
