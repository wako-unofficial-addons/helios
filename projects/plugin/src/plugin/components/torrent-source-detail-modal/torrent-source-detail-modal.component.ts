import { Component, Input } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  ModalController,
  IonText,
  IonListHeader,
  IonCol,
  IonRow,
  IonGrid,
} from '@ionic/angular/standalone';
import { TorrentSourceDetail } from '../../entities/torrent-source-detail';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { addIcons } from 'ionicons';
import { openOutline, closeOutline, chevronDown, chevronForward } from 'ionicons/icons';
import { BrowserService } from '@wako-app/mobile-sdk';
import { FileSizePipe } from '../../services/file-size.pipe';

@Component({
  selector: 'wk-torrent-source-detail-modal',
  template: `
    <ng-template #torrentDetail let-torrent>
      <ion-item lines="full">
        <ion-grid class="ion-no-margin ion-no-padding">
          <ion-row>
            <ion-col size="12" class="ion-text-left ion-no-margin ion-no-padding">
              <ion-label class="ion-text-wrap">
                <h3>{{ torrent.title }}</h3>
                <ion-text>{{ torrent.size | bsFileSize }}</ion-text>
                <br />
                <ion-text>Seeds: {{ torrent.seeds }} | Peers: {{ torrent.peers }}</ion-text>
                @if (torrent.excludedReason) {
                  <br />
                  <ion-text color="warning">{{ torrent.excludedReason }}</ion-text>
                }
              </ion-label>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size="12" class="ion-text-right ion-no-margin ion-no-padding">
              <ion-badge class="ion-margin-end"> {{ torrent.quality === 'other' ? 'SD' : torrent.quality }}</ion-badge>
              @if (torrent.excludedReason) {
                <ion-badge slot="end" color="warning">Excluded</ion-badge>
              }
              @if (torrent.size !== null) {
                <ion-badge> {{ torrent.size | bsFileSize }}</ion-badge>
              }
              @if (torrent.size === null) {
                <ion-badge color="light"> ? MB</ion-badge>
              }
              @if (torrent.isPackage) {
                <ion-icon name="cube-outline" class="ion-margin-start"></ion-icon>
              }
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-item>
    </ng-template>

    <ion-header>
      <ion-toolbar>
        <ion-title>{{ sourceDetail?.provider }}</ion-title>
        <ion-button fill="clear" slot="end" (click)="dismiss()">
          <ion-icon slot="icon-only" name="close-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (sourceDetail) {
        <!-- Stats Section -->
        <ion-list>
          <ion-list-header>
            <ion-label>Stats</ion-label>
          </ion-list-header>

          <ion-item>
            <ion-label>
              <ion-text>{{ 'TOTAL_SOURCES' | translate }}: {{ getTotalSources() }}</ion-text>
              <br />
              <ion-text>{{ 'HTTP_REQUESTS' | translate }}: {{ sourceDetail.providerResponses?.length || 0 }}</ion-text>
              <br />
              <ion-text>{{ 'TOTAL_TIME' | translate }}: {{ getTotalTime() }}ms</ion-text>
            </ion-label>
          </ion-item>

          <!-- Filtered Sources -->
          <ion-item button (click)="toggleSection('filtered')" detail="false">
            <ion-label>
              {{ 'FILTERED_SOURCES' | translate }} ({{ sourceDetail.sources.length }})
              <ion-icon [name]="isExpanded('filtered') ? 'chevron-down' : 'chevron-forward'" slot="end"></ion-icon>
            </ion-label>
          </ion-item>
          @if (isExpanded('filtered')) {
            <ion-list>
              @for (source of sourceDetail.sources; track source.hash) {
                <ng-container *ngTemplateOutlet="torrentDetail; context: { $implicit: source }"></ng-container>
              }
            </ion-list>
          }

          <!-- Excluded Sources -->
          <ion-item button (click)="toggleSection('excluded')" detail="false">
            <ion-label>
              {{ 'EXCLUDED_SOURCES' | translate }} ({{ sourceDetail.excludedSources.length }})
              <ion-icon [name]="isExpanded('excluded') ? 'chevron-down' : 'chevron-forward'" slot="end"></ion-icon>
            </ion-label>
          </ion-item>
          @if (isExpanded('excluded')) {
            <ion-list>
              @for (source of sourceDetail.excludedSources; track source.hash) {
                <ng-container *ngTemplateOutlet="torrentDetail; context: { $implicit: source }"></ng-container>
              }
            </ion-list>
          }
        </ion-list>

        <!-- Provider Responses -->
        @for (response of sourceDetail.providerResponses || []; track response) {
          <ion-list>
            <ion-item>
              <ion-label>
                <div class="ion-margin-bottom">
                  <ion-badge [color]="response.error ? 'danger' : response.skippedReason ? 'warning' : 'success'">
                    {{ response.method }}
                  </ion-badge>
                  <ion-text class="ion-margin-start">
                    {{ response.torrents.length }} {{ 'SOURCES' | translate }}
                  </ion-text>
                  <ion-text class="ion-margin-start">{{ response.timeElapsed }}ms</ion-text>
                </div>
              </ion-label>
            </ion-item>

            @if (response.method === 'GET') {
              <ion-item button detail="true" (click)="openInBrowser(response.url)">
                <ion-label class="ion-text-wrap">{{ response.url }}</ion-label>
              </ion-item>
            } @else {
              <ion-item>
                <ion-label class="ion-text-wrap">{{ response.url }}</ion-label>
              </ion-item>
            }

            @if (response.body) {
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <pre>{{ response.body | json }}</pre>
                </ion-label>
              </ion-item>
            }

            @if (response.error) {
              <ion-item>
                <ion-text color="danger">{{ 'ERROR' | translate }}: {{ response.error }}</ion-text>
              </ion-item>
            }

            @if (response.skippedReason) {
              <ion-item>
                <ion-text color="warning">{{ 'SKIPPED_REASON' | translate }}: {{ response.skippedReason }}</ion-text>
              </ion-item>
            }

            <!-- Response Sources -->
            <ion-item button (click)="toggleSection('response-' + response.url)" detail="false">
              <ion-label>
                {{ 'SHOW_SOURCES' | translate }} ({{ response.torrents.length }})
                <ion-icon
                  [name]="isExpanded('response-' + response.url) ? 'chevron-down' : 'chevron-forward'"
                  slot="end"
                ></ion-icon>
              </ion-label>
            </ion-item>
            @if (isExpanded('response-' + response.url)) {
              <ion-list>
                @for (torrent of response.torrents; track torrent.hash) {
                  <ng-container *ngTemplateOutlet="torrentDetail; context: { $implicit: torrent }"></ng-container>
                }
              </ion-list>
            }
          </ion-list>
        }
      }
    </ion-content>
  `,
  imports: [
    CommonModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonText,
    IonListHeader,
    FileSizePipe,
    NgTemplateOutlet,
    IonGrid,
    IonRow,
    IonCol,
  ],
})
export class TorrentSourceDetailModalComponent {
  @Input() sourceDetail: TorrentSourceDetail;
  private expandedSections = new Set<string>();

  constructor(private modalCtrl: ModalController) {
    addIcons({ openOutline, closeOutline, chevronDown, chevronForward });
  }

  toggleSection(sectionId: string) {
    if (this.expandedSections.has(sectionId)) {
      this.expandedSections.delete(sectionId);
    } else {
      this.expandedSections.add(sectionId);
    }
  }

  isExpanded(sectionId: string): boolean {
    return this.expandedSections.has(sectionId);
  }

  getTotalSources(): number {
    return this.sourceDetail?.sources?.length || 0;
  }

  getTotalTime(): number {
    return this.sourceDetail?.providerResponses?.reduce((total, response) => total + response.timeElapsed, 0) || 0;
  }

  openInBrowser(url: string) {
    if (url) {
      BrowserService.open(url);
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
