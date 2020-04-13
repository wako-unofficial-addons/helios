import { Component, NgZone, OnInit } from '@angular/core';
import { PremiumizeAccountInfoForm } from '../../services/premiumize/forms/account/premiumize-account-info.form';
import { finalize } from 'rxjs/operators';
import { RealDebridOauthCodeForm } from '../../services/real-debrid/forms/oauth/real-debrid-oauth-code.form';
import { DebridAccountService, REAL_DEBRID_CLIENT_ID } from '../../services/debrid-account.service';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BrowserService } from '@wako-app/mobile-sdk';
import { ProviderService } from '../../services/provider.service';
import { PremiumizeApiService } from '../../services/premiumize/services/premiumize-api.service';
import { RealDebridApiService } from '../../services/real-debrid/services/real-debrid-api.service';
import { AllDebridUserForm } from '../../services/all-debrid/forms/user/all-debrid-user.form';
import { AllDebridApiService } from '../../services/all-debrid/services/all-debrid-api.service';
import { ToastService } from '../../services/toast.service';
import { ClipboardService } from 'ngx-clipboard';

@Component({
  selector: 'wk-debrid-account',
  templateUrl: './debrid-account.component.html',
  styleUrls: ['./debrid-account.component.scss']
})
export class DebridAccountComponent implements OnInit {
  isLoadingPremiumize = false;
  isLoadingAllDebrid = false;

  preferTranscoded = false;
  preferTranscodedFilesChromecast = false;

  isPremiumizeEnabled = true;
  isRealDebridEnabled = true;
  isAllDebridEnabled = true;

  isPremiumizeLogged = false;
  isRealDebridLogged = false;
  isAllDebridLogged = false;

  constructor(
    private debridAccountService: DebridAccountService,
    private alertController: AlertController,
    private translateService: TranslateService,
    private toastService: ToastService,
    private providerService: ProviderService,
    private clipboardService: ClipboardService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.debridAccountService.getPremiumizeSettings().then((settings) => {
      this.isPremiumizeLogged = !!settings;
      this.preferTranscoded = settings ? settings.preferTranscodedFiles : false;
      this.preferTranscodedFilesChromecast = settings ? settings.preferTranscodedFilesChromecast : false;
      this.isPremiumizeEnabled = settings ? settings.disabled !== true : false;
      PremiumizeApiService.setApiKey(settings ? settings.apiKey : null);
    });

    this.debridAccountService.getRealDebridSettings().then((settings) => {
      this.isRealDebridLogged = !!settings;
      this.isRealDebridEnabled = settings ? settings.disabled !== true : false;
      RealDebridApiService.setToken(settings ? settings.access_token : null);
    });

    this.debridAccountService.getAllDebridSettings().then((settings) => {
      this.isAllDebridLogged = !!settings;
      this.isAllDebridEnabled = settings ? settings.disabled !== true : false;
      AllDebridApiService.setApiKey(settings ? settings.apiKey : null);
      AllDebridApiService.setName(settings ? settings.name : null);
    });
  }

  logoutPremiumize() {
    this.debridAccountService.deletePremiumizeSettings().then(() => {
      this.ngOnInit();
    });
  }

  loginPremiumize() {
    this.alertController
      .create({
        header: 'Enter your API-Key / PIN',
        inputs: [
          {
            name: 'apikey',
            type: 'text',
            placeholder: 'API-Key / PIN',
            value: ''
          }
        ],
        buttons: [
          {
            text: this.translateService.instant('alerts.cancelButton'),
            role: 'cancel',
            cssClass: 'secondary'
          },
          {
            text: 'Ok',
            handler: (data) => {
              this.isLoadingPremiumize = true;
              PremiumizeAccountInfoForm.submit(data.apikey)
                .pipe(finalize(() => (this.isLoadingPremiumize = false)))
                .subscribe((res) => {
                  if (res.status === 'error') {
                    this.toastService.simpleMessage('toasts.premiumize.invalidApiKey');
                    return;
                  }
                  this.providerService.getAll(false).then((providers) => {
                    if (providers.length === 0) {
                      this.toastService.simpleMessage('toasts.cloud-account.needToAddProviders', null, 4000);
                    }
                  });

                  this.debridAccountService.getPremiumizeSettings().then((settings) => {
                    if (!settings) {
                      settings = {
                        disabled: false,
                        apiKey: '',
                        preferTranscodedFiles: this.preferTranscoded,
                        preferTranscodedFilesChromecast: this.preferTranscodedFilesChromecast
                      };
                    }
                    settings.apiKey = data.apikey;

                    this.debridAccountService.setPremiumizeSettings(settings).then(() => {
                      this.ngZone.run(() => {
                        this.ngOnInit();
                      });
                    });
                  });
                });
            }
          }
        ]
      })
      .then((alert) => {
        alert.present();
      });
  }

  openPremiumize() {
    BrowserService.open('https://www.premiumize.me/ref/509582268');
  }

  togglePreferTranscoded(enabled: boolean) {
    this.debridAccountService.getPremiumizeSettings().then((settings) => {
      if (!settings) {
        return;
      }
      settings.preferTranscodedFiles = enabled;

      this.debridAccountService.setPremiumizeSettings(settings).then(() => {
        this.ngOnInit();
      });
    });
  }

  togglePreferTranscodedChromecast(enabled: boolean) {
    this.debridAccountService.getPremiumizeSettings().then((settings) => {
      if (!settings) {
        return;
      }
      settings.preferTranscodedFilesChromecast = enabled;

      this.debridAccountService.setPremiumizeSettings(settings).then(() => {
        this.ngOnInit();
      });
    });
  }

  toggleEnabledPM(enabled: boolean) {
    this.debridAccountService.getPremiumizeSettings().then((settings) => {
      if (!settings) {
        return;
      }
      settings.disabled = !enabled;

      this.debridAccountService.setPremiumizeSettings(settings).then(() => {
        this.ngOnInit();
        document.location.reload();
      });
    });
  }

  toggleEnabledRD(enabled: boolean) {
    this.debridAccountService.getRealDebridSettings().then((settings) => {
      if (!settings) {
        return;
      }
      settings.disabled = !enabled;

      this.debridAccountService.setRealDebridSettings(settings).then(() => {
        this.ngOnInit();
        document.location.reload();
      });
    });
  }

  async logoutRealDebrid() {
    await this.debridAccountService.deleteRealDebridSettings();
    this.ngOnInit();
  }

  loginRealDebrid() {
    RealDebridOauthCodeForm.submit(REAL_DEBRID_CLIENT_ID).subscribe((data) => {
      let alert;

      this.alertController
        .create({
          header: this.translateService.instant('alerts.cloud-account.real-debrid.authHeader'),
          message: this.translateService.instant('alerts.cloud-account.real-debrid.enterCode', {
            code: data.user_code
          }),
          inputs: [
            {
              name: 'code',
              type: 'text',
              value: data.user_code,
              disabled: false
            }
          ],
          buttons: [
            {
              text: this.translateService.instant('alerts.cloud-account.real-debrid.openUrlButton'),
              cssClass: 'copy-url',
              handler: () => {
                this.toastService.simpleMessage('toasts.copyToClipboard', { element: 'The code' });

                setTimeout(() => {
                  BrowserService.open(`https://real-debrid.com/device`);
                }, 1000);
                return false;
              }
            }
          ]
        })
        .then((_alert) => {
          alert = _alert;

          alert.present().then(() => {
            const copyEl = document.querySelector('.copy-url');
            if (!copyEl) {
              return;
            }
            copyEl.addEventListener('click', () => {
              this.clipboardService.copyFromContent(data.user_code);
              setTimeout(() => {
                // Need to be done twice to work on android
                this.clipboardService.copyFromContent(data.user_code);
              }, 100);
            });
          });

          this.debridAccountService.authRealDebrid(REAL_DEBRID_CLIENT_ID, data).subscribe((loggedIn) => {
            if (loggedIn) {
              alert.dismiss();
              this.ngZone.run(() => {
                this.ngOnInit();
              });
            } else {
              this.toastService.simpleMessage('toasts.real-debrid.failedToLogin');
            }
          });

          alert.onDidDismiss().then(() => {
            this.debridAccountService.stopRealDebridAuthInterval();
          });
        });
    });
  }

  openRealDebrid() {
    BrowserService.open('http://real-debrid.com/?id=4105935');
  }

  toggleEnabledAD(enabled: any) {
    this.debridAccountService.getAllDebridSettings().then((settings) => {
      if (!settings) {
        return;
      }

      this.debridAccountService.setAllDebridSettings(settings).then(() => {
        this.ngOnInit();
      });
    });
  }

  logoutAllDebrid() {
    this.debridAccountService.deleteAllDebridSettings().then(() => {
      this.ngOnInit();
    });
  }

  async loginAllDebrid() {
    const alert = await this.alertController.create({
      header: 'Enter your API-Key and Name',
      subHeader: 'You can generate keys here: https://alldebrid.com/apikeys',
      inputs: [
        {
          name: 'apikey',
          type: 'text',
          placeholder: 'API-Key',
          value: ''
        },
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name (i.e. Helios)',
          value: ''
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('alerts.cancelButton'),
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Ok',
          handler: (data) => {
            this.isLoadingAllDebrid = true;
            AllDebridUserForm.submit(data.apikey, data.name)
              .pipe(finalize(() => (this.isLoadingAllDebrid = false)))
              .subscribe((res) => {
                if (res.status === 'error') {
                  this.toastService.simpleMessage('toasts.all-debrid.invalidCredentials');
                  return;
                }
                this.providerService.getAll(false).then((providers) => {
                  if (providers.length === 0) {
                    this.toastService.simpleMessage('toasts.cloud-account.needToAddProviders', null, 4000);
                  }
                });

                this.debridAccountService.getAllDebridSettings().then((settings) => {
                  if (!settings) {
                    settings = {
                      disabled: false,
                      apiKey: '',
                      name: ''
                    };
                  }
                  settings.apiKey = data.apikey;
                  settings.name = data.name;

                  this.debridAccountService.setAllDebridSettings(settings).then(() => {
                    this.ngZone.run(() => {
                      this.ngOnInit();
                    });
                  });
                });
              });
          }
        }
      ]
    });

    alert.present();
  }

  openAllDebrid() {
    BrowserService.open('https://alldebrid.com/?uid=2e70s&lang=en');
  }
}
