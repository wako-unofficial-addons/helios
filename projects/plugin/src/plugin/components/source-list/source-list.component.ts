import { Component, Input, OnInit } from '@angular/core';
import { SourceDetail } from '../../entities/source-detail';
import { SourceService } from '../../services/sources/source.service';
import { getSourcesByQuality, sortTorrentsBalanced, sortTorrentsBySize } from '../../services/tools';
import { DebridAccountService } from '../../services/debrid-account.service';
import { KodiOpenMedia } from '../../entities/kodi-open-media';
import { SourceByQuality } from '../../entities/source-by-quality';
import { DebridSource } from '../../entities/debrid-source';
import { TorrentSource } from '../../entities/torrent-source';


@Component({
  selector: 'wk-source-list',
  templateUrl: './source-list.component.html',
  styleUrls: ['./source-list.component.scss']
})
export class SourceListComponent implements OnInit {
  @Input()
  sourceDetail: SourceDetail;

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  totalDebridSource = 0;
  totalTorrentSource = 0;

  debridSourcesByQuality: SourceByQuality<DebridSource>;

  torrentSourcesByQuality: SourceByQuality<TorrentSource>;

  hasDebridAccount: boolean;
  segment = 'debrid';

  constructor(private sourceService: SourceService, private debridAccountService: DebridAccountService) {
  }

  async ngOnInit() {
    if (!this.sourceDetail) {
      return;
    }

    this.hasDebridAccount = await this.debridAccountService.hasAtLeastOneAccount();


    if (!this.hasDebridAccount) {
      this.segment = 'torrents';
    }

    this.debridSourcesByQuality = getSourcesByQuality<DebridSource>(this.sourceDetail.debridSources, sortTorrentsBySize);
    this.torrentSourcesByQuality = getSourcesByQuality<TorrentSource>(this.sourceDetail.torrentSources, sortTorrentsBalanced);

    this.totalDebridSource = this.sourceDetail.debridSources.length;
    this.totalTorrentSource = this.sourceDetail.torrentSources.length;
  }
}
