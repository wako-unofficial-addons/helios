import { Component, OnInit } from '@angular/core';

import { OpenSourceService } from '../../services/open-source.service';
import { PremiumizeFolderListForm } from '../../services/premiumize/forms/folder/premiumize-folder-list.form';

@Component({
  selector: 'wk-debrid-files',
  templateUrl: './debrid-files.component.html',
  styleUrls: ['./debrid-files.component.scss']
})
export class DebridFilesComponent implements OnInit {
  public response;

  constructor(private openSourceService: OpenSourceService) {}

  ngOnInit() {
    this.listAll('');
  }

  public async listAll(folderID) {
    this.response = await PremiumizeFolderListForm.submit(folderID).toPromise();
  }

  public openLink(link) {
    //this.openSourceService.openKodi([link]);
  }
}
