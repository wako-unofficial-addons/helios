import { SourceQuality } from './source-quality';

export class BaseSource {

  constructor(
    public id: string,
    public title: string,
    public size: number,
    public quality: SourceQuality,
    public provider: string,
    public type: 'torrent' | 'cached_torrent' | 'debrid' | 'hoster'
  ) {
  }
}
