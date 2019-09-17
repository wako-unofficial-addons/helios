import { Injectable } from '@angular/core';
import { ActionSheetController, LoadingController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { DebridAccountService } from './debrid-account.service';
import {
  BrowserService,
  KodiApiService,
  KodiAppService,
  KodiGetAddonDetailsForm,
  OpenMedia,
  ToastService
} from '@wako-app/mobile-sdk';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { EMPTY, NEVER, of } from 'rxjs';
import { KodiOpenMedia } from '../entities/kodi-open-media';
import { PremiumizeTransferCreateForm } from './premiumize/forms/transfer/premiumize-transfer-create.form';
import { RealDebridCacheUrlCommand } from './real-debrid/commands/real-debrid-cache-url.command';
import { ClipboardService } from 'ngx-clipboard';
import { TorrentGetUrlQuery } from '../queries/torrents/torrent-get-url.query';
import { TorrentSource } from '../entities/torrent-source';
import { DebridSource, DebridSourceFile } from '../entities/debrid-source';
import { HeliosCacheService } from './provider-cache.service';
import { getPreviousFileNamePlayed, logEvent } from './tools';
import { SettingsService } from './settings.service';

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
    private settingsService: SettingsService
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

  openDebridSource(debridSource: DebridSource, kodiOpenMedia?: KodiOpenMedia) {
    this.loadingController
      .create({
        message: 'Please wait...',
        spinner: 'crescent'
      })
      .then(loader => {
        loader.present();

        debridSource.debridSourceFileObs.pipe(finalize(() => loader.dismiss())).subscribe(
          debridSourceFiles => {
            if (Array.isArray(debridSourceFiles)) {
              this.selectDebridSource(debridSourceFiles, kodiOpenMedia);
            } else {
              this._openDebridSource(debridSourceFiles, kodiOpenMedia);
            }
          },
          err => {
            if (err && typeof err === 'string') {
              this.toastService.simpleMessage(err, null, 4000);
            } else {
              this.toastService.simpleMessage('toasts.open-source.sourceNotCached');
            }
          }
        );
      });
  }

  private async selectDebridSource(debridSourceFiles: DebridSourceFile[], kodiOpenMedia?: KodiOpenMedia) {
    const buttons = [];
    debridSourceFiles.forEach(link => {
      buttons.push({
        text: link.filename,
        handler: () => {
          this._openDebridSource(link, kodiOpenMedia);
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

    if (kodiOpenMedia && kodiOpenMedia.show) {
      HeliosCacheService.set(getPreviousFileNamePlayed(kodiOpenMedia.show.traktId), torrent.title, '20d');
    }

    if (hasCloudAccount) {
      if (premiumizeSettings) {
        buttons.push({
          text: this.translateService.instant('actionSheets.open-source.options.addToPM'),
          handler: () => {
            this.addToPM(torrent.url);
          }
        });
      }
      if (realDebridSettings) {
        buttons.push({
          text: this.translateService.instant('actionSheets.open-source.options.addToRD'),
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

  private async _openDebridSource(debridSourceFile: DebridSourceFile, kodiOpenMedia?: KodiOpenMedia) {

    const premiumizeSettings = await this.debridAccountService.getPremiumizeSettings();
    const preferTranscodedFiles = premiumizeSettings ? premiumizeSettings.preferTranscodedFiles : false;
    const settings = await this.settingsService.get();

    const currentHost = KodiAppService.currentHost;

    let title = '';
    let posterUrl = '';

    if (kodiOpenMedia) {
      title = kodiOpenMedia.movie ? kodiOpenMedia.movie.title : kodiOpenMedia.show.title + ' ' + kodiOpenMedia.episode.code;
      posterUrl = kodiOpenMedia.movie ? kodiOpenMedia.movie.images_url.poster : kodiOpenMedia.show.images_url.poster;

      if (kodiOpenMedia.show) {
        HeliosCacheService.set(getPreviousFileNamePlayed(kodiOpenMedia.show.traktId), debridSourceFile.title, '20d');
      }
    }

    const buttons = [];

    settings.availablePlayButtonActions.forEach(action => {
      const buttonOptions = {
        text: this.translateService.instant('actionSheets.open-source.options.' + action)
      } as any;

      switch (action) {
        case 'open-browser':
          buttonOptions.handler = () => {
            if (debridSourceFile.servicePlayerUrl) { // They have their own player
              this.openBrowserUrl(debridSourceFile.servicePlayerUrl);
            } else {
              this.openBrowser(debridSourceFile.url, debridSourceFile.transcodedUrl, title, posterUrl);
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
              preferTranscodedFiles && debridSourceFile.transcodedUrl ? debridSourceFile.transcodedUrl : debridSourceFile.url,
              debridSourceFile.filename
            );
          };
          break;

        case 'open-with':
          buttonOptions.handler = () => {
            this.openWith(
              preferTranscodedFiles && debridSourceFile.transcodedUrl ? debridSourceFile.transcodedUrl : debridSourceFile.url,
              debridSourceFile.filename
            );
          };
          break;

        case 'download-vlc':
          buttonOptions.handler = () => {
            this.downloadWithVlc(
              preferTranscodedFiles && debridSourceFile.transcodedUrl ? debridSourceFile.transcodedUrl : debridSourceFile.url
            );
          };
          break;

        case 'open-vlc':
          buttonOptions.handler = () => {
            this.openVlc(preferTranscodedFiles && debridSourceFile.transcodedUrl ? debridSourceFile.transcodedUrl : debridSourceFile.url);
          };
          break;

        case 'open-kodi':
          buttonOptions.handler = () => {
            this.openKodi(
              preferTranscodedFiles && debridSourceFile.transcodedUrl ? debridSourceFile.transcodedUrl : debridSourceFile.url,
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
      this.clipboardService.copyFromContent(debridSourceFile.url);
      logEvent('helios_action', {action: 'copy-url'});
    });
  }

  async openKodi(videoUrl: string, kodiOpenMedia?: KodiOpenMedia) {
    KodiAppService.checkAndConnectToCurrentHost()
      .pipe(
        catchError(err => {
          if (err === 'hostUnreachable') {
            this.toastService.simpleMessage('toasts.kodi.hostUnreachable', {hostName: KodiAppService.currentHost.name}, 2000);
          } else {
            this.toastService.simpleMessage('toasts.kodi.noHost');
          }
          return NEVER;
        }),
        switchMap(() => {
          let openMedia: OpenMedia = {};

          if (kodiOpenMedia) {
            openMedia = {
              movieTraktId: kodiOpenMedia.movie ? kodiOpenMedia.movie.traktId : null,
              showTraktId: kodiOpenMedia.show ? kodiOpenMedia.show.traktId : null,
              seasonNumber: kodiOpenMedia.episode ? kodiOpenMedia.episode.traktSeasonNumber : null,
              episodeNumber: kodiOpenMedia.episode ? kodiOpenMedia.episode.traktNumber : null
            };
          }
          return KodiAppService.openUrl(videoUrl, openMedia, true);
        })
      )
      .subscribe(() => {
        const toastMessage = 'toasts.startOpening';
        const toastParams = {
          title: !kodiOpenMedia ? '' : (kodiOpenMedia.movie ? kodiOpenMedia.movie.title : kodiOpenMedia.show.title).replace(/\./g, ' '),
          hostName: KodiApiService.host.name
        };

        this.toastService.simpleMessage(toastMessage, toastParams);

        logEvent('helios_action', {action: 'open-kodi'});
      });
  }

  async openBrowser(videoUrl: string, transcodedUrl?: string, title?: string, posterUrl?: string) {
    const urlSearchParams = new URLSearchParams();
    urlSearchParams.set('title', title);
    urlSearchParams.set('posterUrl', posterUrl);
    urlSearchParams.set('videoUrl', videoUrl);
    urlSearchParams.set('transcodedUrl', transcodedUrl ? transcodedUrl : videoUrl);

    const wakoUrl = `https://wako.app/player?${decodeURIComponent(urlSearchParams.toString())}`;

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

  async openElementum(torrent: TorrentSource, kodiOpenMedia?: KodiOpenMedia) {
    KodiAppService.checkAndConnectToCurrentHost()
      .pipe(
        catchError(err => {
          if (err === 'hostUnreachable') {
            this.toastService.simpleMessage('toasts.kodi.hostUnreachable', {hostName: KodiAppService.currentHost.name}, 2000);
          } else {
            this.toastService.simpleMessage('toasts.kodi.noHost');
          }
          return NEVER;
        }),
        switchMap(() => {
          return this.isElementumAddonInstalled();
        }),
        switchMap(isInstalled => {
          if (!isInstalled) {
            this.toastService.simpleMessage('toasts.elementumNotInstalled');

            return NEVER;
          }
          return of(true);
        })
      )
      .subscribe(() => {
        let openMedia: OpenMedia = {};

        if (kodiOpenMedia) {
          openMedia = {
            movieTraktId: kodiOpenMedia.movie ? kodiOpenMedia.movie.traktId : null,
            showTraktId: kodiOpenMedia.show ? kodiOpenMedia.show.traktId : null,
            seasonNumber: kodiOpenMedia.episode ? kodiOpenMedia.episode.traktSeasonNumber : null,
            episodeNumber: kodiOpenMedia.episode ? kodiOpenMedia.episode.traktNumber : null
          };
        }
        KodiAppService.openUrl(this.getElementumUrlBySourceUrl(torrent.url), openMedia, true).subscribe(() => {
          const toastMessage = 'toasts.startOpening';
          const toastParams = {
            title: torrent.title.replace(/\./g, ' '),
            hostName: KodiApiService.host.name
          };

          this.toastService.simpleMessage(toastMessage, toastParams);

          logEvent('helios_action', {action: 'open-elementum'});
        });
      });
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

  private getElementumUrlBySourceUrl(sourceUrl: string) {
    const url = `plugin://plugin.video.elementum/play`;

    const urlSearchParams = new URLSearchParams();

    urlSearchParams.set('uri', sourceUrl);

    return url + '?' + urlSearchParams.toString();
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
        (err) => console.log('intentShim err', err)
      );

    }
  }
}
