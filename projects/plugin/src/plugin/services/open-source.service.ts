import { Injectable } from '@angular/core';
import { ActionSheetController, LoadingController, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { DebridAccountService } from './debrid-account.service';
import {
  BrowserService,
  ChromecastService,
  KodiApiService,
  KodiAppService,
  KodiGetAddonDetailsForm,
  KodiSeekToCommand,
  OpenMedia,
  PlaylistVideo,
  WakoHttpError
} from '@wako-app/mobile-sdk';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { EMPTY, from, NEVER, Observable, of } from 'rxjs';
import { KodiOpenMedia } from '../entities/kodi-open-media';
import { PremiumizeTransferCreateForm } from './premiumize/forms/transfer/premiumize-transfer-create.form';
import { RealDebridCacheUrlCommand } from './real-debrid/commands/real-debrid-cache-url.command';
import { TorrentGetUrlQuery } from '../queries/torrents/torrent-get-url.query';
import { TorrentSource } from '../entities/torrent-source';
import {
  addToKodiPlaylist,
  episodeFoundInStreamLinks,
  getElementumUrlBySourceUrl,
  getOpenMediaFromKodiOpenMedia,
  incrementEpisodeCode
} from './tools';
import { SettingsService } from './settings.service';
import { StreamLinkSource } from '../entities/stream-link-source';
import { CachedTorrentSourceService } from './sources/cached-torrent-source.service';
import { SourceQuery } from '../entities/source-query';
import { SourceService } from './sources/source.service';
import { HeliosPlaylistService } from './helios-playlist.service';
import { SourceQueryFromKodiOpenMediaQuery } from '../queries/source-query-from-kodi-open-media.query';
import { PlayButtonAction, Settings } from '../entities/settings';
import { AllDebridMagnetUploadForm } from './all-debrid/forms/magnet/all-debrid-magnet-upload.form';
import { ToastService } from './toast.service';
import { ClipboardService } from 'ngx-clipboard';
import { PlaylistVideoHeliosCustomData } from '../entities/playlist-video-custom-data';

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

  private async getStreamLinksWithLoader(streamLinkSource: StreamLinkSource, sourceQuery: SourceQuery) {
    const loader = await this.loadingController.create({
      message: 'Please wait...',
      spinner: 'crescent'
    });

    try {
      return await this.cachedTorrentService.getStreamLinks(streamLinkSource, sourceQuery).toPromise();
    } catch (err) {
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
      throw err;
    } finally {
      loader.dismiss();
    }
  }

  private async selectStreamLink(streamLinkSource: StreamLinkSource, actions: PlayButtonAction[], kodiOpenMedia?: KodiOpenMedia) {
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
          }
        });
      }
      if (realDebridSettings) {
        buttons.push({
          cssClass: 'rd',
          text: this.translateService.instant('actionSheets.open-source.options.add-to-rd'),
          handler: () => {
            this.open(torrent, 'add-to-rd', kodiOpenMedia);
          }
        });
      }
      if (allDebridSettings) {
        buttons.push({
          cssClass: 'ad',
          text: this.translateService.instant('actionSheets.open-source.options.add-to-ad'),
          handler: () => {
            this.open(torrent, 'add-to-ad', kodiOpenMedia);
          }
        });
      }
    }

    if (settings.availablePlayButtonActions.includes('share-url') && window['plugins'] && window['plugins'].socialsharing) {
      buttons.push({
        icon: 'share',
        text: this.translateService.instant('actionSheets.open-source.options.share-url'),
        handler: () => {
          this.open(torrent, 'share-url', kodiOpenMedia);
        }
      });
    }

    if (currentHost) {
      buttons.push({
        cssClass: 'kodi',
        text: this.translateService.instant('actionSheets.open-source.options.open-elementum'),
        handler: () => {
          this.open(torrent, 'open-elementum', kodiOpenMedia);
        }
      });
    }

    if (settings.availablePlayButtonActions.includes('add-to-playlist')) {
      buttons.push({
        icon: 'list',
        text: this.translateService.instant('actionSheets.open-source.options.add-to-playlist'),
        handler: () => {
          this.open(torrent, 'add-to-playlist', kodiOpenMedia);
        }
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
      buttons: buttons
    });

    this.setImages();

    await action.present();
  }

  private async _openStreamLinkSource(streamLinkSource: StreamLinkSource, actions: PlayButtonAction[], kodiOpenMedia?: KodiOpenMedia) {
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
        text: this.translateService.instant('actionSheets.open-source.options.' + action)
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

    const actionSheet = await this.actionSheetController.create({
      header: this.translateService.instant('actionSheets.open-source.openTitle'),
      buttons: buttons
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
        imgUrl:
          // tslint:disable-next-line:max-line-length
          'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiCiAgIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICBoZWlnaHQ9IjI0MCIKICAgd2lkdGg9IjI0MCIKICAgdmlld0JveD0iMCAwIDI0MC4wMDAwMiAyMzkuOTk5OTkiCiAgIGlkPSJzdmcyIgogICB2ZXJzaW9uPSIxLjEiCiAgIGlua3NjYXBlOnZlcnNpb249IjAuOTIuMyAoMjQwNTU0NiwgMjAxOC0wMy0xMSkiCiAgIHNvZGlwb2RpOmRvY25hbWU9Imljb24uc3ZnIgogICBpbmtzY2FwZTpleHBvcnQtZmlsZW5hbWU9Ii9ob21lL2VldmkvcmVwb3MvcHJlbWl1bWl6ZS9odG1sL2ljb24tMzJ4MzIucG5nIgogICBpbmtzY2FwZTpleHBvcnQteGRwaT0iMTIuOCIKICAgaW5rc2NhcGU6ZXhwb3J0LXlkcGk9IjEyLjgiPgogIDxkZWZzCiAgICAgaWQ9ImRlZnM4IiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMSIKICAgICBvYmplY3R0b2xlcmFuY2U9IjEwIgogICAgIGdyaWR0b2xlcmFuY2U9IjEwIgogICAgIGd1aWRldG9sZXJhbmNlPSIxMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMCIKICAgICBpbmtzY2FwZTpwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTg1MyIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMDI1IgogICAgIGlkPSJuYW1lZHZpZXc2IgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSIyLjgyODQyNzEiCiAgICAgaW5rc2NhcGU6Y3g9Ijg1LjIzOTM2NCIKICAgICBpbmtzY2FwZTpjeT0iMTI4LjAzMjY2IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI2NyIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMjciCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJsYXllcjEiCiAgICAgdW5pdHM9InB4IgogICAgIGZpdC1tYXJnaW4tdG9wPSIwIgogICAgIGZpdC1tYXJnaW4tcmlnaHQ9IjAiCiAgICAgZml0LW1hcmdpbi1sZWZ0PSIwIgogICAgIGZpdC1tYXJnaW4tYm90dG9tPSIwIgogICAgIGlua3NjYXBlOnNuYXAtYmJveD0idHJ1ZSIKICAgICBpbmtzY2FwZTpvYmplY3QtcGF0aHM9InRydWUiCiAgICAgaW5rc2NhcGU6c25hcC1pbnRlcnNlY3Rpb24tcGF0aHM9InRydWUiCiAgICAgaW5rc2NhcGU6b2JqZWN0LW5vZGVzPSJ0cnVlIgogICAgIGlua3NjYXBlOnNuYXAtc21vb3RoLW5vZGVzPSJ0cnVlIgogICAgIGlua3NjYXBlOnNuYXAtbWlkcG9pbnRzPSJ0cnVlIiAvPgogIDxtZXRhZGF0YQogICAgIGlkPSJtZXRhZGF0YTQiPgogICAgPHJkZjpSREY+CiAgICAgIDxjYzpXb3JrCiAgICAgICAgIHJkZjphYm91dD0iIj4KICAgICAgICA8ZGM6Zm9ybWF0PmltYWdlL3N2Zyt4bWw8L2RjOmZvcm1hdD4KICAgICAgICA8ZGM6dHlwZQogICAgICAgICAgIHJkZjpyZXNvdXJjZT0iaHR0cDovL3B1cmwub3JnL2RjL2RjbWl0eXBlL1N0aWxsSW1hZ2UiIC8+CiAgICAgICAgPGRjOnRpdGxlPjwvZGM6dGl0bGU+CiAgICAgIDwvY2M6V29yaz4KICAgIDwvcmRmOlJERj4KICA8L21ldGFkYXRhPgogIDxnCiAgICAgaW5rc2NhcGU6Z3JvdXBtb2RlPSJsYXllciIKICAgICBpZD0ibGF5ZXIxIgogICAgIGlua3NjYXBlOmxhYmVsPSJ2b3JsYWdlIgogICAgIHN0eWxlPSJkaXNwbGF5OmlubGluZSIKICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNSw0Ny42Mzc4KSI+CiAgICA8Y2lyY2xlCiAgICAgICBzdHlsZT0iZmlsbDojYWEwMDAwO2ZpbGwtb3BhY2l0eToxIgogICAgICAgaWQ9InBhdGgzMjIzIgogICAgICAgY3g9IjEyNCIKICAgICAgIGN5PSItMC4xMzc4MDM4MSIKICAgICAgIHI9IjQ3LjUwMDAwNCIgLz4KICAgIDxwYXRoCiAgICAgICBzdHlsZT0iZmlsbDojYWEwMDAwO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTpub25lIgogICAgICAgZD0iTSAxMjUsNjQuODMwOTU1IEEgNjUuMDAwMDA0LDYyLjUzMTU3MSAwIDAgMCA2MCwxMjcuMzYyMiB2IDY1IGggMTMwIHYgLTY1IEEgNjUuMDAwMDA0LDYyLjUzMTU3MSAwIDAgMCAxMjUsNjQuODMwOTU1IFoiCiAgICAgICBpZD0icmVjdDM0OTciCiAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgPHBhdGgKICAgICAgIHN0eWxlPSJmaWxsOiNmZmNjMDA7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMDM0Nzk4NXB4O3N0cm9rZS1saW5lY2FwOmJ1dHQ7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1vcGFjaXR5OjEiCiAgICAgICBkPSJNIDMzLjUsODguNDc0MjQ0IDExOC4xNTgyNCwxMjMuNTg5NDYgMjQ1LC0yLjYzNzggYyAtMzMuMjI2NTksNTcuNzg1NDQ2IC03NC40NjQxMywxMTEuOTk2NDggLTEyMCwxODAgeiIKICAgICAgIGlkPSJwYXRoMzM3NCIKICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9ImNjY2NjIgogICAgICAgaW5rc2NhcGU6dHJhbnNmb3JtLWNlbnRlci14PSItODMuODU3MjAxIgogICAgICAgaW5rc2NhcGU6dHJhbnNmb3JtLWNlbnRlci15PSIyOC45OTEzOCIgLz4KICA8L2c+Cjwvc3ZnPgo='
      },
      {
        class: '.vlc',
        imgUrl:
          // tslint:disable-next-line:max-line-length
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAACXBIWXMAAAsTAAALEwEAmpwYAAAgAElEQVR4nO3deZSkdX3v8c/veap6n61n61mYnRlgWGRRlFVFISS4Gz03i1dFHBD1nmhuTIImnHM9xnNzQ85BYRZQE6P35pKE64JLXE5UNCIiKMoyMDDMMMz0LN09W29V9Tzf+0cVMgyzdFdX1e9Z3q9z5nQzS/eHruep3/f5Pr/6lgQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwKQ53wEAtIZt1AxF6lOobkXqllNX9Q80olDDijSsUP1unQ54jgqgBSgAgAwxk9MGLZTTBTKdL6dzJS2XtETStAl+mUOStkvaKtNDMj2gSA+4D2lns3IDaD0KACDl7Ivq1rBeI6erJV2t6oLfDE9J+racvqVO/cC9S8NN+j4AWoACAEghu1mB5uvVCvRumd4m1dr5rTMi6W4F+kfN1H+4dyhq8fcHMEUUAECK2G3qUaj3y+nDMi31nafmWUm3qqRN7sM66DsMgImhAABSwL6gmRrXn0j6kKRZvvMcx3453aZQt7j3adB3GAAnRgEAJJjdpVADep+cPilpju88EzQk6a/ltMGtU9l3GADHRgEAJJTdrlcq1EaZzvadpU6PS1rnrtePfAcB8FIUAEDC2F1q05D+Sqa/kBT4zjNFJtMt6tDH3Xs05jsMgBdQAAAJYrdplUL9i6SX+c7SYI8q0tvdjXrMdxAAVWm/ugAywzbpdQp1v7K3+EvSGQr1M1uva3wHAVBFAQAkgG3UjYr1bSV3h38jTJPT12yDPmZG9xHwjQIA8Mw26OMyfVZS6DtLCzhJn9YmfZoiAPCLExDwxExOm/Q/ZLrJdxZPblO/PuxuVuw7CJBHdAAAXzbqEzle/CXpRs3X39MJAPzgxAM8sA16j6TP+86REB911+sW3yGAvKEAAFrMNuj1kr4pqeA7S2KY3ulu0F2+YwB5QgEAtJBt1BKZfqls7/avx7CcLnDr9LjvIEBesAcAaBG7WQWZ/rdY/I+lW6a77BZ1+g4C5AUFANAqC3SzpIt9x0iws9TFXgCgVbgFALSAbdLLFOsB5eO1/lN1OW8gBDQfHQCgyewuhYq1QSz+E7XRblW77xBA1lEAAM02qOskXeg7Roqcpnb9me8QQNZxCwBoIrtNPQr0tJzm+s6SMofVphXuvdrrOwiQVXQAgGYK9SEW/7r0qEQXAGgmOgBAk9hGzZBpq3jZX73GVNZK9yHt9B0EyCI6AECzxFonFv+p6FBBH/IdAsgqOgBAE9hdCjWoJyUt950l5QbUrsXuPRrzHQTIGjoAQDMM6iqx+DfCbJX0Tt8hgCyiAACa43rfATLDdIPvCEAWcQsAaDC7XbMUaLekou8smVHRMvdBbfMdA8gSOgBAowV6g1j8GyvUW31HALKGAgBovLf7DpA5Tr/vOwKQNdwCABrIvqhujWhAYpZ9w7VpHpMBgcahAwA00pguE4t/c4zrCt8RgCyhAAAaKdZVviNkltOVviMAWUIBADQSi1QzXWnGbUugUSgAgAax23SKTKf7zpFhi7SRny/QKBQAQKOEXP03HR0WoGEoAIDGYXFqtpifMdAo3E8DGqD25j97JPX6zpJxoypplvuwxn0HAdKODgDQCAM6Xyz+rdCpoi72HQLIAgoAoBG4N906/KyBhqAAABqDRal1+FkDDcAeAGCK7FZNV5sGJBV8Z8kNxgIDU0YHAJiqNr1GLP6tVdLrfEcA0o4CAJg6WtKtx88cmCIKAGDqmP/fasZYYGCqKACAKbCNWilppe8cueO0UHfoDN8xgDSjAACmwvR63xFyK+I2ADAVFADA1ND+94V5AMCUcA8NqJNtVFGmfZKm+86SU6NqV697j8Z8BwHSiA4AUL8LxeLvU6fGGQsM1IsCAKgX70znH7cBgLpRAAD1YvHxj02YQN3YAwDUwe5UryraK4po/0zz3Q3a4zsGkDY8eQH1iHSFOH+SIWAsMFAPnsCAenD/Pzl4LIC6UAAAk2QmJ8fr/xPDMRYYqAcFADBZm7RG0im+Y+C3FmiD1voOAaQNBQAwebSck4ZXZACTRgEATJbR/k8gCgBgkrhvBkyC3ap2tWlQUpfvLHiRMbVrFmOBgYmjAwBMRrsuEot/EnWorEt8hwDShAIAmAza/8nFywGBSaEAACaHRSa5GAsMTAJ7AIAJsvWaJ6fdvnPgBEL1uet4jICJoAMATBxXmElXYSwwMFEUAMBE8Vrz5OMxAiaMAgCYgNqoWRaX5GMsMDBBFADARKzXWZL6fMfASfVpk870HQJIg4LvAEAaxL/77Uvdzu/d6/Y9aDrwRKfG9s5TNL5InEO+VRS2P6eOuXs0Y/WozTnP2cLXXSb9zq99BwOSjlYZMAGVSuU7OnoTYFyO3MEtz7l9D+7Rnp+NuMFfyvZvmeZKg/MUVxaK86tRTEFhp7X17nEzVx2y3pdJ8y7ssjnnzbPpqxYpKIZH/f3vFAoF5jUAJ8ETFHASZtYZRdGgpI4J/6NorKRDz+xxh54ZsgNPDAcHt5Tc4a1mB7cXNbany1UOTVdlfI5k05uXPA3cQRXa96k4/YA6542q55Sy9axwmnFqm01f1W3Tls3StGXzFHa0TeKLjoVhOMs5x1hg4AQoAICTKJfLr3fOfacpX7wyMqbD2/cGh7YO6eCTIzq8o6yxvbEbH5DGhwIbGyq4yuGiKsPtisY6FZe7ZVGPzKY1JU+9nDskFx5WUBxW2DGqQve4FXrKrmNWRe2zYmufLXXMDdSzuKjpq7vjactmqmfJXBW6Jl5UTYKZvb5YLH6vGV8byAruXwIn17zd/4WuDs087ZR45mmnSFdP/N9ZZCofPKzRwcOuvH/ERaNlReORVcZiZ6XIymOxxeOxorE4iEuxovFY0bgpGrPqx9rnkhR2OIXttV+//TyIg7ZAYUfggvbAFTsCc22hK3QECttDCzuLVpzZpc7ZPSpOnyYXTJOUpKLkSkkUAMAJ0AEATiKKol+a2Tm+c2DinHO/DMPwXN85gCSjAABOwMz6oija5TsHJi8Mwz7nHGOBgeNgDgBwAlEUMVo2pXjsgBOjAABOjPn/6cVjB5wAtwCA4zAzF0XRTjEBMK12hWG4yDlnvoMASUQHADiOUql0plj802xBqVRa6zsEkFQUAMBxFAoFWsgpx2MIHB8FAHAcZsa7/6UcjyFwfOwBAI7BzDqiKBrSZMb/IolGwzDsZSww8FJ0AIBjqFQqF4vFPws6K5XKRb5DAElEAQAcG63j7OCxBI6BAgA4hiAIWDQygscSODb2AABHMbN5URQxQjZDwjCc55zb6zsHkCR0AICjMEI2e3hMgZeiAABeipZx9vCYAkfhFgBwhNr43x2SFvrOgoZ6LgzDUxgLDLyADgBwhFKpdIZY/LNokaTTfYcAkoQCADhCoVCgVZxRcRzz2AJHoAAAjmBmzI7PKB5b4MXYAwDUmFl7bfxvp+8saIqR2ljgcd9BgCSgAwDU1Mb/svhnVxdjgYEXUAAAL6BFnH08xkANBQBQw8jY7OMxBl7AHgBAkpnNjaJoj+8caDqrjQXe5zsI4BsdAEBSFEVX+M6AlnA81kAVBQBQRWs4P3isAXELAHh+/O+zqk6LQ/btCMNwCWOBkXd0AADpNLH458liSWt8hwB8owBA7jEiNn94zAEKAEBmxmKQMzzmAHsAkHO18b+Dkrp8Z0FLDdfGApd8BwF8oQOAXKtUKq8Si38eddceeyC3KACQd7SC84vHHrlGAYBcc84xGz6neOyRd+wBQG6Z2Zza+F/Og3yyMAznOucGfAcBfKADgNyqjYRl8c8vxgIj1ygAkGe0gMExgNzi6ge5VBv/u03SKb6zwKvtYRguYyww8ogOAPJqjVj8IS2RtNp3CMAHCgDkUhzHtH4hiWMB+UUBgFxiFCyex7GAvGIPAHLHzNpq43+7fWdBIhyujQUu+w4CtBIdAOROpVJ5pVj88YKe2jEB5AoFAPKIli+OxjGB3KEAQO4453iyx4twTCCP2AOAXDGz3iiK9oljHy8W18YCD/oOArQKHQDkCuN/cRxBFEWv9R0CaCUKAOQNrV4cD8cGcoUCALlhZk7MfsfxXVk7RoBcoABAnpwqaanvEEispZJW+Q4BtAoFAHIjjmNavDghjhHkCQUAcsPMaP/jhDhGkCfc70IumFmxNv63x3cWJNqhMAxnMxYYeUAHALlQG/XK4o+TmVapVC70HQJoBQoA5AWtXUwUxwpygQIAucCoV0wUxwrygj0AyDwzm1Ub/0vBi4mIwzCc45wb8h0EaCaeEJF5tRGvHOuYqCCKotf4DgE0G0+KyANaupgsjhlkHgUAMq022pUnc0wWxwwyjwIAWbdS0jLfIZA6y81spe8QQDNRACDTGO2KenHsIOsoAJBpZsaTOOrCsYOs42WAyKza+N99kqb7zoJUOlgbC1zxHQRoBjoAyKxKpfIKsfijftNrxxCQSRQAyDJauJgqjiFkFgUAMss5x0x3TAnHELKMPQDIJDObGUXRgChyMTVRbSzwft9BgEbjyRGZxPhfNEjIWGBkFU+QyCpat2gUjiVkEgUAsorNW2gUjiVkEgUAMqc2wnWF7xzIjJVmxvGEzKEAQObEcUzLFg3FMYUsogBA5jDCFY3GMYUs4mWAyBQzK9Re/scEQDTSgdrLARkLjMygA4BMqVQqLxeLPxpvRrlcvsB3CKCRKACQKUEQ0KpFU4RhyLGFTKEAQKZwrxbNwrGFrGEPADLDzGbU7v+HvrMgk6IwDHudcwd9BwEagQ4AMiP6xacucQee2Ok7BzJq/+O7ogf+5hLfMYBGKfgOADRK+MBNb9IDN52ioP0Zm//K7Tr9/d3x0jedqbCj3Xc2pFBldNw985VHgs13Htae+5YqGl8q6fckfdN3NKARuAWATDCT0yZtlWnpUX80al0LH9GKd4zaqe9abLPPWs5hj2MzuYFfb3VPfnGHnr6r043sXCup80V/xWmLW6dT/eQDGotnQmSCbdJqxdp80r/ogiF1L95iC187aive3msLXr1aYUdbCyIiaaKxktv1gyfc0/864HZ+v0uHd6ySbNZJ/12sle4DeroFCYGmogBAJth6fVBOn6njn5bUNnOzzbtwKF76hg4tePVCzVi9WI7tMZlisXTgiR3a9YOd4fZ7RrX7vtkq7V8tafLFn+l6d4M2Nj4k0FoUAMgE26CvSXpDQ76Yc8NWmLHV9Z4xZH2XOlt4Ra/6Xrncwq7Ok/9j+OaikVH137fV7fz+oOu/12zw0VmucmC5zLob9C3udtfrbQ36WoA3FABIPbtLbRrUgKSeZn4bhe3brXPBbs1cM6a5FwSa94rp1ntOn3Uvmsep1GomN/zcHjf4q37tuf+g9j4Qa//mDje6a76i8SVq7gNyQP2a424WY4GRajxrIfVsgy6T9EN/CdyICl3PqnvhkGaePm5zzito1tqueNqqWW7myvl0DurjopFR2//U7uDQliENPTLi9j1YscFH293orl5VRhZL1uUx3kXuev3U4/cHpoyXASL9nK6U+QxgXaoMr9GBJ6UDT8pt+5qkI6YRObdfYcdetc06oJ5Fo9azPNaM00LNWtNl3ad0W8f86a6nb4aFXV3Zr8lNLhoZscP9B9zY7oNu+NlhDW0e0YHHI3d4a6DDz3WqNDRTlbG5ks2QtKz2S1KCfjqmqyQKAKRbYs4noF62XvfL6eW+czTAuFw4ZGHbIVfsOay2mePWPqeszr5YXXNdXJgeBJ2zA7XNLKh9VsHaZrSrOLPN2qZ1qji9Q23TulTo7mraBkaLpcrwiEqHRlQ+OOZKh0ZV3l9ypQPjGh+qqLS/Eo8OxEHlYKyRvabR/sCN7yuqtL/dyod7XFSaJotmScrCXIafuut1ke8QwFRQACDV7LOarYL2imP5SGVJFclFcqrIXCT3/OdBpCCI5Vwkuaj61y2UWag4DuTiUKaCzEI5q34uC1XtFhY9/j8lTax2zXbv0X7fQYB6cQsA6RbqCrH4H61Y/WWq3hqpfTRJiqToBP/SjvM5jhZoXK+VdLfvIEC9eLEz0s2Jd2iDHxx7SDkKAKSWmZzEkzA8MV1VOwaBVKIAQHpt0hpJp/iOgdxaptu10ncIoF4UAEgzrv7hV8gxiPSiAEB6VV+LDfhEAYDU4v4VUsluVbvaNCjJ5zQ44JCcZrt1KvsOAkwWHQCkU7suEos//JumSK/0HQKoBwUA0imm9YqECDgWkU4UAEgnXoON5OBYRCqxBwCpY5/XXJW0x3cOoMZU0Bz3Pg36DgJMBh0ApE9Jr/MdATiCU6QrfIcAJosCAGlEyxXJwp4UpBAFAFLFTE7Gky0SxulKxgIjbSgAkC536Aw5LfQdAzjKEq3Xat8hgMmgAEC6RFz9I6F4OSBShgIA6cLL/5BcHJtIFe5ZITXsC+rQuAYldfrOAhzDsHrV696hku8gwETQAUB6jOtisfgjubo1oIt8hwAmigIA6UH7H0nHMYoUoQBAevDyPyQdBQBShD0ASAW7Q/MVqd93DuAkTG2a796rvb6DACdDBwDpUGH8L1LBaZyxwEgHCgCkA61VpAXHKlKCAgCJVxuxypMq0oKxwEgFCgAk3yadKanPdwxgghZpo073HQI4GQoApAFX/0gXbgMgBSgAkHymq3xHACaFtwdGCnCfColmt6hTXRqS1O47CzAJo2pXr3uPxnwHAY6HDgCSrVuXisUf6dNZG10NJBYFAJKNVirSin0ASDgKACQbT6JIK0ZXI+HYA4DEso1aINNO3zmAuoXqc9dpt+8YwLHQAUBymV7vOwIwJYywRoJRACDJaKEi3biFhQSjAEAi2c0KJDoASD3GAiOxKACQTAt1tqR5vmMAU9RXG2UNJA4FAJIponWKzOBYRiJRACCZuHeKrGCUNRKKe1NIHNuoLpmGJLX5zgI0wLhGNMt9RKO+gwBHogOA5DFdJhZ/ZEd7baQ1kCgUAEge2v/IGkZaI4EoAJA8jFBF1lDUIoHYA4BEsfVaJKcdvnMADee00K3TLt8xgOfRAUDSMPwH2cRoayQMBQCShVYpsotjG4nCLQAkht2sQH3aLWmO7yxAE+xRvxa4mxX7DgJIdACQJAv0MrH4I7vm1UZcA4lAAYDkYGIasi7mGEdyUAAgSbhHiqzjGEdisAcAiWC3qUehBiUVfWcBmqikLvW6d2nYdxCADgCSoaDLxeKP7GvTmC7zHQKQKACQFIxKRV5wrCMhKACQDLz+H/nBsY5EYA8AvLONWiLTNt85gJYJdYq7jpHX8IsOAPxjRCryJuKYh38UAEgCWqLIF255IQG4BQCv7C6FGtQeSb2+swAtNKB+zWMsMHyiAwC/9us8sfgjf2Zrns71HQL5RgEAvyJaocipkLHA8IsCAH5xLxR5xTwAeMYeAHhjn9M0lTUoqeA7C+BBWUXNdtfqkO8gyCc6APCnrFeLxR/5VVRJl/sOgfyiAIA/tP+Rd5wD8IgCAP4YT37IPc4BeMMeAHhh67VMTlt95wC8q2iZ+yCjsNF6dADgC6NQAUkqci7ADwoA+MG9T6CKW2HwhFsAaLna+N99kmb6zgIkwJB6Nde9Q5HvIMgXOgBoufJVWy+w2ef/xncOIBHmXvBI+aqnz/cdA/lDAYCWC3uWXBm/5WeX2KV3/Fwu2Oc7D+CFC/ZFl935QPSm+y4Je5ZyGwAtxy0AtFylUrlX0iWSpJH+weDf3/ioG3jwYnE8Ih/MZp/3k/iqr52hrr7n3wjr3kKhcJnXVMgdnnDRUmY2PYqiAR01AdDt/ukTwXfeMqrxfed4igY0nbXP+ZVd+f86bf6rVh/1R5UwDHudc4wFRstQAKClKpXKGyV99dh/ago2/8PP3c8+2q3SwTNaGgxoprbpj9qFfzccr3n3y0/wtPvGQqHw9VbGQr5RAKClKpXKZyXdeOK/ZXJbv/or95MPxG5sD++ZjtSyjnkP2cW3B7b8TedM4On2s4VC4UOtyAVIFABosXK5vNk5d3T787hc/483u59+ZK8bePB8SZ1NjAY0yojmnP+L+FV/P8/mX7Rmov/IzDYXi8XTmhkMOBIFAFrGzJZFUVTf+N/S0KHgwU8+5B7buEjR2MoGRwOmrtC5xU5ftzM+9+Pnqm3mtHq+RBiGy5xzjAVGS1AAoGUqlcp1kjZN7auY3M4fPuZ++am9btcP18ii+Q0JB9TDhf1a+JrN8bk3zbO+S05vwFPqdYVC4c5GRANOhgIALVOpVO6S9PsN+4IWmdv+jV+7X376oNv7wOlSPLthXxs4rmDA5l7wmM67aVq8+Oqz5YJGPo/eVSgU3tnArwccFwUAWsLMwiiK9kqa1ZxvEFmw64ePukc+u0/PfXeBKqMT3mcAnFSh8wktev2u+IwPzrWFrz5Drmkz1AbDMJznnGMsMJqOAgAtUSqVXh4Ewf0t+4YHntoVbL5ji3v2noL2P7mCWwWYFBf2a+apW+2UayrxmutWacbKBa361nEcv7ytre2BVn0/5BcFAFoiiqKbzOyTfr67yR3YssNt/ZdtbttXTIOPnKJofKmfLEiksH2bzVz7bLzsTYFb8Y4lNmPVYl9Pj865m8Iw/JSXb45coQBAS1QqlR9KSs6o0+Gd+/TM3U+Fz9w9rr2/mK/K8GpxPuSFqdD9hOaev9uWv70tXvrmVepeOMd3qCP8sFAovNp3CGQfT3hoOjObVhv/W/Sd5bhKQ4eCHd9+Qju+f9jt+3nRDj4911VGlynJmTERZSt0PuOmr9hrc15esYVX9NiS3zlVbbPqeplei5RrY4EP+w6CbKMAQNNVKpVrJKVvxGlcjjT4623B7h/vdv0/Kmnfg50a7l+ouLTYdzQcQ9C2Q919OzXnvFHru6w9nn/pPPWeuVRBMfQdrQ7XFAqFb/gOgWyjAEDTVSqVWyVlZ8Rp+eCI2/uLZ9yuHwy6/h/HOvhkt8YHZ6ky1iepy3e8bHMjCtt3qaN3v6afOmx9lwRa+Jpem3vBMiv0ZOZnb2a3FovF/+Y7B7KNAgBNVy6XH3PO5WDEqUmjA/uDQ0/u1uBvDmjwN2Pu4OPSwa3tNrpnhiuPzGVWwckEAyp271Hn3IOavnzcpp+muPfMjqD3zBnxtFPnq3P2zDw8bZnZY8VikTfEQlNl/0yCV2a2JIoiRps+rzIypgNb+t2Bxwbd4CMjGt4eubE90ti+UKODRSsf7HTRaKei0jRZNEPpf/+DUbnwgMK2QxZ2jrri9FF19pbVMSeyjnlS95LQetd22YzTezVjVZ8KXR2+AydFGIZLnHPP+s6B7KIAQFNVKpVrJTHatF6V0XE3PnBAY3sPuZH+YY3sGouHd5SD0f7Ije0xlQ85lUecyiOBopFA0VhB0XhBUamguNwmxYHMAqn2yxS++PckycVyLpaCWE6R5OIX/V5QLClsqyhsryjsqCjsilXsilXsMhWnmXXMc3FnXxh0Ly6qa0GHdfV1q2PuNGufPUOFzna/P8BUu7ZQKHzedwhkFwUAmqpSqfyzJEabApP3z4VC4b/4DoHsogBA05hZEEXRHknc9wYmb18YhvOdc7HvIMimpg20Bsrl8rli8QfqNadcLr/MdwhkFwUAmiYMwyt9ZwDSjHMIzUQBgKYxM568gCngHEIzsQcATWFm3VEUDYlRusBUlGpjgYd9B0H20AFAU0RRdLlY/IGpaouiKDlvooVMoQBAU9C6BBqDcwnNQgGAZnm97wBAFgRBwLmEpmAPABrOzBZHUcQIU6BBwjBc7Jx7zncOZAsdADRcFEWv850ByBLOKTQDBQCagXuWQGNxTqHhuAWAhqqN/90taY7vLECG7A3DsI+xwGgkOgBoqHK5fI5Y/IFGm1sul8/2HQLZQgGAhmJ0KdAcnFtoNAoANBSvWQaag3MLjcYeADSMmXXVxv+2+c4CZNB4bSzwiO8gyAY6AGiYSqVymVj8gWZpr1Qql/oOgeygAEAjMbEMaC5uA6BhKADQMEEQ8OQENBFjgdFI7AFAQ5jZwiiKGFUKNFkYhgudc7t850D60QFAQzCqFGgNzjU0CgUAGoX2P9AanGtoCG4BYMpq4393SZrnOwuQA7vDMFzgnDPfQZBudAAwZeVy+Syx+AOtMr9UKp3lOwTSjwIAU8aIUqC1CoUC5xymjAIAU8aIUqC1OOfQCOwBwJSYWWdt/G+77yxAjozVxgKP+g6C9KIDgCmpjSZl8Qdaq6NSqVziOwTSjQIAU8VkMsAPzj1MCQUApoTxv4AfnHuYKvYAoG5m1ld7/T8AD8Iw7HPO7fadA+lEBwB1YyQp4BfnIKaCAgBTQQsS8ItzEHXjFgDqYmYuiqKdkvp8ZwFybFcYhosYC4x60AFAXUql0pli8Qd8W1Aqldb6DoF0ogBAXRhFCiQD5yLqRQGAupgZr0EGEoBzEfViDwAmzcw6auN/O3xnAaDR2ljgMd9BkC50ADBptRGkLP5AMnRWKpWLfYdA+lAAoB60HIFk4ZzEpFEAYNIYQQokC+ck6sEeAEyKmc2Poqjfdw4ALxaG4Xzn3B7fOZAedAAwKVEUXeE7A4CX4tzEZBV8B8CJ2UZ1qaKFKmqWTO2+80SHt/2Repb6jgHgaIef+WPbqGd9x5DTuMoaUkE73TqN+I6D46MASCDbqPMk/ZGkK2Raq1ChYt+pJMlJQZvvEACOxbVdLXNXS56nApukUJIpso16RNL3JX3JrdODfoPhaOwBSBC7XZfK6dNyush3lmOxmWcofvvDvmMAOI7w386Whh71HePYTP8p05+7D+he31FQxR6ABLAvqts26E4F+lFSF39J0ilsNAaSzBYl+NWAThcp0I9sg+60L6rbdxxQAHhnn9FCjehnkq71neVkbBFvPQ4kWUrO0Ws1op/ZZ7TQd5C8owDwyNZrkSIgufUAABDlSURBVIq6V1Ly380rbJf1Xe47BYATsAWXS6H3vcITsVZF3Wvrtch3kDyjAPDEblW7nO6WtMJ3lomw+RdJhU7fMQCcSKFLNu9VvlNM1Ao53W23+n91U15RAPjSpk9JeoXvGBOVktYikHspO1dfUXsuhAcUAB7YJq2V9GHfOSZlMRsAgVRI37n6YdugM3yHyCMKAB9i/Y3SNIOhY65s9rm+UwCYAJtzrtQxx3eMySjI6W98h8gjCoAWqw35eYPvHJNhi17rOwKACXOyhSk7Z01vtPXiKqPFKABazXSz7wiTlejXFgN4iVSes0H6nhvTjgKghdJ49S/VXgEAIDVSec7SBWg5CoDW+mvfASatbYY0Y7XvFAAmY+YaqW267xST51L4HJliFAAtYut1rkxv9J1jsox3/gNSKaXn7ptsk17mO0ReUAC0Slor2875vhMAqEdaz904pc+VKUQB0AK1+1pv8p2jLtGY7wQA6lEZ9Z2gXnQBWoQCoBWc/sp3hLqNDfhOAKAObjy1565TnOLnzBShAGiyWiWbzqt/Sa406DsCgHqM7fOdYCrebBt0ju8QWUcB0GzV+1nOd4y6jQ1IMt8pAEyGRdL4kO8UU+GUxldNpQwFQBPVKtjUXv1LkuKy3MCvfKcAMAlu4KFqEZBub7bbdbbvEFlGAdBc6b76f96uH/lOAGAydt3rO0EjOAV0AZqJAqBJalf/b/adoxFcfyaeTIDccP0/9h2hUd5CF6B5KACa56+Uhat/Sa7/R1Jc9h0DwETEZbndmSkAnEJeEdAsFABNUKtY3+I7R8OMDcht/TffKQBMgNv6r9l6+a7prbZRZ/mOkUUUAM0QZOTe/xHco7f7jgBgAtwjmTtXeUVAk1AANFitUs3O1X+N2/1TucGHfccAcAJu8Fdye+7zHaPx6AI0BQVA42Xu6r/K5O7/S98hAJyAu/8mZXRuh5OxF6DRKAAayDbqLJne6jtHs7gd35bb9jXfMQAcg9v2Vbkd3/Ydo5neZut1pu8QWUIB0EiWnZ3/xxPc9xHeIAhImsqogvs+6jtFs7lUv69KAlEANEitMn2b7xxNd+gZBfd/zHcKAEcI7v+YdOgZ3zFa4e22SWt9h8gKCoBGcVm99/9S7pHb5Z78ou8YACS5zV+Qe3S97xit4mrvr4IGyMWC1Wy2XmfK6WHl6ecZdih+ww9lc873nQTILbf3fgX3vDZvt+VMgc5y79cjvoOkHR2ARnDZv/f/EtGYgu++VTqwxXcSIJ/2b1bw3bflbfGXql0A9gI0QL4WrSawTVqrWL9WXn+WXQsV/e53pZlrfCcB8mPoUYXfulIa6fedxJdYgc6mCzA1dACmKs7h1f+RRnYq/OYV0tCjvpMAueCGfqPwm6/L8+IvSYFifcJ3iLTL78LVALWr/4dFISV1zFb8mi/LFr3OdxIgs9yO7yj4jz+Uxod8R0mCWNJZ7npx9VEnFq6pqF798zOUpLEBBf9+jdzD/8t3EiCT3K/+p4J/fwOL/wsCib0AU0EHoE62QWdI+rUoAF7CVr5T8SUbpWKP7yhA+pUPK7j3/XJP3+U7SRLFinSmu1GP+Q6SRixe9ePq/zjcU/9X4d3nyO38vu8oQKq5575XPZdY/I8nUIEuQL3oANSBq/+JcrLTrlV84d9KxWm+wwDpUT6k4L4/ldv8eWX0zX0aiS5AnVjA6uH0CfGzmwCTe/xOhf96ltyWL/sOA6SCe/KfqufM5s+JxX9CAoW8IqAedAAmyW7T6Qr1G1EATJrNuUD2qltk8y/yHQVIHNd/r9x9fyq37xe+o6RRLKe1bp0e9x0kTVjEJqvAvf96uX0PKPj65Qq+/w65od/4jgMkght8WMH33q7gntey+NcvqL0bKyaBDsAkcPXfQC6QLfk92bk3yeZc4DsN0HJu78/lHvqk3PZvilZ/Q9AFmCQWsskIufffMBbLbfu6gq+8SsG3rpbb/g3JYt+pgOayWG77NxR862oFX72oetyz+DcK0wEniQ7ABNlGnSbTI6IAaJ7uRbJT36V49Xuk6St8pwEa5+DTCp74QvVttIef850my2LFOsN9QJt9B0kDCoAJsvX6spz+wHeOXHCBrO8y2WnXypa9VQrbfScCJi8al3vmbrnHPyfX/yM6XK3zZXe9/sh3iDSgAJgAu11rFOhRcfXfeu29slV/IFtzraz3LN9pgJNygw/Lbf6c3Jb/I40P+o6TR5FiraULcHIUABPA1X8SONmstdLSN1Q3D867UBy+SAaT2/Mzue33SNvukRt6RNzX944uwATwDHoSXP0nVOc82eLfkS25Rrb4St53AK1VPiS34zty2++Re/bb0the34nwYpECneHeryd8B0kyCoCTsA36kqQ/9J0DJxC0yfoulS29RrbkGmnact+JkEUHn64u+Nvvkev/sRSXfCfCiX3JXa8/9h0iySgATqB29f+IpNB3FkyUk2asks2/WDb/ourUwZmn+Q6FNBp6TG7Pf8rt/k+53T+RDjwlWvupQhfgJCgATsA26J8k7iOlXscc2bxXVouBvourg4d4ZQGOFI3L7XtA6v+J3O6fyO25Txob8J0KU+X0T26d3uU7RlJRAByHbdJqxXpUXP1nT9gum31utRiYfa40+2zZjDWS46HOBYvkDmyWBh6WG3iouugPPCRF476TofEiSae76/Wk7yBJVPAdILGqE6VYEbIoGq9e4e2574UKOGyXzTxd6j27+nLD2efIes+WOub4TIqpGtsrN/hwdbF//uOBx1ns8yOsvXsrXYBjoANwDLZBp0p6TBQAOeekrvmyWWdJvWfJpq+s7i+YtkLqWSo5XhiSCBZLh7fJHXxKOvhU9ePgr6sL/uhu3+ngH12A46ADcCxOn5Cx+MOkkX65kX7pue++uFoO2qRpS2XTVkozVlY/Tl9ZLRJ6lkiFLl+hs6kyIh3eXlvkt8gdelo6UPt4aBs78nEioaSPS/qvvoMkDR2Ao3D1j6lzUvtMWddCqXux1L1I6l5c/e+exVLXIln3Iqm913fQZBgflBt+Thp5Tjq8Q27kueq8/OEd0vBz1T8rHRA78DEFkSKd5m7UFt9BkoQOwEt9XCz+mBKTxofkxoekoUd++7svqbaDotQxW9Y+u7rXoGNu7eMcWUft99pnV4ccFXtkhZ7ffp64DkNlRCoflsqH5SqHf/u5xgeksX1yY9WPGttb+7hPbnygutM+LvtOj+wLFejjkt7tO0iS0AE4gt2mVQr1uCgAkHQulIrdUnFarTh44fPffix0S0GhWmi4gsyF1f92hRd+X6ouwHFFsooUV+Qsqn1e+/3KcG1BP/Tbj+5FvzcsWeT35wGcHF2Ao9ABOFLIzn+khEVS6WD1lyZWyVPtI+foAhyF54Qarv4BIPMiOa1x6/SU7yBJwOuYnhdw7x8AMi6U6eO+QyQFHQBx9Q8AOVKR02l0AegAVIW6SSz+AJAHBZlu8h0iCXLfAbCNWinT42JDJADkRUWx1rgP6GnfQXyiA1C9H8TiDwD5Uajt+8q1XHcA7HatUKDNogAAgLzJfRcg3x2AgKt/AMipQm3/V27ltgPA1T8A5F5FoVa767TVdxAf8tsBqFZ+LP4AkF8FRfntAuSyA2B3aLkiPSEKAADIu7JCrcljFyCfHYCYe/8AAElSMa9dgNx1ALj6BwAcpSzTaneDnvEdpJXy1wGIuPcPAHiRopS/LkCuOgC1q//Nqj7YAAA8L3ddgHx1ACr6S7H4AwBeqiinv/QdopVy0wGw9VompydEAQAAOLayKjrVfVDbfAdphTx1AG4Siz8A4PiKKuRnL0AuOgD2WS1VQU+KAgAAcGK56QLkowNQ4OofADAhRRXysRcg8x0Arv4BAJNUltMqt07bfQdppux3AArs/AcATEpRyn4XINMdANuoJTJtEQUAAGBySnI6NctdgGx3AIx7/wCAurQp412AzHYAuPoHAExRSZFWuRv1rO8gzZDlDgD3/gEAU9GmMLtdgEx2AGpX/0+q2sIBAKBeme0CZLMDYPoLsfgDAKauTYH+wneIZshcB8Bu0ykKtUUUAACAxigp1Ep3nXb4DtJI2esAVO/XsPgDABqlrfZuspmSqQ4AV/8AgCbJXBcgWx2AgHv/AICmaFOUrb0AmekA2B1arEhPiQIAANAc4wq1KitdgOx0ACKu/gEATdWuSH/uO0SjZKIDULv63yKp3XcWAECmjcu00t2g53wHmapsdACqV/8s/gCAZmuXy8ZegNR3AGy9FsnpKVEAAABaIxNdgPR3ABxX/wCAlmpXkP69AKnuAHD1DwDwZFxlrXAf0k7fQeqV7g5AtQJj8QcAtFq7iunuAqS2A2Cf0UIV9bQoAAAAfoyprJVp7QKktwPQxr1/AIBXHWnuAqSyA8DVPwAgIcbktMKt0y7fQSYrnR2AIvf+AQCJ0KE4nV2A1HUAalf/T0nq8J0FAACltAuQvg5AQR8Tiz8AIDk6ZPqY7xCTlaoOgG3UApmeFgUAACBZUtcFSFcHoHqfhcUfAJA0qesCpKYDwNU/ACDhxhRpubtR/b6DTER6OgDGvX8AQKJ1KExPFyAVHQCu/gEAKTGqSCvS0AVIRwfA9Gdi8QcAJF+nCvoz3yEmIvEdALtNfQr1tKRO31kAAJiAUYVa7q7Tbt9BTiT5HYDq/RQWfwBAWnQqTv5egER3ALj6BwCkVOK7AMnuAFTvo7D4AwDSplNRsvcCJLYDYHdoviJtFQUAACCdRhRqRVK7AMntAERc/QMAUq1LFf133yGOJ5EdgNrV/9OSunxnAQBgCkZkWu5u0B7fQY6WzA5A9eqfxR8AkHZdUjL3AiSuA2DrNU9OW0UBAADIhkR2AZLYAeDqHwCQJV1yydsLkKgOAFf/AICMGlGblrn3aq/vIM9LVgegWiGx+AMAsqZLpWR1ARLTAbDPa65KekYUAACAbBpWm5YnpQuQnA5AiXv/AIBM605SFyARHQDbqDkyPSOp23cWAACaaFgVLXUf1IDvIEnpALxfLP4AgOzrVqhrfYeQklIAmK7zHQEAgJZwep/vCFICCgDbpLWSlvnOAQBAi5xqt2mV7xDeCwDFutR3BAAAWirU5b4j+C8AnFb7jgAAQIud5juA/wIg1nzfEQAAaCnTQt8R/BcATkXfEQAAaCmngu8I/gsA6bDvAAAAtNiI7wD+CwDTDt8RAABoKdNO3xH8FwDSQ74DAADQUoF+6T+Cb+36saTYdwwAAFrEVNG9vkN4LwBq74p0t+8cAAC0hNPX3Y3q9x3DewEgSTL9re8IAAC0hNMtviNICXk3QEmyDbpX0iW+cwAA0DROv3DrdIHvGFJSOgCSZPqopHHfMQAAaJKKYv2p7xDPS0wB4G7Q/TJd7zsHAABNYfoTd4N+4DvG8xJTAEiSu0H/INOtvnMAANBQpjvdDfqs7xhHSlQBIEmarY/I9HeSzHcUAAAa4DbN1o2+QxwtMZsAj2brdY2c/lFSr+8sAADUYUhO73Xr9BXfQY4leR2AGneD7lGkl0m6Q9Kw7zwAAEzQYUl3KNI5SV38pQR3AI5kt2q62vWHMr1b0rkS7yAIAEiUsqSH5PQPKuhL7lod8h3oZFJRABzJblW72rVaTr0y9ShO3/8DACADApmcDss0qHE94T7MS9kBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJn3/wENIyOH2nGbpAAAAABJRU5ErkJggg=='
      },
      {
        class: '.rd',
        imgUrl:
          // tslint:disable-next-line:max-line-length
          'data:image/png;base64,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'
      },
      {
        class: '.ad',
        imgUrl:
          // tslint:disable-next-line:max-line-length
          'data:image/png;base64,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'
      },
      {
        class: '.kodi',
        imgUrl:
          // tslint:disable-next-line:max-line-length
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAjVBMVEUAAAAAq+ESsucLtegStOkSs+cSs+gSsucPs+YSsucaseYSsucSsucSsucSsucSsucSsugRsucRs+gSs+gSsucRs+cRsugSs+cSsugRsucRsucSsucSs+YSs+gSsucRsuYSsucSsucSsucRs+YSsOcRsecSsucTwPkTvvYTvPQTwfsStu0Uyv8UxP0StOlZeJdIAAAAJnRSTlMAA/oGDfbq0BDKCZ2Wh9e3mJJ4+8R324txvaKNF92wo30w8VpUS8VpbZAAAAGgSURBVEjH7dXrcoIwEAXgXUIqYL1Vqtiq1V4IxMv7P16zO2Gpg1PC7/b80DEz35wZc0T4A0HEocK/hEdBvF87M0RkI2vfnBkiKh0ZMuGijsoyMi+BBr0INCziUeUEG+tMCNkYzYDNPKQmeb+WbU7bABM/nMq2Zd0nsCUszKJnOygtInq2gxBvAYm0At0tbWcTMZ2O3QEUk7ZDQbIydtw1LDA/F56weARkUbvtsOmKtK6fPWHBp8mOt9Pp4Y95pY0Q7iCxarZDpisi8+SJ7xDhe26iNiYql55cNQl0Q5iy8Ia+vxbA51mXQkozJ6Hgw522uSZkJLg3WsiFO1xU/mOh5nArAGYmiphk5ZhOKIBpFTViApLWaCb4JSthoxuBdwzdC587mGxmGUjP0ouuOdO98H3EU2NGioxyPdLRNSkTUE64lVSNuYjoGkzAC16JN9m46Pm9oBdieh61Iji6Sp0h9XsyeSZRT44Bz6Sj1R6wOQL2m4WVlqWdkOjPo5GVrEP/jeZsWOAAQ+KVRaix2osB5mJZDDFFQW/DMhwohP/cyzeG2TfQgvExAwAAAABJRU5ErkJggg=='
      },
      {
        class: '.nplayer',
        imgUrl:
          // tslint:disable-next-line:max-line-length
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA4BpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTM4IDc5LjE1OTgyNCwgMjAxNi8wOS8xNC0wMTowOTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo3NUE3NUQxRTA4MjA2ODExQkVEQ0VDMTJCMTdFMDUyRiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo0NUQwNTUyMjcyNUQxMUU3OUQ3Q0E1OTI1RkNGMzNENCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo0NUQwNTUyMTcyNUQxMUU3OUQ3Q0E1OTI1RkNGMzNENCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNyAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0OWIyODRhMC02NWRmLTU1NGEtOTAwZS00OWZmNjYwNDUyOGIiIHN0UmVmOmRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDo4NmM4ZTdhNi00ZmVhLTExZTctOGVlYS1jMjdh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\n'
      },
      {
        class: '.infuse',
        imgUrl:
          // tslint:disable-next-line:max-line-length
          'data:image/png;base64,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'
      },
      {
        class: '.cast',
        imgUrl:
          // tslint:disable-next-line:max-line-length
          'data:image/png;base64,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'
      }
    ];

    data.forEach((d) => {
      const node = document.querySelector(d.class + ' .action-sheet-button-inner');
      if (node) {
        node.innerHTML = `<img style="width: 24px; height: 24px;  margin-inline-end: 32px;" src="${d.imgUrl}"> ` + node.innerHTML;

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
            this.toastService.simpleMessage('toasts.kodi.hostUnreachable', { hostName: KodiAppService.currentHost.name }, 2000);
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
              firstVideoUrl += `|movieTraktId=${openMedia.movieTraktId}&showTraktId=${openMedia.showTraktId}&seasonNumber=${openMedia.seasonNumber}&episodeNumber=${openMedia.episodeNumber}`;
            }
          }

          return from(this.settingsService.get()).pipe(
            switchMap((_settings) => {
              settings = _settings;
              return KodiAppService.openUrl(firstVideoUrl, openMedia, settings.openRemoteAfterClickOnPlay);
            })
          );
        }),
        tap(() => {
          // Take only 5 episodes
          const newVideoUrls = videoUrls.slice(0, 5);

          totalNextUpVideo = newVideoUrls.length;

          const toastMessage = 'toasts.startOpening';
          const toastParams = {
            title: !kodiOpenMedia ? '' : (kodiOpenMedia.movie ? kodiOpenMedia.movie.title : kodiOpenMedia.show.title).replace(/\./g, ' '),
            hostName: KodiApiService.host.name
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
      .subscribe(() => {
        if (seekTo) {
          const sub = KodiApiService.wsMessage$.subscribe((data) => {
            if (data.method === 'Player.OnAVStart') {
              sub.unsubscribe();

              setTimeout(() => {
                KodiSeekToCommand.handle(1, seekTo).subscribe();
              }, 3000);
            }
          });
        }
      });
  }

  private async openBrowser(videoUrl: string, transcodedUrl?: string, title?: string, posterUrl?: string) {
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
      BrowserService.open(url, true);
    } else {
      window.open(url, '_system', 'location=yes');
    }
  }

  private async openVlc(videoUrl: string) {
    if (this.platform.is('ios')) {
      const url = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(videoUrl)}`;
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

  private async cast(videoUrl: string, kodiOpenMedia?: KodiOpenMedia, seekTo?: number, openMedia?: OpenMedia, fallBacVideoUrl?: string) {
    const title = !kodiOpenMedia
      ? ''
      : (kodiOpenMedia.movie ? kodiOpenMedia.movie.title : kodiOpenMedia.show.title + ' - ' + kodiOpenMedia.episode.code).replace(
          /\./g,
          ' '
        );

    const poster = !kodiOpenMedia ? null : kodiOpenMedia.movie ? kodiOpenMedia.movie.imagesUrl.poster : kodiOpenMedia.show.imagesUrl.poster;

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
      const url = `vlc-x-callback://x-callback-url/download?url=${encodeURIComponent(videoUrl)}`;
      BrowserService.open(url, false);
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
      message: 'Please wait...',
      spinner: 'crescent'
    });

    loader.present();

    AllDebridMagnetUploadForm.submit([url])
      .pipe(finalize(() => loader.dismiss()))
      .subscribe((data) => {
        if (data.status === 'success') {
          this.toastService.simpleMessage('toasts.open-source.addedToAD');
        } else {
          this.toastService.simpleMessage('toasts.open-source.failedToAddToAD', { error: '' });
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
    let _obs = of(null);
    if (kodiOpenMedia) {
      _obs = SourceQueryFromKodiOpenMediaQuery.getData(kodiOpenMedia);
    }
    _obs.subscribe((sourceQuery) => {
      this.openKodi(
        [getElementumUrlBySourceUrl(torrent.url, sourceQuery)],
        kodiOpenMedia,
        null,
        'plugin.video.elementum',
        this.getElementumCheckObservable()
      );
    });
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
    if (window['plugins'] && window['plugins'].socialsharing) {
      window['plugins'].socialsharing.shareWithOptions({
        url: cachedUrl,
        chooserTitle: torrentTitle
      });
    }
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
            title: title
          }
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
        hash: null,
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
        videoMetaData: source.videoMetaData
      } as TorrentSource;
    }
    return source;
  }

  private getCustomDataFromSource(source: StreamLinkSource | TorrentSource, sourceQuery: SourceQuery) {
    return {
      sourceQuery: sourceQuery,
      torrentSource: this.getTorrentSourceFromSource(source),
      type: source.type
    } as PlaylistVideoHeliosCustomData;
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
    let obs = of(null);
    if (kodiOpenMedia) {
      obs = SourceQueryFromKodiOpenMediaQuery.getData(kodiOpenMedia);
    }

    return obs.pipe(
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
                customData: this.getCustomDataFromSource(source, sourceQuery)
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
                        videosUrls = this.getElementumNextEpisodeUrlFromPackage(childSource as TorrentSource, _sourceQuery);
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

                      kodiOpenMediaCopy.episode.traktNumber++;

                      playlist.items.push({
                        label: _sourceQuery.episode.episodeCode,
                        url: this.getStreamUrlFromSource(childSource, _sourceQuery, getTranscoded),
                        currentSeconds: 0,
                        pluginId: 'plugin.helios',
                        openMedia: kodiOpenMedia ? getOpenMediaFromKodiOpenMedia(kodiOpenMediaCopy) : null,
                        customData: this.getCustomDataFromSource(childSource, _sourceQuery)
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
                  customData: this.getCustomDataFromSource(source, sourceQuery)
                });
              } else if (source instanceof StreamLinkSource) {
                source.streamLinks.forEach((link) => {
                  playlist.items.push({
                    label: link.title,
                    url: this.getStreamUrlFromSource(source, sourceQuery, getTranscoded),
                    currentSeconds: 0,
                    pluginId: 'plugin.helios',
                    openMedia: kodiOpenMedia ? getOpenMediaFromKodiOpenMedia(kodiOpenMedia) : null,
                    customData: this.getCustomDataFromSource(source, sourceQuery)
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
                    items: playlist.items.length
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
      const preferTranscodedFilesChromecast = premiumizeSettings ? premiumizeSettings.preferTranscodedFilesChromecast : false;

      let getTranscoded = preferTranscodedFiles;

      let title = '';
      let posterUrl = '';

      if (kodiOpenMedia) {
        title = kodiOpenMedia.movie ? kodiOpenMedia.movie.title : kodiOpenMedia.show.title + ' ' + kodiOpenMedia.episode.code;
        posterUrl = kodiOpenMedia.movie ? kodiOpenMedia.movie.imagesUrl.poster : kodiOpenMedia.show.imagesUrl.poster;
      }

      let playVideo = false;

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
          if (streamLink.servicePlayerUrl) {
            // They have their own player
            this.openBrowserUrl(streamLink.servicePlayerUrl);
          } else {
            this.openBrowser(streamLink.url, streamLink.transcodedUrl, title, posterUrl);
          }
          playVideo = true;
          break;

        case 'share-url':
          this.share(preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url, streamLink.filename);
          break;

        case 'open-with':
          this.openWith(preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url, streamLink.filename);
          playVideo = true;
          break;

        case 'download-vlc':
          this.downloadWithVlc(preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url);
          playVideo = true;
          break;

        case 'open-vlc':
          this.openVlc(preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url);
          playVideo = true;
          break;

        case 'open-nplayer':
          this.openNplayer(preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url);
          playVideo = true;
          break;

        case 'open-kodi':
          const videoUrls = [];
          streamLinkSource.streamLinks.forEach((_streamLink) => {
            videoUrls.push(preferTranscodedFiles && _streamLink.transcodedUrl ? _streamLink.transcodedUrl : _streamLink.url);
          });
          this.openKodi(videoUrls, kodiOpenMedia);
          playVideo = true;
          break;

        case 'add-to-playlist':
          this.handleWakoPlaylist(source, kodiOpenMedia, false, getTranscoded).subscribe();
          break;

        case 'open-infuse':
          this.openInfuse(preferTranscodedFiles && streamLink.transcodedUrl ? streamLink.transcodedUrl : streamLink.url);
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
              kodiOpenMedia.show.traktId
            );
          } else if (kodiOpenMedia.movie) {
            this.sourceService.setLastMoviePlayedSource(streamLinkSource.id, streamLinkSource.title, streamLinkSource.provider);
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
  private async resetPlaylistVideoUrls(playlistVideo: PlaylistVideo) {
    const customData: PlaylistVideoHeliosCustomData = playlistVideo.customData;
    if (customData.sourceQuery && customData.torrentSource) {
      if (customData.type === 'torrent') {
        const url = this.getStreamUrlFromSource(customData.torrentSource, customData.sourceQuery);
        if (url) {
          playlistVideo.url = url;
        }
      } else {
        const sources = await this.cachedTorrentService.getFromTorrents([customData.torrentSource], customData.sourceQuery).toPromise();
        const source = sources.pop();
        const streamLinks = await this.getStreamLinksWithLoader(source, customData.sourceQuery);
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
        if (!playlist) {
          return;
        }

        for (const item of playlist.items) {
          await this.resetPlaylistVideoUrls(item);
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
        titleLang: playlistVideo.customData.titleLang
      };
    }

    if (playlistVideo.url.match('elementum')) {
      return this.openKodi(
        [playlistVideo.url],
        null,
        seek,
        'plugin.video.elementum',
        this.getElementumCheckObservable(),
        playlistVideo.openMedia
      );
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
        text: this.translateService.instant('actionSheets.open-source.options.' + action)
      } as any;

      switch (action) {
        case 'open-browser':
          buttonOptions.icon = 'browsers';
          buttonOptions.handler = () => {
            this.openBrowser(playlistVideo.url, null, playlistVideo.label);
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
              playlistVideo.url += `|movieTraktId=${openMedia.movieTraktId}&showTraktId=${openMedia.showTraktId}&seasonNumber=${openMedia.seasonNumber}&episodeNumber=${openMedia.episodeNumber}`;
            }

            KodiAppService.checkAndConnectToCurrentHost()
              .pipe(
                catchError((err) => {
                  if (err === 'hostUnreachable') {
                    this.toastService.simpleMessage('toasts.kodi.hostUnreachable', { hostName: KodiAppService.currentHost.name }, 2000);
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
      buttons: buttons
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
