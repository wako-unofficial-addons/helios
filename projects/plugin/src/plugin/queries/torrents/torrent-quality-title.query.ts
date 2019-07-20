export class TorrentQualityTitleQuery {
  static getData(title: string) {
    if (title.match('2160')) {
      return '2160p';
    } else if (title.match('1080')) {
      return '1080p';
    } else if (title.match('720')) {
      return '720p';
    }
    return 'other';
  }
}
