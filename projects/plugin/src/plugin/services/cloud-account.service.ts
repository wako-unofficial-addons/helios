import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { from, NEVER, Observable, of, ReplaySubject, throwError } from 'rxjs';
import { Platform } from '@ionic/angular';
import { catchError, mapTo, switchMap } from 'rxjs/operators';
import { PremiumizeApiService } from './premiumize/services/premiumize-api.service';
import { RealDebridApiService } from './real-debrid/services/real-debrid-api.service';
import { RealDebridOauthTokenDto } from './real-debrid/dtos/oauth/real-debrid-oauth-token.dto';
import { RealDebridOauthTokenForm } from './real-debrid/forms/oauth/real-debrid-oauth-token.form';
import { RealDebridOauthCodeDto } from './real-debrid/dtos/oauth/real-debrid-oauth-code.dto';
import { RealDebridOauthCredentialsForm } from './real-debrid/forms/oauth/real-debrid-oauth-credentials.form';
import { WakoHttpError } from '@wako-app/mobile-sdk';

export const REAL_DEBRID_CLIENT_ID = 'X245A4XAIBGVM';

@Injectable()
export class CloudAccountService {
  hasAtLeastOneAccount$ = new ReplaySubject<boolean>(1);

  private realDebridInterval;

  constructor(private storage: Storage, private platform: Platform) {
    this.hasAtLeastOneAccount();

    if (this.platform.is('cordova')) {
      this.platform.resume.subscribe(() => {
        this.initialize();
      });
    }
  }

  async initialize() {
    const premiumizeSettings = await this.getPremiumizeSettings();
    if (premiumizeSettings) {
      PremiumizeApiService.setApiKey(premiumizeSettings.apiKey);
    }

    const realDebridSettings = await this.getRealDebridSettings();
    if (realDebridSettings) {
      RealDebridApiService.setToken(realDebridSettings.access_token);

      this.realDebridRefreshToken().subscribe();
    }

    RealDebridApiService.handle401 = this.realDebridRefreshToken();
  }

  async hasAtLeastOneAccount() {
    const premiumizeSettings = await this.getPremiumizeSettings();
    const realDebridSettings = await this.getRealDebridSettings();

    const has = !!premiumizeSettings || !!realDebridSettings;

    this.hasAtLeastOneAccount$.next(has);
    return has;
  }

  getPremiumizeSettings(): Promise<PremiumizeSettings> {
    return this.storage.get('premiummize_settings');
  }

  setPremiumizeSettings(settings: PremiumizeSettings) {
    return this.storage.set('premiummize_settings', settings).then(d => {
      this.hasAtLeastOneAccount();
      return d;
    });
  }

  deletePremiumizeSettings() {
    return this.storage.remove('premiummize_settings').then(d => {
      this.hasAtLeastOneAccount();
      return d;
    });
  }

  //
  //
  // REAL DEBRID
  //
  //

  private realDebridRefreshToken(): Observable<RealDebridOauthTokenDto> {
    return from(this.getRealDebridSettings()).pipe(
      switchMap(settings => {
        if (!settings) {
          return of(null);
        }
        return RealDebridOauthTokenForm.submit(settings.client_id, settings.client_secret, settings.refresh_token).pipe(
          switchMap(token => {
            console.log('RD token refreshed', token);

            RealDebridApiService.setToken(token.access_token);

            return from(
              this.setRealDebridSettings({
                client_id: settings.client_id,
                client_secret: settings.client_secret,
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expires_in: token.expires_in
              })
            ).pipe(mapTo(token));
          }),
          catchError(err => {
            this.deleteRealDebridSettings();
            RealDebridApiService.setToken(null);

            return throwError(err);
          })
        );
      })
    );
  }

  private initializeRefreshTokenRealDebridInterval(settings: RealDebridSettings) {
    if (this.realDebridInterval) {
      clearInterval(this.realDebridInterval);
    }

    this.realDebridInterval = setInterval(() => {
      this.realDebridRefreshToken().subscribe();
    }, (settings.expires_in - 700) * 1000);
  }

  getRealDebridSettings(): Promise<RealDebridSettings> {
    return this.storage.get('real_debrid_settings');
  }

  setRealDebridSettings(settings: RealDebridSettings) {
    return this.storage.set('real_debrid_settings', settings).then(d => {
      this.hasAtLeastOneAccount();

      this.initializeRefreshTokenRealDebridInterval(settings);

      return d;
    });
  }

  deleteRealDebridSettings() {
    return this.storage.remove('real_debrid_settings').then(d => {
      this.hasAtLeastOneAccount();
      return d;
    });
  }

  authRealDebrid(clientId: string, data: RealDebridOauthCodeDto) {
    return new Observable(observer => {
      const endTime = Date.now() + data.expires_in * 1000;

      const timer = setInterval(() => {
        if (Date.now() > endTime) {
          clearInterval(timer);
          observer.error('Cannot get code');
          return;
        }

        RealDebridOauthCredentialsForm.submit(clientId, data.device_code)
          .pipe(
            catchError(err => {
              if (err instanceof WakoHttpError && err.status === 403) {
                return NEVER;
              }
              return throwError(err);
            })
          )
          .subscribe(credentials => {
            clearInterval(timer);

            RealDebridOauthTokenForm.submit(
              credentials.client_id,
              credentials.client_secret,
              data.device_code
            ).subscribe(token => {
              this.setRealDebridSettings({
                client_id: credentials.client_id,
                client_secret: credentials.client_secret,
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expires_in: token.expires_in
              }).then(() => {
                observer.next(true);
                observer.complete();
              });
            });
          });
      }, data.interval * 1000);
    });
  }
}

export interface PremiumizeSettings {
  apiKey: string;
  preferTranscodedFiles: boolean;
}

export interface RealDebridSettings {
  client_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  client_secret: string;
}
