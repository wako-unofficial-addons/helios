import { StreamLinkSource } from './stream-link-source';

export class StreamLinkSourceDetail {
  provider: string;
  sources: StreamLinkSource[];
  allSources: StreamLinkSource[];
  timeElapsed: number;
  skipped?: boolean;
}
