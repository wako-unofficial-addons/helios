import { SourceQuality } from './source-quality';

export declare type PlayButtonAction =
  | 'open-kodi'
  | 'open-browser'
  | 'copy-url'
  | 'open-vlc'
  | 'download-vlc'
  | 'share-url'
  | 'open-elementum'
  | 'open-with'
  | 'open-nplayer'
  | 'add-to-pm'
  | 'add-to-rd'
  | 'add-to-playlist';

export const PlayButtonActionIos: PlayButtonAction[] = [
  'open-elementum',
  'copy-url',
  'share-url',
  'open-vlc',
  'download-vlc',
  'open-browser',
  'open-kodi',
  'open-nplayer',
  'add-to-pm',
  'add-to-rd',
  'add-to-playlist'
];

export const PlayButtonActionAndroid: PlayButtonAction[] = [
  'open-elementum',
  'copy-url',
  'share-url',
  'open-vlc',
  'open-browser',
  'open-kodi',
  'open-with',
  'add-to-pm',
  'add-to-rd',
  'add-to-playlist'
];

export interface SettingsQuality {
  quality: SourceQuality;
  displayName: string;
  enabled: boolean;
}

export class Settings {
  defaultPlayButtonAction: PlayButtonAction = 'open-kodi';

  availablePlayButtonActions: PlayButtonAction[] = [];
  qualities: SettingsQuality[] = [
    {
      quality: '2160p',
      displayName: '2160p/4k',
      enabled: true
    },
    {
      quality: '1080p',
      displayName: '1080p',
      enabled: true
    },
    {
      quality: '720p',
      displayName: '720p',
      enabled: false
    },
    {
      quality: 'other',
      displayName: 'Other',
      enabled: false
    }
  ];

  openRemoteAfterClickOnPlay = true;
  enableEpisodeAutomaticPlaylist = true;

  constructor(isAndroid: boolean) {
    this.availablePlayButtonActions = isAndroid ? PlayButtonActionAndroid.slice(0) : PlayButtonActionIos.slice(0);
  }
}
