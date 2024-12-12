import { Injectable } from '@angular/core';
import { from, NEVER, Observable, of, ReplaySubject, throwError } from 'rxjs';
import { Platform } from '@ionic/angular/standalone';
import { catchError, mapTo, switchMap } from 'rxjs/operators';
import { PremiumizeApiService } from './premiumize/services/premiumize-api.service';
import { RealDebridApiService } from './real-debrid/services/real-debrid-api.service';
import { RealDebridOauthTokenDto } from './real-debrid/dtos/oauth/real-debrid-oauth-token.dto';
import { RealDebridOauthTokenForm } from './real-debrid/forms/oauth/real-debrid-oauth-token.form';
import { RealDebridOauthCodeDto } from './real-debrid/dtos/oauth/real-debrid-oauth-code.dto';
import { RealDebridOauthCredentialsForm } from './real-debrid/forms/oauth/real-debrid-oauth-credentials.form';
import { WakoHttpError } from '@wako-app/mobile-sdk';
import { AllDebridApiService } from './all-debrid/services/all-debrid-api.service';
import { SettingsService } from './settings.service';
import {
  AllDebridSettings,
  EasynewsSettings,
  PremiumizeSettings,
  RealDebridSettings,
  TorboxSettings,
} from '../entities/settings';
import { TorboxApiService } from './torbox/services/torbox-api.service';
import { EasynewsApiService } from './easynews/services/easynews-api.service';

export const REAL_DEBRID_CLIENT_ID = 'X245A4XAIBGVM';

@Injectable()
export class DebridAccountService {
  hasAtLeastOneAccount$ = new ReplaySubject<boolean>(1);
  ready$ = new ReplaySubject<boolean>(1);

  private realDebridRefreshTokenInterval;
  private realDebridAuthInterval;

  constructor(
    private settingsService: SettingsService,
    private platform: Platform,
  ) {
    this.hasAtLeastOneAccount();

    if (this.platform.is('cordova')) {
      this.platform.resume.subscribe(() => {
        this.initialize();
      });
    }

    this.settingsService.settings$.subscribe(() => {
      this.hasAtLeastOneAccount();
    });
  }

  async initialize() {
    const settings = await this.settingsService.get();

    const premiumizeSettings = settings.premiumize;
    if (premiumizeSettings && premiumizeSettings.disabled !== true) {
      PremiumizeApiService.setApiKey(premiumizeSettings.apiKey);
    }

    const realDebridSettings = settings.realDebrid;
    if (realDebridSettings && realDebridSettings.disabled !== true) {
      RealDebridApiService.setToken(realDebridSettings.access_token);

      this.realDebridRefreshToken().subscribe();
    }

    RealDebridApiService.handle401 = this.realDebridRefreshToken();

    const allDebridSettings = settings.allDebrid;
    if (allDebridSettings && allDebridSettings.disabled !== true) {
      AllDebridApiService.setApiKey(allDebridSettings.apiKey);
      AllDebridApiService.setName(allDebridSettings.name);
    }

    const torboxSettings = settings.torbox;
    if (torboxSettings && torboxSettings.disabled !== true) {
      TorboxApiService.setApiKey(torboxSettings.apiKey);
    }

    const easynewsSettings = settings.easynews;
    if (easynewsSettings && easynewsSettings.disabled !== true) {
      EasynewsApiService.setCredentials(easynewsSettings.username, easynewsSettings.password);
    }

    this.ready$.next(true);
  }

  async hasAtLeastOneAccount() {
    const settings = await this.settingsService.get();

    const premiumizeSettings = settings.premiumize;
    const realDebridSettings = settings.realDebrid;
    const allDebridSettings = settings.allDebrid;
    const torboxSettings = settings.torbox;
    const easynewsSettings = settings.easynews;

    let has = false;
    if (premiumizeSettings && premiumizeSettings.disabled !== true) {
      has = true;
    } else if (realDebridSettings && realDebridSettings.disabled !== true) {
      has = true;
    } else if (allDebridSettings && allDebridSettings.disabled !== true) {
      has = true;
    } else if (torboxSettings && torboxSettings.disabled !== true) {
      has = true;
    } else if (easynewsSettings && easynewsSettings.disabled !== true) {
      has = true;
    }

    this.hasAtLeastOneAccount$.next(has);

    return has;
  }

  async getPremiumizeSettings(): Promise<PremiumizeSettings> {
    const settings = await this.settingsService.get();
    return settings.premiumize;
  }

  async setPremiumizeSettings(premiummizeSettings: PremiumizeSettings) {
    const settings = await this.settingsService.get();
    settings.premiumize = premiummizeSettings;

    return await this.settingsService.set(settings);
  }

  deletePremiumizeSettings() {
    return this.setPremiumizeSettings(null);
  }

  //
  //
  // REAL DEBRID
  //
  //

  private realDebridRefreshToken(): Observable<RealDebridOauthTokenDto> {
    return from(this.getRealDebridSettings()).pipe(
      switchMap((settings) => {
        if (!settings) {
          return of(null);
        }
        return RealDebridOauthTokenForm.submit(settings.client_id, settings.client_secret, settings.refresh_token).pipe(
          switchMap((token) => {
            console.log('RD token refreshed', token);

            RealDebridApiService.setToken(token.access_token);

            return from(
              this.setRealDebridSettings({
                disabled: settings.disabled,
                client_id: settings.client_id,
                client_secret: settings.client_secret,
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expires_in: token.expires_in,
              }),
            ).pipe(mapTo(token));
          }),
          catchError((err) => {
            if (err instanceof WakoHttpError && err.status === 403) {
              this.deleteRealDebridSettings();
              RealDebridApiService.setToken(null);
            }

            return throwError(err);
          }),
        );
      }),
    );
  }

  private initializeRefreshTokenRealDebridInterval(settings: RealDebridSettings) {
    if (this.realDebridRefreshTokenInterval) {
      clearInterval(this.realDebridRefreshTokenInterval);
    }

    this.realDebridRefreshTokenInterval = setInterval(
      () => {
        this.realDebridRefreshToken().subscribe();
      },
      (settings.expires_in - 700) * 1000,
    );
  }

  async getRealDebridSettings(): Promise<RealDebridSettings> {
    const settings = await this.settingsService.get();
    return settings.realDebrid;
  }

  async setRealDebridSettings(realDebridSettings: RealDebridSettings) {
    const settings = await this.settingsService.get();
    settings.realDebrid = realDebridSettings;

    const d = await this.settingsService.set(settings);

    if (realDebridSettings) {
      this.initializeRefreshTokenRealDebridInterval(realDebridSettings);
    }

    return d;
  }

  deleteRealDebridSettings() {
    return this.setRealDebridSettings(null);
  }

  stopRealDebridAuthInterval() {
    clearInterval(this.realDebridAuthInterval);
  }

  authRealDebrid(clientId: string, data: RealDebridOauthCodeDto) {
    return new Observable((observer) => {
      const endTime = Date.now() + data.expires_in * 1000;

      this.realDebridAuthInterval = setInterval(() => {
        if (Date.now() > endTime) {
          this.stopRealDebridAuthInterval();
          observer.error('Cannot get code');
          return;
        }

        RealDebridOauthCredentialsForm.submit(clientId, data.device_code)
          .pipe(
            catchError((err) => {
              if (err instanceof WakoHttpError && err.status === 403) {
                return NEVER;
              }
              return throwError(err);
            }),
          )
          .subscribe((credentials) => {
            this.stopRealDebridAuthInterval();

            RealDebridOauthTokenForm.submit(
              credentials.client_id,
              credentials.client_secret,
              data.device_code,
            ).subscribe((token) => {
              this.setRealDebridSettings({
                disabled: false,
                client_id: credentials.client_id,
                client_secret: credentials.client_secret,
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expires_in: token.expires_in,
              }).then(() => {
                observer.next(true);
                observer.complete();
              });
            });
          });
      }, data.interval * 1000);
    });
  }

  //
  //
  // ALL DEBRID
  //
  //

  async getAllDebridSettings(): Promise<AllDebridSettings> {
    const settings = await this.settingsService.get();
    return settings.allDebrid;
  }

  async setAllDebridSettings(allDebridSettings: AllDebridSettings) {
    const settings = await this.settingsService.get();
    settings.allDebrid = allDebridSettings;

    return await this.settingsService.set(settings);
  }

  deleteAllDebridSettings() {
    return this.setAllDebridSettings(null);
  }

  //
  //
  // TORBOX
  //
  //

  async getTorboxSettings(): Promise<TorboxSettings> {
    const settings = await this.settingsService.get();
    return settings.torbox;
  }

  async setTorboxSettings(torboxSettings: TorboxSettings) {
    const settings = await this.settingsService.get();
    settings.torbox = torboxSettings;
    return await this.settingsService.set(settings);
  }

  deleteTorboxSettings() {
    return this.setTorboxSettings(null);
  }

  //
  //
  // EASYNEWS
  //
  //

  async getEasynewsSettings(): Promise<EasynewsSettings> {
    const settings = await this.settingsService.get();
    return settings.easynews;
  }

  async setEasynewsSettings(easynewsSettings: EasynewsSettings) {
    const settings = await this.settingsService.get();
    settings.easynews = easynewsSettings;
    return await this.settingsService.set(settings);
  }

  deleteEasynewsSettings() {
    return this.setEasynewsSettings(null);
  }
}
