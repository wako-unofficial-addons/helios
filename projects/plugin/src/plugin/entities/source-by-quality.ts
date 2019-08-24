export interface SourceByQuality<T> {
  sources2160p: T[];
  sources1080p: T[];
  sources720p: T[];
  sourcesOther: T[];
}
