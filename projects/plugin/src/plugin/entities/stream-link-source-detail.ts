import { StreamLinkSource } from './stream-link-source';

export class StreamLinkSourceDetail {
  provider: string;
  sources: StreamLinkSource[];
  excludedSources: StreamLinkSource[] = [];
  allSources: StreamLinkSource[];
  timeElapsed: number;
  skipped?: boolean;

  static setExcludedSources(streamLinkSourceDetail: StreamLinkSourceDetail) {
    streamLinkSourceDetail.excludedSources = [];

    streamLinkSourceDetail.sources.forEach((source) => {
      if (source.excludedReason) {
        streamLinkSourceDetail.excludedSources.push(source);
      }
    });
  }
}
