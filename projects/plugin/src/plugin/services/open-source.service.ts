import { Injectable } from '@angular/core';
import { ActionSheetController, LoadingController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { DebridAccountService } from './debrid-account.service';
import {
  BrowserService,
  EventCategory,
  EventService,
  KodiApiService,
  KodiAppService,
  KodiGetAddonDetailsForm,
  OpenMedia,
  ToastService,
  WakoHttpError,
  WakoPlaylistService
} from '@wako-app/mobile-sdk';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { EMPTY, from, NEVER, Observable, of } from 'rxjs';
import { KodiOpenMedia } from '../entities/kodi-open-media';
import { PremiumizeTransferCreateForm } from './premiumize/forms/transfer/premiumize-transfer-create.form';
import { RealDebridCacheUrlCommand } from './real-debrid/commands/real-debrid-cache-url.command';
import { ClipboardService } from 'ngx-clipboard';
import { TorrentGetUrlQuery } from '../queries/torrents/torrent-get-url.query';
import { TorrentSource } from '../entities/torrent-source';
import {
  addToPlaylist,
  getElementumUrlBySourceUrl,
  incrementEpisodeCode,
  isEpisodeCodeMatchesFileName,
  logEvent
} from './tools';
import { SettingsService } from './settings.service';
import { StreamLink, StreamLinkSource } from '../entities/stream-link-source';
import { CachedTorrentSourceService } from './sources/cached-torrent-source.service';
import { SourceQuery } from '../entities/source-query';
import { SourceService } from './sources/source.service';
import { SourceQueryFromKodiOpenMediaQuery } from '../queries/source-query-from-kodi-open-media.query';

@Injectable()
export class OpenSourceService {
  constructor(
    private actionSheetController: ActionSheetController,
    private translateService: TranslateService,
    private platform: Platform,
    private browserService: BrowserService,
    private debridAccountService: DebridAccountService,
    private toastService: ToastService,
    private loadingController: LoadingController,
    private clipboardService: ClipboardService,
    private settingsService: SettingsService,
    private cachedTorrentService: CachedTorrentSourceService,
    private sourceService: SourceService,
  ) {
  }

  openTorrentSource(torrent: TorrentSource, kodiOpenMedia?: KodiOpenMedia) {
    TorrentGetUrlQuery.getData(torrent.url, torrent.subPageUrl).subscribe(torrentUrl => {
      if (!torrentUrl) {
        this.toastService.simpleMessage('toasts.open-source.cannotRetrieveUrl');
        return;
      }

      torrent.url = torrentUrl;

      this._openTorrentSource(torrent, kodiOpenMedia);
    });
  }

  async openStreamLinkSource(streamLinkSource: StreamLinkSource, sourceQuery: SourceQuery, kodiOpenMedia: KodiOpenMedia) {
    const loader = await this.loadingController.create({
      message: 'Please wait...',
      spinner: 'crescent'
    });

    loader.present();

    this.cachedTorrentService
      .getStreamLinks(streamLinkSource, sourceQuery)
      .pipe(finalize(() => loader.dismiss()))
      .subscribe(
        streamLinks => {
          streamLinkSource.streamLinks = streamLinks;

          let selectStreamLinks = sourceQuery.query && streamLinks.length > 1;

          if (sourceQuery.episode && streamLinks.length > 1) {
            let currentEpisodeFound = false;
            let episodeCode = sourceQuery.episode.episodeCode;

            streamLinks.forEach(streamLink => {
              if (isEpisodeCodeMatchesFileName(episodeCode, streamLink.filename)) {
                currentEpisodeFound = true;
              }
            });

            if (!currentEpisodeFound) {
              selectStreamLinks = true;

              this.toastService.simpleMessage(`Episode ${episodeCode} not found`);
            }
          }

          if (selectStreamLinks) {
            this.selectStreamLink(streamLinkSource, kodiOpenMedia);
          } else {
            this.openStreamLinks(streamLinks, streamLinkSource, kodiOpenMedia);
          }
        },
        err => {
          if (err && err instanceof WakoHttpError) {
            if (err.status === 403) {
              this.toastService.simpleMessage('toasts.open-source.permissionDenied', null, 4000);
            } else {
              this.toastService.simpleMessage(JSON.stringify(err.response), null, 4000);
            }
          } else if (err && typeof err === 'string') {
            this.toastService.simpleMessage(err, null, 4000);
          } else {
            this.toastService.simpleMessage('toasts.open-source.sourceNotCached');
          }
        }
      );
  }

  private async selectStreamLink(streamLinkSource: StreamLinkSource, kodiOpenMedia?: KodiOpenMedia) {
    const buttons = [];
    streamLinkSource.streamLinks.forEach(link => {
      buttons.push({
        text: link.filename,
        handler: () => {
          this.openStreamLinks([link], streamLinkSource, kodiOpenMedia);
        }
      });
    });

    if (buttons.length > 5) {
      buttons.push({
        text: this.translateService.instant('shared.cancel'),
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      });
    }

    const action = await this.actionSheetController.create({
      header: this.translateService.instant('actionSheets.open-source.selectLink.openTitle'),
      buttons: buttons
    });

    action.present();
  }

  private async _openTorrentSource(torrent: TorrentSource, kodiOpenMedia?: KodiOpenMedia) {
    const hasCloudAccount = await this.debridAccountService.hasAtLeastOneAccount();

    const currentHost = KodiAppService.currentHost;

    const premiumizeSettings = await this.debridAccountService.getPremiumizeSettings();

    const realDebridSettings = await this.debridAccountService.getRealDebridSettings();

    const buttons = [];


    if (kodiOpenMedia) {
      if (kodiOpenMedia.show) {
        this.sourceService.setLastEpisodePlayedSource(torrent.id, torrent.title, torrent.provider, kodiOpenMedia.show.traktId);
      } else if (kodiOpenMedia.movie) {
        this.sourceService.setLastMoviePlayedSource(torrent.id, torrent.title, torrent.provider);
      }
    }

    if (hasCloudAccount) {
      if (premiumizeSettings) {
        buttons.push({
          text: this.translateService.instant('actionSheets.open-source.options.add-to-pm'),
          handler: () => {
            this.addToPM(torrent.url);
          }
        });
      }
      if (realDebridSettings) {
        buttons.push({
          text: this.translateService.instant('actionSheets.open-source.options.add-to-rd'),
          handler: () => {
            this.addToRD(torrent.url);
          }
        });
      }
    }

    if (window['plugins'] && window['plugins'].socialsharing) {
      buttons.push({
        text: this.translateService.instant('actionSheets.open-source.options.share-url'),
        handler: () => {
          this.share(torrent.url, torrent.title);
        }
      });
    }

    if (currentHost) {
      buttons.push({
        text: this.translateService.instant('actionSheets.open-source.options.open-elementum'),
        handler: () => {
          this.openElementum(torrent, kodiOpenMedia);
        }
      });
    }

    if (buttons.length === 1) {
      buttons[0].handler();
      return;
    }

    const action = await this.actionSheetController.create({
      header: this.translateService.instant('actionSheets.open-source.openTitle'),
      buttons: buttons
    });

    await action.present();
  }

  private async openStreamLinks(streamLinks: StreamLink[], streamLinkSource: StreamLinkSource, kodiOpenMedia?: KodiOpenMedia) {
    const hasCloudAccount = await this.debridAccountService.hasAtLeastOneAccount();

    const premiumizeSettings = await this.debridAccountService.getPremiumizeSettings();

    const realDebridSettings = await this.debridAccountService.getRealDebridSettings();

    const preferTranscodedFiles = premiumizeSettings ? premiumizeSettings.preferTranscodedFiles : false;
    const settings = await this.settingsService.get();

    let title = '';
    let posterUrl = '';

    if (kodiOpenMedia) {
      title = kodiOpenMedia.movie ? kodiOpenMedia.movie.title : kodiOpenMedia.show.title + ' ' + kodiOpenMedia.episode.code;
      posterUrl = kodiOpenMedia.movie ? kodiOpenMedia.movie.images_url.poster : kodiOpenMedia.show.images_url.poster;

      if (kodiOpenMedia.show) {
        this.sourceService.setLastEpisodePlayedSource(streamLinkSource.id, streamLinkSource.title, streamLinkSource.provider, kodiOpenMedia.show.traktId);
      } else if (kodiOpenMedia.movie) {
        this.sourceService.setLastMoviePlayedSource(streamLinkSource.id, streamLinkSource.title, streamLinkSource.provider);
      }
    }

    const buttons = [];

    const streamLink = streamLinks[0];

    settings.availablePlayButtonActions.forEach(action => {
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
        text: this.translateService.instant('actionSheets.open-source.options.' + action)
      } as any;


      switch (action) {
        case 'add-to-pm':
          buttonOptions.handler = () => {
            this.addToPM(streamLinkSource.originalUrl);
          };
          break;
        case 'add-to-rd':
          buttonOptions.handler = () => {
            this.addToRD(streamLinkSource.originalUrl);
          };
          break;
        case 'open-browser':
          buttonOptions.handler = () => {
            if (streamLink.servicePlayerUrl) {
              // They have their own player
              this.openBrowserUrl(streamLink.servicePlayerUrl);
            } else {
              this.openBrowser(streamLink.url, streamLink.transcodedUrl, title, posterUrl);
            }
          };
          break;
        case 'copy-url':
          buttonOptions.role = 'copy-url';
          buttonOptions.handler = () => {
            this.toastService.simpleMessage('toasts.copyToClipboard', {element: 'Video URL'});
          };
          break;

        case 'share-url':
          buttonOptions.handler = () => {
            this.share(
              preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url,
              streamLink.filename
            );
          };
          break;

        case 'open-with':
          buttonOptions.handler = () => {
            this.openWith(
              preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url,
              streamLink.filename
            );
          };
          break;

        case 'download-vlc':
          buttonOptions.handler = () => {
            this.downloadWithVlc(
              preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url
            );
          };
          break;

        case 'open-vlc':
          buttonOptions.handler = () => {
            this.openVlc(preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url);
          };
          break;

        case 'open-nplayer':
          buttonOptions.handler = () => {
            this.openNplayer(
              preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url
            );
          };
          break;

        case 'open-kodi':
          buttonOptions.handler = () => {
            const videoUrls = [];
            streamLinks.forEach(_streamLink => {
              videoUrls.push(preferTranscodedFiles && _streamLink.transcodedUrl ? _streamLink.transcodedUrl : _streamLink.url)
            });
            this.openKodi(
              videoUrls,
              kodiOpenMedia
            );
          };
          break;
      }

      buttons.push(buttonOptions);
    });


    if (buttons.length === 1) {
      buttons[0].handler();
      return;
    }

    const action = await this.actionSheetController.create({
      header: this.translateService.instant('actionSheets.open-source.openTitle'),
      buttons: buttons
    });

    await action.present();

    const copyEl = document.querySelector('.action-sheet-copy-url');
    if (!copyEl) {
      return;
    }

    copyEl.addEventListener('click', () => {
      this.clipboardService.copyFromContent(streamLink.url);
      logEvent('helios_action', {action: 'copy-url'});
    });
  }

  openKodi(videoUrls: string[], kodiOpenMedia?: KodiOpenMedia, pluginId?: string, obsBeforeOpening?: Observable<any>) {
    let totalNextUpVideo = 0;
    return KodiAppService.checkAndConnectToCurrentHost()
      .pipe(
        catchError(err => {
          if (err === 'hostUnreachable') {
            this.toastService.simpleMessage('toasts.kodi.hostUnreachable', {hostName: KodiAppService.currentHost.name}, 2000);
          } else {
            this.toastService.simpleMessage('toasts.kodi.noHost');
          }
          return NEVER;
        }),
        switchMap(() => obsBeforeOpening ? obsBeforeOpening : of(true)),
        switchMap(() => {
          let openMedia: OpenMedia = {};


          let firstVideoUrl = videoUrls.shift();
          if (kodiOpenMedia) {
            openMedia = {
              movieTraktId: kodiOpenMedia.movie ? kodiOpenMedia.movie.traktId : null,
              showTraktId: kodiOpenMedia.show ? kodiOpenMedia.show.traktId : null,
              seasonNumber: kodiOpenMedia.episode ? kodiOpenMedia.episode.traktSeasonNumber : null,
              episodeNumber: kodiOpenMedia.episode ? kodiOpenMedia.episode.traktNumber : null
            };

            if (!pluginId) {
              firstVideoUrl += `|movieTraktId=${openMedia.movieTraktId}&showTraktId=${openMedia.showTraktId}&seasonNumber=${openMedia.seasonNumber}&episodeNumber=${openMedia.episodeNumber}`;
            }
          }

          return from(this.settingsService.get()).pipe(
            switchMap(settings => {
              if (WakoPlaylistService) {
                WakoPlaylistService.set([{
                  url: firstVideoUrl,
                  isCurrent: true
                }]);
              }
              return KodiAppService.openUrl(firstVideoUrl, openMedia, settings.openRemoteAfterClickOnPlay);
            })
          );
        }),
        tap(done => {
          if (kodiOpenMedia && kodiOpenMedia.show && videoUrls.length === 0) {
            EventService.emit(EventCategory.kodi, 'playEpisode', {kodiOpenMedia, pluginId});
          }

          // Take only 5 episodes
          const newVideoUrls = videoUrls.slice(0, 5);

          totalNextUpVideo = newVideoUrls.length;

          const toastMessage = 'toasts.startOpening';
          const toastParams = {
            title: !kodiOpenMedia ? '' : (kodiOpenMedia.movie ? kodiOpenMedia.movie.title : kodiOpenMedia.show.title).replace(/\./g, ' '),
            hostName: KodiApiService.host.name
          };

          let message = this.translateService.instant(toastMessage, toastParams);

          if (totalNextUpVideo > 0) {
            message += '<br/>' + this.translateService.instant('sources.addToQueue', {totalEpisode: totalNextUpVideo})
          }

          this.toastService.simpleMessage(message);

          let action = 'open-kodi';
          if (pluginId === 'plugin.video.elementum') {
            action = 'open-elementum';
          }


          logEvent('helios_action', {action: action});
          if (videoUrls.length > 0) {
            addToPlaylist(newVideoUrls, kodiOpenMedia, !pluginId).subscribe();
          }
        })
      )
      .subscribe(() => {
      });
  }

  async openBrowser(videoUrl: string, transcodedUrl?: string, title?: string, posterUrl?: string) {
    const urlSearchParams = new URLSearchParams();
    urlSearchParams.set('title', title);
    urlSearchParams.set('posterUrl', posterUrl);
    urlSearchParams.set('videoUrl', videoUrl);
    urlSearchParams.set('transcodedUrl', transcodedUrl ? transcodedUrl : videoUrl);

    const wakoUrl = `https://wako.app/player?${urlSearchParams.toString()}`;

    this.openBrowserUrl(wakoUrl);
  }

  private openBrowserUrl(url: string) {
    if (this.platform.is('ios')) {
      this.browserService.open(url, true);
    } else {
      window.open(url, '_system', 'location=yes');
    }

    logEvent('helios_action', {action: 'open-browser'});
  }

  async openVlc(videoUrl: string) {
    if (this.platform.is('ios')) {
      const url = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(videoUrl)}`;
      this.browserService.open(url, false);
    } else {
      const url = `vlc://${videoUrl}`;
      this.browserService.open(url, false);
    }

    logEvent('helios_action', {action: 'open-vlc'});
  }

  async openNplayer(videoUrl: string) {
    if (!this.platform.is('ios')) {
      return;
    }
    const url = `nplayer-${videoUrl}`;
    this.browserService.open(url, false);

    logEvent('helios_action', {action: 'open-nplayer'});
  }

  async downloadWithVlc(videoUrl: string) {
    console.log('downloadWithVlc', videoUrl);

    if (this.platform.is('ios')) {
      const url = `vlc-x-callback://x-callback-url/download?url=${encodeURIComponent(videoUrl)}`;
      this.browserService.open(url, false);
    }

    logEvent('helios_action', {action: 'download-vlc'});
  }

  private async addToPM(url: string) {
    const loader = await this.loadingController.create({
      message: 'Please wait...',
      spinner: 'crescent'
    });

    loader.present();

    PremiumizeTransferCreateForm.submit(url)
      .pipe(finalize(() => loader.dismiss()))
      .subscribe(data => {
        if (data.status === 'success') {
          this.toastService.simpleMessage('toasts.open-source.addedToPM');
        } else {
          this.toastService.simpleMessage('toasts.open-source.failedToAddToPM', {error: data.message});
        }

        logEvent('helios_action', {action: 'add-pm'});
      });
  }

  private async addToRD(url: string) {
    const loader = await this.loadingController.create({
      message: 'Please wait...',
      spinner: 'crescent'
    });

    loader.present();

    RealDebridCacheUrlCommand.handle(url)
      .pipe(
        catchError(err => {
          this.toastService.simpleMessage('toasts.open-source.failedToAddToRD', {error: err});
          return EMPTY;
        }),
        finalize(() => loader.dismiss())
      )
      .subscribe(
        () => {
          this.toastService.simpleMessage('toasts.open-source.addedToRD');

          logEvent('helios_action', {action: 'add-rd'});
        },
        err => {
          this.toastService.simpleMessage('toasts.open-source.failedToAddToRD', {error: err.toString()});
        }
      );
  }

  openElementum(torrent: TorrentSource, kodiOpenMedia?: KodiOpenMedia) {

    const obs = of(true).pipe(
      switchMap(() => this.isElementumAddonInstalled()),
      switchMap(isInstalled => {
        if (!isInstalled) {
          this.toastService.simpleMessage('toasts.elementumNotInstalled');

          return NEVER;
        }
        return of(true);
      })
    );

    let _obs = of(null);
    if (kodiOpenMedia) {
      _obs = SourceQueryFromKodiOpenMediaQuery.getData(kodiOpenMedia);
    }
    _obs
      .subscribe(sourceQuery => {
        const urls = [
          getElementumUrlBySourceUrl(torrent.url, sourceQuery)
        ];

        if (sourceQuery && sourceQuery.episode && torrent.isPackage) {
          let limit = sourceQuery.episode.latestAiredEpisode - sourceQuery.episode.episodeNumber;

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

        this.openKodi(urls, kodiOpenMedia, 'plugin.video.elementum', obs);
      })


  }

  private isElementumAddonInstalled() {
    return this.isPluginInstalled('plugin.video.elementum');
  }

  private isPluginInstalled(plugin: string) {
    return KodiGetAddonDetailsForm.submit(plugin).pipe(
      map(data => {
        return !!data;
      })
    );
  }


  share(cachedUrl: string, torrentTitle: string) {
    if (window['plugins'] && window['plugins'].socialsharing) {
      window['plugins'].socialsharing.shareWithOptions({
        url: cachedUrl,
        chooserTitle: torrentTitle
      });

      logEvent('helios_action', {action: 'share-url'});
    }
  }

  openWith(url: string, title: string) {
    if (window['plugins'] && window['plugins'].intentShim) {
      const intentShim: any = window['plugins'].intentShim;

      intentShim.startActivity(
        {
          action: window['plugins'].intentShim.ACTION_VIEW,
          type: 'video/*',
          url: url,
          extras: {
            title: title
          }
        },
        () => console.log('intentShim success'),
        err => console.log('intentShim err', err)
      );
    }
  }
}
