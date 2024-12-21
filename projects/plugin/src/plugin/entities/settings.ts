import { SourceQuality } from './source-quality';
import { Platform } from '@ionic/angular';
import { WakoFileActionAndroid, WakoFileActionIos } from '@wako-app/mobile-sdk';

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
  | 'add-to-ad'
  | 'add-to-playlist'
  | 'open-infuse'
  | 'cast'
  | 'let-me-choose'
  | 'open-outplayer'
  | 'add-to-torbox'
  | 'wako-player'
  | 'open-vidhub';

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
  'add-to-ad',
  'add-to-torbox',
  'add-to-playlist',
  'open-infuse',
  'open-vidhub',
  'cast',
  'open-outplayer',
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
  'add-to-ad',
  'add-to-torbox',
  'add-to-playlist',
  'cast',
];

export const PlayButtonActionAndroidTv: PlayButtonAction[] = [
  'wako-player',
  'open-vlc',
  'open-with',
  'add-to-pm',
  'add-to-rd',
  'add-to-ad',
  'add-to-torbox',
  'add-to-playlist',
];

export interface SettingsQuality {
  quality: SourceQuality;
  displayName: string;
  enabled: boolean;
}

export interface FileSizeFilter {
  enabled: boolean;
  maxSize: number;
  minSize: number;
}

export interface SourceFilter {
  sortStreamsBy: 'size';
  sortTorrentsBy: 'balanced' | 'size' | 'seeds';
  groupStreamsByQuality: boolean;
  groupTorrentsByQuality: boolean;
  excludeTags: string[];
}

export interface PremiumizeSettings {
  disabled: boolean;
  apiKey: string;
  preferTranscodedFiles: boolean;
  preferTranscodedFilesChromecast: boolean;
}

export interface RealDebridSettings {
  disabled: boolean;
  client_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  client_secret: string;
}

export interface AllDebridSettings {
  disabled: boolean;
  apiKey: string;
  name: string;
}

export interface TorboxSettings {
  disabled?: boolean;
  apiKey: string;
}

export interface EasynewsSettings {
  username: string;
  password: string;
  disabled?: boolean;
}

export class Settings {
  premiumize: PremiumizeSettings = null;
  realDebrid: RealDebridSettings = null;
  allDebrid: AllDebridSettings = null;
  torbox?: TorboxSettings;
  easynews?: EasynewsSettings;

  // When the user clicks on the play button, this is the action that will be used
  defaultPlayButtonAction: PlayButtonAction = 'let-me-choose';
  defaultPlayButtonActionTv: PlayButtonAction = 'let-me-choose';

  // Will list all the available play button actions the user can choose from based on what he has enabled in the settings
  availablePlayButtonActions: PlayButtonAction[] = [];
  availablePlayButtonActionsTv: PlayButtonAction[] = [];

  qualityFiltering: SettingsQuality[] = [
    {
      quality: '2160p',
      displayName: '2160p/4k',
      enabled: true,
    },
    {
      quality: '1080p',
      displayName: '1080p',
      enabled: true,
    },
    {
      quality: '720p',
      displayName: '720p',
      enabled: true,
    },
    {
      quality: 'other',
      displayName: 'Other',
      enabled: true,
    },
  ];

  openRemoteAfterClickOnPlay = true;
  enableEpisodeAutomaticPlaylist = true;

  fileSizeFilteringMovie: FileSizeFilter = {
    enabled: false,
    maxSize: 0,
    minSize: 0,
  };

  fileSizeFilteringTv: FileSizeFilter = {
    enabled: false,
    maxSize: 0,
    minSize: 0,
  };

  defaultTitleLang = 'en';

  sourceFilter: SourceFilter = {
    sortStreamsBy: 'size',
    sortTorrentsBy: 'balanced',
    groupStreamsByQuality: true,
    groupTorrentsByQuality: true,
    excludeTags: [],
  };

  simultaneousProviderQueries = 0;

  constructor(platform: Platform) {
    // Set default values

    const wakoAction = platform.is('ios') ? WakoFileActionIos : WakoFileActionAndroid;
    const playButtonAction = platform.is('ios') ? PlayButtonActionIos : PlayButtonActionAndroid;

    this.availablePlayButtonActions = ['open-kodi', 'cast', 'open-vlc', 'share-url'];

    if (wakoAction.includes('wako-video-player')) {
      if (!this.availablePlayButtonActions.includes('wako-player')) {
        this.availablePlayButtonActions.unshift('wako-player');
      }
      if (!playButtonAction.includes('wako-player')) {
        playButtonAction.unshift('wako-player');
      }
    }

    this.availablePlayButtonActionsTv = PlayButtonActionAndroidTv;
  }

  static getAvailablePlayButtonActions(platform: Platform, isTvLayout: boolean) {
    if (isTvLayout) {
      return PlayButtonActionAndroidTv;
    }
    const wakoAction = platform.is('ios') ? WakoFileActionIos : WakoFileActionAndroid;
    const playButtonAction = platform.is('ios') ? PlayButtonActionIos : PlayButtonActionAndroid;

    if (wakoAction.includes('wako-video-player') && !playButtonAction.includes('wako-player')) {
      playButtonAction.unshift('wako-player');
    }

    return playButtonAction;
  }
}
