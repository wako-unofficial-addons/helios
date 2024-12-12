import { SourceQuality } from './source-quality';

export class BaseSource {
  videoMetaData?: SourceVideoMetadata;

  constructor(
    public id: string,
    public title: string,
    public size: number,
    public quality: SourceQuality,
    public provider: string,
    public type: 'torrent' | 'cached_torrent' | 'unchecked_cached_torrent' | 'direct',
  ) {}
}

export interface SourceVideoMetadata {
  is3D: boolean;
  isCam: boolean;
}
