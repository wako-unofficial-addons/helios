import { SourceQuality } from './source-quality';

export declare type PlayButtonAction =
  'open-kodi'
  | 'open-browser'
  | 'copy-url'
  | 'open-vlc'
  | 'download-vlc'
  | 'share-url'
  | 'open-elementum';


export const PlayButtonActionIos: PlayButtonAction[] = [
  'open-elementum',
  'copy-url',
  'share-url',
  'open-vlc',
  'download-vlc',
  'open-browser',
  'open-kodi',
];

export const PlayButtonActionAndroid: PlayButtonAction[] = [
  'open-elementum',
  'copy-url',
  'share-url',
  'open-vlc',
  'open-browser',
  'open-kodi',
];

export interface SettingsQuality {
  quality: SourceQuality;
  displayName: string;
  enabled: boolean
}

export class Settings {
  defaultPlayButtonAction: PlayButtonAction = 'open-kodi';

  availablePlayButtonActions: PlayButtonAction[] = [
    'open-elementum',
    'copy-url',
    'share-url',
    'open-vlc',
    'download-vlc',
    'open-browser',
    'open-kodi',
  ];
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
}
