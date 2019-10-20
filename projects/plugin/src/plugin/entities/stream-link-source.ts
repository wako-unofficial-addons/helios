import { SourceQuality } from './source-quality';
import { Observable } from 'rxjs';
import { PremiumizeTransferDirectdlDto } from '../services/premiumize/dtos/transfer/premiumize-transfer-directdl.dto';
import { RealDebridUnrestrictLinkDto } from '../services/real-debrid/dtos/unrestrict/real-debrid-unrestrict-link.dto';
import { BaseSource } from './base-source';

export class StreamLinkSource extends BaseSource {
  premiumizeTransferDirectdlDto: Observable<PremiumizeTransferDirectdlDto>;
  realDebridLinks: Observable<RealDebridUnrestrictLinkDto[]>;

  streamLinks: StreamLink[];


  constructor(
    public id: string,
    public title: string,
    public size: number,
    public quality: SourceQuality,
    public type: 'torrent' | 'cached_torrent' | 'debrid' | 'hoster',
    public isPackage: boolean,
    public debridService: 'PM' | 'RD',
    public provider: string,
  ) {
    super(id, title, size, quality, provider, type);
  }
}

export class StreamLink {
  constructor(
    public title: string,
    public url: string,
    public filename: string,
    public isStreamable: boolean,
    public transcodedUrl: string,
    public servicePlayerUrl: string = null
  ) {
  }
}
