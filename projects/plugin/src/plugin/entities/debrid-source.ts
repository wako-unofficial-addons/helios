import { SourceQuality } from './source-quality';
import { Observable } from 'rxjs';

export class DebridSourceFile {
  constructor(
    public title: string,
    public url: string,
    public filename: string,
    public isStreamable: boolean,
    public transcodedUrl: string,
    public servicePlayerUrl: string = null
  ) {}
}

export class DebridSource {
  debridSourceFileObs: Observable<DebridSourceFile | DebridSourceFile[]>;

  constructor(
    public id: string,
    public title: string,
    public size: number,
    public quality: SourceQuality,
    public fromTorrent: boolean,
    public torrentHash: string,
    public isPackage: boolean,
    public serviceName: 'PM' | 'RD',
    public torrentProviderName: string
  ) {}
}
