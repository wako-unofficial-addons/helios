import { Observable } from 'rxjs';
import { AllDebridMagnetStatusMagnetDto } from '../services/all-debrid/dtos/magnet/all-debrid-magnet-status.dto';
import { PremiumizeTransferDirectdlDto } from '../services/premiumize/dtos/transfer/premiumize-transfer-directdl.dto';
import { RealDebridUnrestrictLinkDto } from '../services/real-debrid/dtos/unrestrict/real-debrid-unrestrict-link.dto';
import { BaseSource } from './base-source';
import { SourceQuality } from './source-quality';

export class StreamLinkSource extends BaseSource {
  premiumizeTransferDirectdlDto: Observable<PremiumizeTransferDirectdlDto>;
  realDebridLinks: Observable<RealDebridUnrestrictLinkDto[]>;
  allDebridMagnetStatusMagnet: Observable<AllDebridMagnetStatusMagnetDto>;

  streamLinks: StreamLink[];

  constructor(
    public override id: string,
    public override title: string,
    public override size: number,
    public override quality: SourceQuality,
    public override type: 'torrent' | 'cached_torrent' | 'debrid' | 'hoster',
    public isPackage: boolean,
    public debridService: 'PM' | 'RD' | 'AD',
    public override provider: string,
    public originalUrl: string,
    public originalHash?: string
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
  ) {}
}
