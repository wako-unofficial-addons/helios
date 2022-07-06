import { Injectable } from '@angular/core';
import { ActionSheetController, LoadingController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import {
  BrowserService,
  CAST_IMAGE,
  ChromecastService,
  INFUSE_IMAGE,
  KodiApiService,
  KodiAppService,
  KodiGetAddonDetailsForm,
  KODI_IMAGE,
  NPLAYER_IMAGE,
  OpenMedia,
  PlaylistVideo,
  VLC_IMAGE,
  WakoHttpError,
  WakoShare,
} from '@wako-app/mobile-sdk';
import { ClipboardService } from 'ngx-clipboard';
import { EMPTY, from, lastValueFrom, NEVER, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { KodiOpenMedia } from '../entities/kodi-open-media';
import { PlaylistVideoHeliosCustomData } from '../entities/playlist-video-custom-data';
import { PlayButtonAction, Settings } from '../entities/settings';
import { SourceQuery } from '../entities/source-query';
import { StreamLinkSource } from '../entities/stream-link-source';
import { TorrentSource } from '../entities/torrent-source';
import { SourceQueryFromKodiOpenMediaQuery } from '../queries/source-query-from-kodi-open-media.query';
import { TorrentGetUrlQuery } from '../queries/torrents/torrent-get-url.query';
import { RD_ERR_CODE_NOT_FULLY_CACHED } from './../queries/debrids/real-debrid/real-debrid-get-cached-url.query';
import { AllDebridMagnetUploadForm } from './all-debrid/forms/magnet/all-debrid-magnet-upload.form';
import { DebridAccountService } from './debrid-account.service';
import { HeliosPlaylistService } from './helios-playlist.service';
import { PremiumizeTransferCreateForm } from './premiumize/forms/transfer/premiumize-transfer-create.form';
import { RealDebridCacheUrlCommand } from './real-debrid/commands/real-debrid-cache-url.command';
import { SettingsService } from './settings.service';
import { CachedTorrentSourceService } from './sources/cached-torrent-source.service';
import { SourceService } from './sources/source.service';
import { ToastService } from './toast.service';
import {
  addToKodiPlaylist,
  episodeFoundInStreamLinks,
  getElementumUrlBySourceUrl,
  getOpenMediaFromKodiOpenMedia,
  incrementEpisodeCode,
} from './tools';

@Injectable()
export class OpenSourceService {
  constructor(
    private actionSheetController: ActionSheetController,
    private translateService: TranslateService,
    private platform: Platform,
    private debridAccountService: DebridAccountService,
    private toastService: ToastService,
    private loadingController: LoadingController,
    private clipboardService: ClipboardService,
    private settingsService: SettingsService,
    private cachedTorrentService: CachedTorrentSourceService,
    private sourceService: SourceService,
    private heliosPlaylistService: HeliosPlaylistService
  ) {}

  openTorrentSource(torrent: TorrentSource, kodiOpenMedia?: KodiOpenMedia) {
    TorrentGetUrlQuery.getData(torrent.url, torrent.subPageUrl).subscribe((torrentUrl) => {
      if (!torrentUrl) {
        this.toastService.simpleMessage('toasts.open-source.cannotRetrieveUrl');
        return;
      }

      torrent.url = torrentUrl;

      this._openTorrentSource(torrent, kodiOpenMedia);
    });
  }

  async openStreamLinkSource(
    streamLinkSource: StreamLinkSource,
    sourceQuery: SourceQuery,
    kodiOpenMedia?: KodiOpenMedia,
    action: 'default' | 'more' = 'default'
  ) {
    const streamLinks = await this.getStreamLinksWithLoader(streamLinkSource, sourceQuery);
    const settings = await this.settingsService.get();

    let actions = action === 'default' ? [settings.defaultPlayButtonAction] : settings.availablePlayButtonActions;

    if (actions.length === 1 && actions[0] === 'let-me-choose') {
      actions = settings.availablePlayButtonActions;
    }

    streamLinkSource.streamLinks = streamLinks;

    let selectStreamLinks = sourceQuery.query && streamLinks.length > 1;

    if (sourceQuery.episode && streamLinks.length > 1) {
      const currentEpisodeFound = episodeFoundInStreamLinks(streamLinks, sourceQuery);

      if (!currentEpisodeFound) {
        selectStreamLinks = true;

        const episodeCode = sourceQuery.episode.episodeCode;

        this.toastService.simpleMessage(`Episode ${episodeCode} not found`);
      }
    }

    if (selectStreamLinks) {
      this.selectStreamLink(streamLinkSource, actions, kodiOpenMedia);
    } else {
      this._openStreamLinkSource(streamLinkSource, actions, kodiOpenMedia);
    }
  }

  private async getStreamLinksWithLoader(
    streamLinkSource: StreamLinkSource,
    sourceQuery: SourceQuery,
    showLoader = true
  ) {
    const loader = await this.loadingController.create({
      spinner: 'crescent',
      backdropDismiss: true,
    });

    if (showLoader) {
      await loader.present();
    }

    try {
      return await lastValueFrom(this.cachedTorrentService.getStreamLinks(streamLinkSource, sourceQuery));
    } catch (err) {
      if (err && err instanceof WakoHttpError) {
        if (err.status === 403) {
          this.toastService.simpleMessage(
            'toasts.open-source.permissionDenied',
            { debridService: streamLinkSource.debridService },
            4000
          );
        } else {
          this.toastService.simpleMessage(JSON.stringify(err.response), null, 4000);
        }
      } else if (err && typeof err === 'string') {
        this.toastService.simpleMessage(err, null, 4000);
      } else if (err && err.message) {
        this.toastService.simpleMessage(err.message, null, 4000);
        if (err?.code === RD_ERR_CODE_NOT_FULLY_CACHED && streamLinkSource.originalUrl) {
          const torrentSource: TorrentSource = {
            hash: streamLinkSource.originalHash,
            id: streamLinkSource.id,
            isCached: false,
            isPackage: streamLinkSource.isPackage,
            peers: null,
            provider: streamLinkSource.provider,
            quality: streamLinkSource.quality,
            seeds: null,
            size: streamLinkSource.size,
            title: streamLinkSource.title,
            type: 'torrent',
            url: streamLinkSource.originalUrl,
          };
          this._openTorrentSource(torrentSource);
        }
      } else {
        this.toastService.simpleMessage('toasts.open-source.sourceNotCached');
      }
      throw err;
    } finally {
      await loader.dismiss();
    }
  }

  private async selectStreamLink(
    streamLinkSource: StreamLinkSource,
    actions: PlayButtonAction[],
    kodiOpenMedia?: KodiOpenMedia
  ) {
    const buttons = [];
    streamLinkSource.streamLinks.forEach((link) => {
      buttons.push({
        text: link.filename,
        handler: () => {
          const streamLinkSourceCopy = new StreamLinkSource(
            streamLinkSource.id,
            streamLinkSource.title,
            streamLinkSource.size,
            streamLinkSource.quality,
            streamLinkSource.type,
            streamLinkSource.isPackage,
            streamLinkSource.debridService,
            streamLinkSource.provider,
            streamLinkSource.originalUrl
          );

          const links = [link];

          if (kodiOpenMedia && kodiOpenMedia.episode) {
            let addFromHere = false;
            streamLinkSource.streamLinks.forEach((l) => {
              if (link.filename === l.filename) {
                addFromHere = true;
              } else if (addFromHere) {
                links.push(l);
              }
            });

            if (links.length > 1) {
              streamLinkSourceCopy.isPackage = true;
            }
          }

          streamLinkSourceCopy.streamLinks = links;

          this._openStreamLinkSource(streamLinkSourceCopy, actions, kodiOpenMedia);
        },
      });
    });

    if (buttons.length > 5) {
      buttons.push({
        text: this.translateService.instant('shared.cancel'),
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        },
      });
    }

    const action = await this.actionSheetController.create({
      header: this.translateService.instant('actionSheets.open-source.selectLink.openTitle'),
      buttons: buttons,
    });

    action.present();
  }

  private async _openTorrentSource(torrent: TorrentSource, kodiOpenMedia?: KodiOpenMedia) {
    const settings = await this.settingsService.get();

    const hasCloudAccount = await this.debridAccountService.hasAtLeastOneAccount();

    const currentHost = KodiAppService.currentHost;

    const premiumizeSettings = await this.debridAccountService.getPremiumizeSettings();

    const realDebridSettings = await this.debridAccountService.getRealDebridSettings();

    const allDebridSettings = await this.debridAccountService.getAllDebridSettings();

    const buttons = [];

    if (hasCloudAccount) {
      if (premiumizeSettings) {
        buttons.push({
          cssClass: 'pm',
          text: this.translateService.instant('actionSheets.open-source.options.add-to-pm'),
          handler: () => {
            this.open(torrent, 'add-to-pm', kodiOpenMedia);
          },
        });
      }
      if (realDebridSettings) {
        buttons.push({
          cssClass: 'rd',
          text: this.translateService.instant('actionSheets.open-source.options.add-to-rd'),
          handler: () => {
            this.open(torrent, 'add-to-rd', kodiOpenMedia);
          },
        });
      }
      if (allDebridSettings) {
        buttons.push({
          cssClass: 'ad',
          text: this.translateService.instant('actionSheets.open-source.options.add-to-ad'),
          handler: () => {
            this.open(torrent, 'add-to-ad', kodiOpenMedia);
          },
        });
      }
    }

    if (settings.availablePlayButtonActions.includes('share-url')) {
      buttons.push({
        icon: 'share',
        text: this.translateService.instant('actionSheets.open-source.options.share-url'),
        handler: () => {
          this.open(torrent, 'share-url', kodiOpenMedia);
        },
      });
    }

    if (settings.availablePlayButtonActions.includes('open-elementum') && currentHost) {
      buttons.push({
        cssClass: 'kodi',
        text: this.translateService.instant('actionSheets.open-source.options.open-elementum'),
        handler: () => {
          this.open(torrent, 'open-elementum', kodiOpenMedia);
        },
      });
    }

    if (settings.availablePlayButtonActions.includes('add-to-playlist')) {
      buttons.push({
        icon: 'list',
        text: this.translateService.instant('actionSheets.open-source.options.add-to-playlist'),
        handler: () => {
          this.open(torrent, 'add-to-playlist', kodiOpenMedia);
        },
      });
    }

    if (settings.availablePlayButtonActions.includes('copy-url')) {
      buttons.push({
        role: 'copy-url',
        icon: 'copy',
        text: this.translateService.instant('actionSheets.open-source.options.copy-url'),
        handler: () => {
          this.toastService.simpleMessage('toasts.copyToClipboard', { element: 'Video URL' });
        },
      });
    }

    if (buttons.length === 1) {
      buttons[0].handler();
      return;
    }

    buttons.forEach((button) => {
      if (!button.icon) {
        button.icon = 'arrow-dropright';
      }
    });

    const action = await this.actionSheetController.create({
      header: this.translateService.instant('actionSheets.open-source.openTitle'),
      buttons: buttons,
    });

    this.setImages();

    await action.present();

    const copyEl = document.querySelector('.action-sheet-copy-url');
    if (!copyEl) {
      return;
    }

    copyEl.addEventListener('click', () => {
      this.clipboardService.copyFromContent(torrent.url);
      setTimeout(() => {
        // Need to be done twice to work on android
        this.clipboardService.copyFromContent(torrent.url);
      }, 100);
    });
  }

  private async _openStreamLinkSource(
    streamLinkSource: StreamLinkSource,
    actions: PlayButtonAction[],
    kodiOpenMedia?: KodiOpenMedia
  ) {
    const hasCloudAccount = await this.debridAccountService.hasAtLeastOneAccount();

    const premiumizeSettings = await this.debridAccountService.getPremiumizeSettings();

    const realDebridSettings = await this.debridAccountService.getRealDebridSettings();

    const buttons = [];

    actions.forEach((action) => {
      if (action.match('elementum')) {
        return;
      }

      if (hasCloudAccount && action === 'add-to-pm' && !premiumizeSettings) {
        return;
      }
      if (hasCloudAccount && action === 'add-to-rd' && !realDebridSettings) {
        return;
      }

      const buttonOptions = {
        text: this.translateService.instant('actionSheets.open-source.options.' + action),
      } as any;

      switch (action) {
        case 'add-to-pm':
          buttonOptions.cssClass = 'pm';
          break;
        case 'add-to-rd':
          buttonOptions.cssClass = 'rd';
          break;
        case 'add-to-ad':
          buttonOptions.cssClass = 'ad';
          break;
        case 'open-browser':
          buttonOptions.icon = 'browsers';
          break;
        case 'copy-url':
          buttonOptions.role = 'copy-url';
          buttonOptions.icon = 'copy';
          buttonOptions.handler = () => {
            this.toastService.simpleMessage('toasts.copyToClipboard', { element: 'Video URL' });
          };
          break;

        case 'share-url':
          buttonOptions.icon = 'share';
          break;

        case 'open-with':
          buttonOptions.icon = 'open';
          break;

        case 'download-vlc':
          buttonOptions.icon = 'cloud-download';
          break;

        case 'open-vlc':
          buttonOptions.cssClass = 'vlc';
          break;

        case 'open-nplayer':
          buttonOptions.cssClass = 'nplayer';
          break;

        case 'open-kodi':
          buttonOptions.cssClass = 'kodi';
          break;

        case 'add-to-playlist':
          buttonOptions.icon = 'list';
          break;

        case 'open-infuse':
          buttonOptions.cssClass = 'infuse';
          break;

        case 'cast':
          buttonOptions.cssClass = 'cast';
          break;
      }

      if (!buttonOptions.handler) {
        buttonOptions.handler = () => {
          this.open(streamLinkSource, action, kodiOpenMedia);
        };
      }

      buttons.push(buttonOptions);
    });

    if (buttons.length === 1) {
      buttons[0].handler();
      return;
    }

    buttons.forEach((button) => {
      if (!button.icon) {
        button.icon = 'arrow-dropright';
      }
    });

    let subHeader = null;
    if (streamLinkSource.streamLinks.length > 0 && streamLinkSource.streamLinks[0].filename.match('.rar') !== null) {
      subHeader = `Warning the file is compressed`;
    }

    const actionSheet = await this.actionSheetController.create({
      header: this.translateService.instant('actionSheets.open-source.openTitle'),
      subHeader: subHeader,
      buttons: buttons,
    });

    this.setImages();

    await actionSheet.present();

    const copyEl = document.querySelector('.action-sheet-copy-url');
    if (!copyEl) {
      return;
    }

    copyEl.addEventListener('click', () => {
      const streamLink = streamLinkSource.streamLinks[0];

      this.clipboardService.copyFromContent(streamLink.url);
      setTimeout(() => {
        // Need to be done twice to work on android
        this.clipboardService.copyFromContent(streamLink.url);
      }, 100);
    });
  }

  private setImages() {
    const data: { class: string; imgUrl: string }[] = [
      {
        class: '.pm',
        imgUrl: 'https://raw.githubusercontent.com/wako-unofficial-addons/assets/main/pm.svg',
      },
      {
        class: '.vlc',
        imgUrl: VLC_IMAGE,
      },
      {
        class: '.rd',
        imgUrl: 'https://raw.githubusercontent.com/wako-unofficial-addons/assets/main/rd.png',
      },
      {
        class: '.ad',
        imgUrl: 'https://raw.githubusercontent.com/wako-unofficial-addons/assets/main/ad.png',
      },
      {
        class: '.kodi',
        imgUrl: KODI_IMAGE,
      },
      {
        class: '.nplayer',
        imgUrl: NPLAYER_IMAGE,
      },
      {
        class: '.infuse',
        imgUrl: INFUSE_IMAGE,
      },
      {
        class: '.cast',
        imgUrl: CAST_IMAGE,
      },
    ];

    data.forEach((d) => {
      const node = document.querySelector(d.class + ' .action-sheet-button-inner');
      if (node) {
        node.innerHTML =
          `<img style="width: 24px; height: 24px;  margin-inline-end: 32px;" src="${d.imgUrl}"> ` + node.innerHTML;

        const icon = document.querySelector(d.class + ' ion-icon');
        icon.remove();
      }
    });
  }

  private openKodi(
    videoUrls: string[],
    kodiOpenMedia?: KodiOpenMedia,
    seekTo?: number,
    pluginId?: string,
    obsBeforeOpening?: Observable<any>,
    openMedia?: OpenMedia
  ) {
    let totalNextUpVideo = 0;

    let settings: Settings;
    return KodiAppService.checkAndConnectToCurrentHost()
      .pipe(
        catchError((err) => {
          if (err === 'hostUnreachable') {
            this.toastService.simpleMessage(
              'toasts.kodi.hostUnreachable',
              { hostName: KodiAppService.currentHost.name },
              2000
            );
          } else {
            this.toastService.simpleMessage('toasts.kodi.noHost');
          }
          return NEVER;
        }),
        switchMap(() => (obsBeforeOpening ? obsBeforeOpening : of(true))),
        switchMap(() => {
          let firstVideoUrl = videoUrls.shift();
          if (kodiOpenMedia) {
            openMedia = getOpenMediaFromKodiOpenMedia(kodiOpenMedia);

            if (!pluginId) {
              // tslint:disable-next-line:max-line-length
              firstVideoUrl = KodiAppService.prependOpenMediaToUrl(firstVideoUrl, openMedia);
            }
          }

          return from(this.settingsService.get()).pipe(
            switchMap((_settings) => {
              settings = _settings;
              return KodiAppService.openUrl(
                firstVideoUrl,
                openMedia,
                settings.openRemoteAfterClickOnPlay,
                {
                  seekTo: seekTo,
                },
                false
              );
            })
          );
        }),
        tap(() => {
          // Take only 5 episodes
          const newVideoUrls = videoUrls.slice(0, 5);

          totalNextUpVideo = newVideoUrls.length;

          const toastMessage = 'toasts.startOpening';
          const toastParams = {
            title: !kodiOpenMedia
              ? ''
              : (kodiOpenMedia.movie ? kodiOpenMedia.movie.title : kodiOpenMedia.show.title).replace(/\./g, ' '),
            hostName: KodiApiService.host.name,
          };

          if (settings.enableEpisodeAutomaticPlaylist && videoUrls.length > 0) {
            if (!pluginId) {
              addToKodiPlaylist(newVideoUrls, kodiOpenMedia).subscribe();
            }
          }

          const message = this.translateService.instant(toastMessage, toastParams);

          this.toastService.simpleMessage(message);
        })
      )
      .subscribe();
  }

  private openBrowserUrl(url: string) {
    if (this.platform.is('ios')) {
      BrowserService.open(url, true);
    } else {
      window.open(url, '_system', 'location=yes');
    }
  }

  private async openVlc(videoUrl: string) {
    if (this.platform.is('ios')) {
      const url = `vlc-x-callback://x-callback-url/stream?url=${videoUrl}`;
      BrowserService.open(url, false);
    } else {
      const url = `vlc://${videoUrl}`;
      BrowserService.open(url, false);
    }
  }

  private async openNplayer(videoUrl: string) {
    if (!this.platform.is('ios')) {
      return;
    }
    const url = `nplayer-${videoUrl}`;
    BrowserService.open(url, false);
  }

  private async openInfuse(videoUrl: string) {
    if (!this.platform.is('ios')) {
      return;
    }
    const url = `infuse://x-callback-url/play?url=${encodeURIComponent(videoUrl)}`;
    BrowserService.open(url, false);
  }

  private async cast(
    videoUrl: string,
    kodiOpenMedia?: KodiOpenMedia,
    seekTo?: number,
    openMedia?: OpenMedia,
    fallBacVideoUrl?: string
  ) {
    const title = !kodiOpenMedia
      ? ''
      : (kodiOpenMedia.movie
          ? kodiOpenMedia.movie.title
          : kodiOpenMedia.show.title + ' - ' + kodiOpenMedia.episode.code
        ).replace(/\./g, ' ');

    const poster = !kodiOpenMedia
      ? null
      : kodiOpenMedia.movie
      ? kodiOpenMedia.movie.imagesUrl.poster
      : kodiOpenMedia.show.imagesUrl.poster;

    if (kodiOpenMedia) {
      openMedia = getOpenMediaFromKodiOpenMedia(kodiOpenMedia);
    }
    ChromecastService.openUrl(title, videoUrl, poster, openMedia).subscribe(
      () => {
        if (seekTo > 0 && ChromecastService.media) {
          ChromecastService.seek(seekTo);
        }
      },
      (err) => {
        if (fallBacVideoUrl) {
          ChromecastService.openUrl(title, fallBacVideoUrl, poster, openMedia).subscribe(() => {
            if (seekTo > 0 && ChromecastService.media) {
              ChromecastService.seek(seekTo);
            }
          });
        }
      }
    );
  }

  private async downloadWithVlc(videoUrl: string) {
    console.log('downloadWithVlc', videoUrl);

    if (this.platform.is('ios')) {
      const url = `vlc-x-callback://x-callback-url/download?url=${videoUrl}`;
      BrowserService.open(url, false);
    }
  }

  private async addToPM(url: string) {
    const loader = await this.loadingController.create({
      spinner: 'crescent',
    });

    loader.present();

    PremiumizeTransferCreateForm.submit(url)
      .pipe(finalize(() => loader.dismiss()))
      .subscribe((data) => {
        if (data.status === 'success') {
          this.toastService.simpleMessage('toasts.open-source.addedToPM');
        } else {
          this.toastService.simpleMessage('toasts.open-source.failedToAddToPM', { error: data.message });
        }
      });
  }

  private async addToAD(url: string) {
    const loader = await this.loadingController.create({
      spinner: 'crescent',
    });

    loader.present();

    AllDebridMagnetUploadForm.submit([url])
      .pipe(finalize(() => loader.dismiss()))
      .subscribe((data) => {
        if (data.status === 'success') {
          this.toastService.simpleMessage('toasts.open-source.addedToAD');
        } else {
          this.toastService.simpleMessage('toasts.open-source.failedToAddToAD', { error: data?.error?.message });
        }
      });
  }

  private async addToRD(url: string) {
    const loader = await this.loadingController.create({
      spinner: 'crescent',
    });

    loader.present();

    RealDebridCacheUrlCommand.handle(url)
      .pipe(
        catchError((err) => {
          let error = err;
          if (err.response) {
            error = err.response;
          }

          this.toastService.simpleMessage('toasts.open-source.failedToAddToRD', { error: JSON.stringify(error) });
          return EMPTY;
        }),
        finalize(() => loader.dismiss())
      )
      .subscribe(
        () => {
          this.toastService.simpleMessage('toasts.open-source.addedToRD');
        },
        (err) => {
          this.toastService.simpleMessage('toasts.open-source.failedToAddToRD', { error: err.toString() });
        }
      );
  }

  private openElementum(torrent: TorrentSource, kodiOpenMedia?: KodiOpenMedia) {
    if (kodiOpenMedia) {
      SourceQueryFromKodiOpenMediaQuery.getData(kodiOpenMedia).subscribe((sourceQuery) => {
        this.openKodi(
          [getElementumUrlBySourceUrl(torrent.url, sourceQuery)],
          kodiOpenMedia,
          null,
          'plugin.video.elementum',
          this.getElementumCheckObservable()
        );
      });
    }
  }

  private getElementumCheckObservable() {
    return of(true).pipe(
      switchMap(() => this.isElementumAddonInstalled()),
      switchMap((isInstalled) => {
        if (!isInstalled) {
          this.toastService.simpleMessage('toasts.elementumNotInstalled');

          return NEVER;
        }
        return of(true);
      })
    );
  }

  private isElementumAddonInstalled() {
    return this.isPluginInstalled('plugin.video.elementum');
  }

  private isPluginInstalled(plugin: string) {
    return KodiGetAddonDetailsForm.submit(plugin).pipe(
      map((data) => {
        return !!data;
      })
    );
  }

  private share(cachedUrl: string, torrentTitle: string) {
    WakoShare.share({
      url: cachedUrl,
      text: torrentTitle,
      dialogTitle: torrentTitle,
      title: torrentTitle,
    });
  }

  private openWith(url: string, title: string) {
    if (window['plugins'] && window['plugins'].intentShim) {
      const intentShim: any = window['plugins'].intentShim;

      intentShim.startActivity(
        {
          action: window['plugins'].intentShim.ACTION_VIEW,
          type: 'video/*',
          url: url,
          extras: {
            title: title,
          },
        },
        () => console.log('intentShim success'),
        (err) => console.log('intentShim err', err)
      );
    }
  }

  private getElementumNextEpisodeUrlFromPackage(torrent: TorrentSource, sourceQuery?: SourceQuery) {
    const urls = [];

    if (sourceQuery && sourceQuery.episode && torrent.isPackage) {
      const limit = sourceQuery.episode.latestAiredEpisode - sourceQuery.episode.episodeNumber;

      let episodeCode = sourceQuery.episode.episodeCode;
      let episodeAbsoluteNumber = sourceQuery.episode.absoluteNumber;
      let episodeNumber = sourceQuery.episode.episodeNumber;

      for (let i = 0; i < limit; i++) {
        const _sourceQuery = JSON.parse(JSON.stringify(sourceQuery));
        episodeCode = incrementEpisodeCode(episodeCode);

        if (episodeAbsoluteNumber) {
          episodeAbsoluteNumber++;
          _sourceQuery.episode.absoluteNumber = episodeAbsoluteNumber;
        }
        episodeNumber++;
        _sourceQuery.episode.episodeNumber = episodeNumber;

        _sourceQuery.episode.episodeCode = episodeCode;

        urls.push(getElementumUrlBySourceUrl(torrent.url, _sourceQuery));
      }
    }
    return urls;
  }

  private getTorrentSourceFromSource(source: StreamLinkSource | TorrentSource) {
    if (source instanceof StreamLinkSource) {
      return {
        id: source.id,
        hash: source.originalHash,
        isCached: true,
        cachedService: source.debridService,
        provider: source.provider,
        quality: source.quality,
        seeds: null,
        peers: null,
        isPackage: source.isPackage,
        size: source.size,
        title: source.title,
        subPageUrl: null,
        url: source.originalUrl,
        type: 'torrent',
        videoMetaData: source.videoMetaData,
      } as TorrentSource;
    }
    return source;
  }

  private getCustomDataFromSource(source: StreamLinkSource | TorrentSource, sourceQuery: SourceQuery) {
    const data: PlaylistVideoHeliosCustomData = {
      sourceQuery: sourceQuery,
      torrentSource: this.getTorrentSourceFromSource(source),
      type: source.type as any,
    };

    return JSON.parse(JSON.stringify(data)) as PlaylistVideoHeliosCustomData;
  }

  private getStreamUrlFromSource(source: StreamLinkSource | TorrentSource, sourceQuery, getTranscoded = false) {
    let streamUrl;
    if (source.type === 'torrent') {
      streamUrl = getElementumUrlBySourceUrl((source as TorrentSource).url, sourceQuery);
    } else {
      const streamLink = (source as StreamLinkSource).streamLinks[0];
      streamUrl = getTranscoded ? streamLink.transcodedUrl : streamLink.url;
    }

    return streamUrl;
  }

  private handleWakoPlaylist(
    source: StreamLinkSource | TorrentSource,
    kodiOpenMedia?: KodiOpenMedia,
    isAutomatic = true,
    getTranscoded = false
  ) {
    return SourceQueryFromKodiOpenMediaQuery.getData(kodiOpenMedia).pipe(
      switchMap((sourceQuery) => {
        return from(this.heliosPlaylistService.setPlaylist(source, kodiOpenMedia)).pipe(
          switchMap((playlist) => {
            if (kodiOpenMedia && kodiOpenMedia.episode) {
              playlist.items.push({
                label: sourceQuery.episode.episodeCode,
                url: this.getStreamUrlFromSource(source, sourceQuery, getTranscoded),
                currentSeconds: 0,
                pluginId: 'plugin.helios',
                openMedia: kodiOpenMedia ? getOpenMediaFromKodiOpenMedia(kodiOpenMedia) : null,
                customData: this.getCustomDataFromSource(source, sourceQuery),
              });

              playlist.currentItem = playlist.items.length - 1;

              return this.getNextEpisodeSources(source, sourceQuery).pipe(
                map((sources) => {
                  let episodeCode = sourceQuery.episode.episodeCode;
                  let episodeAbsoluteNumber = sourceQuery.episode.absoluteNumber;
                  let episodeNumber = sourceQuery.episode.episodeNumber;

                  const kodiOpenMediaCopy = JSON.parse(JSON.stringify(kodiOpenMedia)) as KodiOpenMedia;

                  sources.forEach((childSource) => {
                    const _sourceQuery = JSON.parse(JSON.stringify(sourceQuery));

                    let videosUrls = [];

                    if (childSource.type === 'torrent') {
                      if (childSource.isPackage) {
                        videosUrls = this.getElementumNextEpisodeUrlFromPackage(
                          childSource as TorrentSource,
                          _sourceQuery
                        );
                      } else {
                        videosUrls.push(this.getStreamUrlFromSource(childSource, _sourceQuery));
                      }
                    } else if (childSource instanceof StreamLinkSource) {
                      childSource.streamLinks.forEach((streamLink) => {
                        videosUrls.push(getTranscoded ? streamLink.transcodedUrl : streamLink.url);
                      });
                    }

                    videosUrls.forEach((url) => {
                      episodeCode = incrementEpisodeCode(episodeCode);

                      if (episodeAbsoluteNumber) {
                        episodeAbsoluteNumber++;
                        _sourceQuery.episode.absoluteNumber = episodeAbsoluteNumber;
                      }
                      episodeNumber++;
                      _sourceQuery.episode.episodeNumber = episodeNumber;

                      _sourceQuery.episode.episodeCode = episodeCode;

                      kodiOpenMediaCopy.episode.number++;

                      playlist.items.push({
                        label: _sourceQuery.episode.episodeCode,
                        url: url,
                        currentSeconds: 0,
                        pluginId: 'plugin.helios',
                        openMedia: kodiOpenMedia ? getOpenMediaFromKodiOpenMedia(kodiOpenMediaCopy) : null,
                        customData: this.getCustomDataFromSource(childSource, _sourceQuery),
                      });
                    });
                  });
                  return playlist;
                })
              );
            } else if (!isAutomatic) {
              if (source.type === 'torrent') {
                const torrent = source as TorrentSource;
                playlist.items.push({
                  label: torrent.title,
                  url: this.getStreamUrlFromSource(source, sourceQuery, getTranscoded),
                  currentSeconds: 0,
                  pluginId: 'plugin.helios',
                  openMedia: kodiOpenMedia ? getOpenMediaFromKodiOpenMedia(kodiOpenMedia) : null,
                  customData: this.getCustomDataFromSource(source, sourceQuery),
                });
              } else if (source instanceof StreamLinkSource) {
                source.streamLinks.forEach((link) => {
                  playlist.items.push({
                    label: link.title,
                    url: this.getStreamUrlFromSource(source, sourceQuery, getTranscoded),
                    currentSeconds: 0,
                    pluginId: 'plugin.helios',
                    openMedia: kodiOpenMedia ? getOpenMediaFromKodiOpenMedia(kodiOpenMedia) : null,
                    customData: this.getCustomDataFromSource(source, sourceQuery),
                  });
                });
              }
            }
            return of(playlist);
          }),
          switchMap((playlist) => {
            if (playlist.items.length === 0) {
              // Delete it
              this.heliosPlaylistService.delete(playlist);
              return EMPTY;
            }
            return from(this.heliosPlaylistService.savePlaylist(playlist)).pipe(
              tap(() => {
                this.toastService.simpleMessage(
                  'toasts.playlist',
                  {
                    playlistName: playlist.label,
                    items: playlist.items.length,
                  },
                  5000
                );
              })
            );
          })
        );
      })
    );
  }

  private getNextEpisodeSources(source: StreamLinkSource | TorrentSource, sourceQuery: SourceQuery) {
    if (!sourceQuery.episode || source.isPackage) {
      if (source instanceof StreamLinkSource && source.streamLinks.length > 0) {
        (source as StreamLinkSource).streamLinks.shift();
      }
      return of([source]);
    }

    return this.sourceService.getNextEpisodeSources(sourceQuery, source.type === 'torrent' ? 'torrent' : 'stream');
  }

  async open(source: TorrentSource | StreamLinkSource, action: PlayButtonAction, kodiOpenMedia: KodiOpenMedia) {
    const settings = await this.settingsService.get();

    if (source.type === 'torrent') {
      const torrent = source as TorrentSource;
      switch (action) {
        case 'add-to-pm':
          TorrentGetUrlQuery.getData(torrent.url, torrent.subPageUrl).subscribe((url) => {
            this.addToPM(url);
          });
          break;
        case 'add-to-rd':
          TorrentGetUrlQuery.getData(torrent.url, torrent.subPageUrl).subscribe((url) => {
            this.addToRD(url);
          });
          break;
        case 'add-to-ad':
          TorrentGetUrlQuery.getData(torrent.url, torrent.subPageUrl).subscribe((url) => {
            this.addToAD(url);
          });
          break;
        case 'open-elementum':
          this.openElementum(torrent, kodiOpenMedia);
          if (settings.enableEpisodeAutomaticPlaylist) {
            this.handleWakoPlaylist(torrent, kodiOpenMedia).subscribe();
          }
          break;
        case 'share-url':
          this.share(torrent.url, torrent.title);
          break;
        case 'add-to-playlist':
          this.handleWakoPlaylist(torrent, kodiOpenMedia, false).subscribe();
          break;
      }

      return;
    } else {
      const streamLinkSource = source as StreamLinkSource;

      const premiumizeSettings = await this.debridAccountService.getPremiumizeSettings();

      const preferTranscodedFiles = premiumizeSettings ? premiumizeSettings.preferTranscodedFiles : false;
      const preferTranscodedFilesChromecast = premiumizeSettings
        ? premiumizeSettings.preferTranscodedFilesChromecast
        : false;

      let getTranscoded = preferTranscodedFiles;

      let title = '';
      let posterUrl = '';

      if (kodiOpenMedia) {
        title = kodiOpenMedia.movie
          ? kodiOpenMedia.movie.title
          : kodiOpenMedia.show.title + ' ' + kodiOpenMedia.episode.code;
        posterUrl = kodiOpenMedia.movie ? kodiOpenMedia.movie.imagesUrl.poster : kodiOpenMedia.show.imagesUrl.poster;
      }

      let playVideo = false;

      if (streamLinkSource.streamLinks.length === 0) {
        throw new Error('No links found');
      }

      const streamLink = streamLinkSource.streamLinks[0];

      switch (action) {
        case 'add-to-pm':
          this.addToPM(streamLinkSource.originalUrl);
          break;
        case 'add-to-rd':
          this.addToRD(streamLinkSource.originalUrl);
          break;
        case 'add-to-ad':
          this.addToAD(streamLinkSource.originalUrl);
          break;
        case 'open-browser':
          let url = streamLink.url ?? streamLink.transcodedUrl;
          if (streamLink.servicePlayerUrl) {
            // They have their own player
            url = streamLink.servicePlayerUrl;
          }
          this.openBrowserUrl(url);
          playVideo = true;
          break;

        case 'share-url':
          this.share(
            preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url,
            streamLink.filename
          );
          break;

        case 'open-with':
          this.openWith(
            preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url,
            streamLink.filename
          );
          playVideo = true;
          break;

        case 'download-vlc':
          this.downloadWithVlc(
            preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url
          );
          playVideo = true;
          break;

        case 'open-vlc':
          this.openVlc(preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url);
          playVideo = true;
          break;

        case 'open-nplayer':
          this.openNplayer(
            preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url
          );
          playVideo = true;
          break;

        case 'open-kodi':
          const videoUrls = [];
          streamLinkSource.streamLinks.forEach((_streamLink) => {
            videoUrls.push(
              preferTranscodedFiles && _streamLink.transcodedUrl ? _streamLink.transcodedUrl : _streamLink.url
            );
          });
          this.openKodi(videoUrls, kodiOpenMedia);
          playVideo = true;
          break;

        case 'add-to-playlist':
          this.handleWakoPlaylist(source, kodiOpenMedia, false, getTranscoded).subscribe();
          break;

        case 'open-infuse':
          this.openInfuse(
            preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url
          );
          playVideo = true;
          break;

        case 'cast':
          let videoUrl1 = streamLink.url;
          let videoUrl2 = streamLink.transcodedUrl;
          if (preferTranscodedFilesChromecast) {
            videoUrl1 = streamLink.transcodedUrl;
            videoUrl2 = streamLink.url;

            getTranscoded = true;
          }
          this.cast(videoUrl1, kodiOpenMedia, null, null, videoUrl2);
          playVideo = true;
          break;

        default:
          SourceQueryFromKodiOpenMediaQuery.getData(kodiOpenMedia).subscribe((sourceQuery) => {
            this.openStreamLinkSource(streamLinkSource, sourceQuery, kodiOpenMedia);
          });
          return;
      }

      if (playVideo) {
        if (kodiOpenMedia) {
          if (kodiOpenMedia.show) {
            this.sourceService.setLastEpisodePlayedSource(
              streamLinkSource.id,
              streamLinkSource.title,
              streamLinkSource.provider,
              kodiOpenMedia.show.ids.trakt
            );
          } else if (kodiOpenMedia.movie) {
            this.sourceService.setLastMoviePlayedSource(
              streamLinkSource.id,
              streamLinkSource.title,
              streamLinkSource.provider
            );
          }
        }

        if (settings.enableEpisodeAutomaticPlaylist) {
          this.handleWakoPlaylist(source, kodiOpenMedia, true, getTranscoded).subscribe();
        }
      }
    }
  }

  /**
   * As stream links may not work after a certain time, we generate them again
   *
   */
  private async resetPlaylistVideoUrls(playlistVideo: PlaylistVideo, showLoader = true) {
    const customData: PlaylistVideoHeliosCustomData = playlistVideo.customData;
    if (customData.sourceQuery && customData.torrentSource) {
      if (customData.type === 'torrent') {
        const url = this.getStreamUrlFromSource(customData.torrentSource, customData.sourceQuery);
        if (url) {
          playlistVideo.url = url;
        }
      } else {
        const sources = await this.cachedTorrentService
          .getFromTorrents([customData.torrentSource], customData.sourceQuery)
          .toPromise();
        const source = sources.pop();
        if (!source) {
          return;
        }
        const streamLinks = await this.getStreamLinksWithLoader(source, customData.sourceQuery, showLoader);
        if (streamLinks) {
          source.streamLinks = streamLinks;

          const url = this.getStreamUrlFromSource(source, customData.sourceQuery);

          if (url) {
            playlistVideo.url = url;

            const transcodedUrl = this.getStreamUrlFromSource(source, customData.sourceQuery, true);

            if (transcodedUrl) {
              playlistVideo.customData.fallBackUrl = transcodedUrl;
            }
          }
        }
      }
    }
  }

  async openPlaylistVideo(playlistVideo: PlaylistVideo) {
    const customData: PlaylistVideoHeliosCustomData = playlistVideo.customData;

    if (customData.sourceQuery && customData.torrentSource) {
      // New playlist item
      const originalUrl = playlistVideo.url;

      await this.resetPlaylistVideoUrls(playlistVideo);

      this.heliosPlaylistService.getPlaylistFromVideoUrl(originalUrl).then(async (playlist) => {
        // Do this in background
        if (playlist) {
          return;
        }

        for (const item of playlist.items) {
          await this.resetPlaylistVideoUrls(item, false);
        }

        await this.heliosPlaylistService.savePlaylist(playlist);
      });
    }

    const seek = Math.round(((playlistVideo.currentSeconds - 5) / playlistVideo.totalSeconds) * 100);

    let kodiOpenMedia: KodiOpenMedia = null;
    if (
      playlistVideo.customData &&
      (playlistVideo.customData.movie || (playlistVideo.customData.show && playlistVideo.customData.episode))
    ) {
      kodiOpenMedia = {
        movie: playlistVideo.customData.movie,
        show: playlistVideo.customData.show,
        episode: playlistVideo.customData.episode,
        titleLang: playlistVideo.customData.titleLang,
      };
    }

    if (playlistVideo.url.match('elementum')) {
      this.openKodi(
        [playlistVideo.url],
        null,
        seek,
        'plugin.video.elementum',
        this.getElementumCheckObservable(),
        playlistVideo.openMedia
      );
      return;
    }

    const settings = await this.settingsService.get();

    const buttons = [];

    settings.availablePlayButtonActions.forEach((action) => {
      if (action.match('elementum')) {
        return;
      }

      if (action === 'add-to-pm' || action === 'add-to-rd' || action === 'add-to-playlist') {
        return;
      }

      const buttonOptions = {
        text: this.translateService.instant('actionSheets.open-source.options.' + action),
      } as any;

      switch (action) {
        case 'open-browser':
          buttonOptions.icon = 'browsers';
          buttonOptions.handler = () => {
            this.openBrowserUrl(playlistVideo.url);
          };
          break;
        case 'copy-url':
          buttonOptions.role = 'copy-url';
          buttonOptions.icon = 'copy';
          buttonOptions.handler = () => {
            this.toastService.simpleMessage('toasts.copyToClipboard', { element: 'Video URL' });
          };
          break;

        case 'share-url':
          buttonOptions.icon = 'share';
          buttonOptions.handler = () => {
            this.share(playlistVideo.url, playlistVideo.label);
          };
          break;

        case 'open-with':
          buttonOptions.icon = 'open';
          buttonOptions.handler = () => {
            this.openWith(playlistVideo.url, playlistVideo.label);
          };
          break;

        case 'download-vlc':
          buttonOptions.icon = 'cloud-download';
          buttonOptions.handler = () => {
            this.downloadWithVlc(playlistVideo.url);
          };
          break;

        case 'open-vlc':
          buttonOptions.cssClass = 'vlc';
          buttonOptions.handler = () => {
            this.openVlc(playlistVideo.url);
          };
          break;

        case 'open-nplayer':
          buttonOptions.cssClass = 'nplayer';
          buttonOptions.handler = () => {
            this.openNplayer(playlistVideo.url);
          };
          break;

        case 'open-kodi':
          buttonOptions.cssClass = 'kodi';
          buttonOptions.handler = () => {
            // Set metadata
            const originalVideoUrl = playlistVideo.url;

            if (kodiOpenMedia) {
              const openMedia = getOpenMediaFromKodiOpenMedia(kodiOpenMedia);
              // tslint:disable-next-line:max-line-length
              playlistVideo.url = KodiAppService.prependOpenMediaToUrl(playlistVideo.url, openMedia);
            }

            KodiAppService.checkAndConnectToCurrentHost()
              .pipe(
                catchError((err) => {
                  if (err === 'hostUnreachable') {
                    this.toastService.simpleMessage(
                      'toasts.kodi.hostUnreachable',
                      { hostName: KodiAppService.currentHost.name },
                      2000
                    );
                  } else {
                    this.toastService.simpleMessage('toasts.kodi.noHost');
                  }
                  return NEVER;
                }),
                switchMap(() => KodiAppService.resumePlaylistVideo(playlistVideo))
              )
              .subscribe(() => {
                playlistVideo.url = originalVideoUrl;
              });
          };
          break;

        case 'open-infuse':
          buttonOptions.cssClass = 'infuse';
          buttonOptions.handler = () => {
            this.openInfuse(playlistVideo.url);
          };
          break;

        case 'cast':
          buttonOptions.cssClass = 'cast';
          const videoUrl1 = playlistVideo.url;
          let videoUrl2 = null;
          if (playlistVideo.customData && playlistVideo.customData.fallbackUrl) {
            videoUrl2 = playlistVideo.customData.fallbackUrl;
          }

          buttonOptions.handler = () => {
            this.cast(videoUrl1, kodiOpenMedia, playlistVideo.currentSeconds, playlistVideo.openMedia, videoUrl2);
          };
          break;
      }

      buttons.push(buttonOptions);
    });

    if (buttons.length === 1) {
      buttons[0].handler();
      return;
    }

    buttons.forEach((button) => {
      if (!button.icon) {
        button.icon = 'arrow-dropright';
      }
    });

    const actionSheet = await this.actionSheetController.create({
      header: this.translateService.instant('actionSheets.open-source.openTitle'),
      buttons: buttons,
    });

    this.setImages();

    await actionSheet.present();

    const copyEl = document.querySelector('.action-sheet-copy-url');
    if (!copyEl) {
      return;
    }

    copyEl.addEventListener('click', () => {
      this.clipboardService.copyFromContent(playlistVideo.url);
      setTimeout(() => {
        // Need to be done twice to work on android
        this.clipboardService.copyFromContent(playlistVideo.url);
      }, 100);
    });
  }
}
