import { Injectable } from '@angular/core';
import { ActionSheetController, LoadingController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { CloudAccountService } from './cloud-account.service';
import {
  BrowserService,
  KodiApiService,
  KodiAppService,
  KodiGetAddonDetailsForm,
  OpenMedia,
  ToastService
} from '@wako-app/mobile-sdk';
import { TorrentService } from './torrent.service';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { EMPTY, NEVER, of } from 'rxjs';
import { CachedLink, Torrent } from '../entities/torrent';
import { KodiOpenMedia } from '../entities/kodi-open-media';
import { PremiumizeTransferCreateForm } from './premiumize/forms/transfer/premiumize-transfer-create.form';
import { RealDebridCacheUrlCommand } from './real-debrid/commands/real-debrid-cache-url.command';
import { ClipboardService } from 'ngx-clipboard';

@Injectable()
export class OpenSourceService {
  constructor(
    private actionSheetController: ActionSheetController,
    private translateService: TranslateService,
    private platform: Platform,
    private browserService: BrowserService,
    private cloudAccountService: CloudAccountService,
    private toastService: ToastService,
    private torrentService: TorrentService,
    private loadingController: LoadingController,
    private clipboardService: ClipboardService
  ) {
  }

  open(torrent: Torrent, kodiOpenMedia?: KodiOpenMedia) {
    this.torrentService.getTorrentUrl(torrent).subscribe(torrentUrl => {
      if (!torrentUrl) {
        this.toastService.simpleMessage('toasts.open-source.cannotRetrieveUrl');
        return;
      }

      torrent.url = torrentUrl;

      if (!torrent.isCachedSource) {
        this.openSource(torrent.title, null, null, torrent, kodiOpenMedia);
        return;
      }

      if (torrent.cachedData.link) {
        this.openSource(
          torrent.cachedData.link.filename,
          torrent.cachedData.link.url,
          torrent.cachedData.link.transcoded_url,
          torrent,
          kodiOpenMedia
        );
        return;
      }

      this.loadingController
        .create({
          message: 'Please wait...',
          spinner: 'crescent'
        })
        .then(loader => {
          loader.present();

          torrent.cachedData.linkObs.pipe(finalize(() => loader.dismiss())).subscribe(
            cachedLink => {
              if (Array.isArray(cachedLink)) {
                this.selectCachedLink(cachedLink, torrent, kodiOpenMedia);
                return;
              }

              this.openSource(cachedLink.filename, cachedLink.url, cachedLink.transcoded_url, torrent, kodiOpenMedia);
            },
            err => {
              if (err && typeof err === 'string') {
                this.toastService.simpleMessage(err, null, 4000);
              } else {
                this.toastService.simpleMessage('toasts.open-source.sourceNotCached');
              }
              this.openSource(torrent.title, null, null, torrent, kodiOpenMedia);
            }
          );
        });
    });
  }

  private async selectCachedLink(cachedLinks: CachedLink[], torrent: Torrent, kodiOpenMedia?: KodiOpenMedia) {
    const buttons = [];
    cachedLinks.forEach(link => {
      buttons.push({
        text: link.filename,
        handler: () => {
          torrent.cachedData.link = link;
          this.openSource(link.filename, link.url, link.transcoded_url, torrent, kodiOpenMedia);
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

  private async openSource(
    filename: string,
    cachedUrl: string,
    cachedTranscodedUrl: string,
    torrent: Torrent,
    kodiOpenMedia?: KodiOpenMedia
  ) {
    const hasCloudAccount = await this.cloudAccountService.hasAtLeastOneAccount();

    const premiumizeSettings = await this.cloudAccountService.getPremiumizeSettings();
    const preferTranscodedFiles = premiumizeSettings ? premiumizeSettings.preferTranscodedFiles : false;

    const realDebridSettings = await this.cloudAccountService.getRealDebridSettings();

    const currentHost = KodiAppService.currentHost;

    let title = '';
    let posterUrl = '';

    if (kodiOpenMedia) {
      title = kodiOpenMedia.movie ? kodiOpenMedia.movie.title : kodiOpenMedia.show.title + ' ' + kodiOpenMedia.episode.code;
      posterUrl = kodiOpenMedia.movie ? kodiOpenMedia.movie.images_url.poster : kodiOpenMedia.show.images_url.poster;
    }

    const buttons = [];

    if (torrent.isCachedSource) {
      buttons.push({
        text: this.translateService.instant('actionSheets.open-source.options.browser'),
        handler: () => {
          this.openBrowser(cachedUrl, cachedTranscodedUrl, title, posterUrl);
        }
      });

      buttons.push({
        text: this.translateService.instant('actionSheets.open-source.options.copy'),
        role: 'copy-url',
        handler: () => {
          this.toastService.simpleMessage('toasts.copyToClipboard', {element: 'Video URL'});
        }
      });
      if (window['plugins'] && window['plugins'].socialsharing) {
        buttons.push({
          text: this.translateService.instant('actionSheets.open-source.options.share'),
          handler: () => {
            this.share(torrent.title, preferTranscodedFiles && cachedTranscodedUrl ? cachedTranscodedUrl : cachedUrl)
          }
        });
      }
      buttons.push({
        text: this.translateService.instant('actionSheets.open-source.options.vlc'),
        handler: () => {
          this.openVlc(preferTranscodedFiles && cachedTranscodedUrl ? cachedTranscodedUrl : cachedUrl);
        }
      });

      if (this.platform.is('ios')) {
        buttons.push({
          text: this.translateService.instant('actionSheets.open-source.options.downloadVlc'),
          handler: () => {
            this.downloadWithVlc(preferTranscodedFiles && cachedTranscodedUrl ? cachedTranscodedUrl : cachedUrl);
          }
        });
      }

      if (currentHost) {
        buttons.unshift({
          text: this.translateService.instant('actionSheets.open-source.options.kodi'),
          handler: () => {
            this.openKodi(preferTranscodedFiles && cachedTranscodedUrl ? cachedTranscodedUrl : cachedUrl, kodiOpenMedia);
          }
        });
      }
    } else {
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
    }

    if (currentHost) {
      buttons.push({
        text: this.translateService.instant('actionSheets.open-source.options.openWithElementum'),
        handler: () => {
          this.openWithElementum(torrent, kodiOpenMedia);
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

    console.log('Found file', filename);

    await action.present();

    const copyEl = document.querySelector('.action-sheet-copy-url');
    if (!copyEl) {
      return;
    }

    copyEl.addEventListener('click', () => {
      this.clipboardService.copyFromContent(cachedUrl);
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
      });
  }

  async openBrowser(videoUrl: string, transcodedUrl?: string, title?: string, posterUrl?: string) {
    const urlSearchParams = new URLSearchParams();
    urlSearchParams.set('title', title);
    urlSearchParams.set('posterUrl', posterUrl);
    urlSearchParams.set('videoUrl', videoUrl);
    urlSearchParams.set('transcodedUrl', transcodedUrl ? transcodedUrl : videoUrl);

    const wakoUrl = `https://wako.app/player?${decodeURIComponent(urlSearchParams.toString())}`;

    if (this.platform.is('ios')) {
      this.browserService.open(wakoUrl, true);
    } else {
      window.open(wakoUrl, '_system', 'location=yes');
    }
  }

  async openVlc(videoUrl: string) {

    if (this.platform.is('ios')) {
      const url = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(videoUrl)}`;
      this.browserService.open(url, false);
    } else {
      const url = `vlc://${videoUrl}`;
      this.browserService.open(url, false);
    }
  }

  async downloadWithVlc(videoUrl: string) {
    console.log('downloadWithVlc', videoUrl);

    if (this.platform.is('ios')) {
      const url = `vlc-x-callback://x-callback-url/download?url=${encodeURIComponent(videoUrl)}`;
      this.browserService.open(url, false);
    }
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
        },
        err => {
          this.toastService.simpleMessage('toasts.open-source.failedToAddToRD', {error: err.toString()});
        }
      );
  }

  async openWithElementum(torrent: Torrent, kodiOpenMedia?: KodiOpenMedia) {
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
        KodiAppService.openUrl(this.getElementumUrlBySourceUrl(torrent.url), openMedia, true).subscribe(
          () => {
            const toastMessage = 'toasts.startOpening';
            const toastParams = {
              title: torrent.title.replace(/\./g, ' '),
              hostName: KodiApiService.host.name
            };

            this.toastService.simpleMessage(toastMessage, toastParams);
          }
        );
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

  share(
    torrentTitle: string,
    cachedUrl: string
  ) {
    window['plugins'].socialsharing
      .shareWithOptions({
        message: torrentTitle, // fi. for email
        subject: torrentTitle, // fi. for email
        url: cachedUrl,
        chooserTitle: torrentTitle
      })

  }
}
