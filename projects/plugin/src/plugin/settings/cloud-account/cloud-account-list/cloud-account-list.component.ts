import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { CloudAccountService, REAL_DEBRID_CLIENT_ID } from '../../../services/cloud-account.service';
import { BrowserService, ToastService } from '@wako-app/mobile-sdk';
import { ProviderService } from '../../../services/provider.service';
import { PremiumizeApiService } from '../../../services/premiumize/services/premiumize-api.service';
import { RealDebridApiService } from '../../../services/real-debrid/services/real-debrid-api.service';
import { PremiumizeAccountInfoForm } from '../../../services/premiumize/forms/account/premiumize-account-info.form';
import { RealDebridOauthCodeForm } from '../../../services/real-debrid/forms/oauth/real-debrid-oauth-code.form';
import { ClipboardService } from 'ngx-clipboard';

@Component({
  selector: 'wk-cloud-account-list',
  templateUrl: './cloud-account-list.component.html',
  styleUrls: ['./cloud-account-list.component.scss']
})
export class CloudAccountListComponent implements OnInit {
  isPremiumizeLogged = false;
  isLoadingPremiumize = false;
  preferTranscoded = false;

  isRealDebridLogged = false;
  isLoadingRealDebrid = false;

  constructor(
    private cloudAccountService: CloudAccountService,
    private alertController: AlertController,
    private translateService: TranslateService,
    private toastService: ToastService,
    private browserService: BrowserService,
    private providerService: ProviderService,
    public modalCtrl: ModalController,
    private clipboardService: ClipboardService
  ) {
  }

  ngOnInit() {
    this.cloudAccountService.getPremiumizeSettings().then(settings => {
      this.isPremiumizeLogged = !!settings;
      this.preferTranscoded = settings ? settings.preferTranscodedFiles : false;
      PremiumizeApiService.setApiKey(settings ? settings.apiKey : null);
    });

    this.cloudAccountService.getRealDebridSettings().then(settings => {
      this.isRealDebridLogged = !!settings;
      RealDebridApiService.setToken(settings ? settings.access_token : null);
    });
  }

  logoutPremiumize() {
    this.cloudAccountService.deletePremiumizeSettings().then(() => {
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
            handler: data => {
              this.isLoadingPremiumize = true;
              PremiumizeAccountInfoForm.submit(data.apikey)
                .pipe(finalize(() => (this.isLoadingPremiumize = false)))
                .subscribe(res => {
                  if (res.status === 'error') {
                    this.toastService.simpleMessage('toasts.premiumize.invalidApiKey');
                    return;
                  }
                  this.providerService.getAll(false).then(providers => {
                    if (providers.length === 0) {
                      this.toastService.simpleMessage('toasts.cloud-account.needToAddProviders', null, 4000);
                    }
                  });

                  this.cloudAccountService.getPremiumizeSettings().then(settings => {
                    if (!settings) {
                      settings = {
                        apiKey: '',
                        preferTranscodedFiles: this.preferTranscoded
                      };
                    }
                    settings.apiKey = data.apikey;

                    this.cloudAccountService.setPremiumizeSettings(settings).then(() => {
                      this.ngOnInit();
                    });
                  });
                });
            }
          }
        ]
      })
      .then(alert => {
        alert.present();
      });
  }

  openPremiumize() {
    this.browserService.open('https://www.premiumize.me/ref/509582268');
  }

  togglePreferTranscoded(enabled: boolean) {
    this.cloudAccountService.getPremiumizeSettings().then(settings => {
      if (!settings) {
        return;
      }
      settings.preferTranscodedFiles = enabled;

      this.cloudAccountService.setPremiumizeSettings(settings).then(() => {
        this.ngOnInit();
      });
    });
  }

  logoutRealDebrid() {
    this.cloudAccountService.deleteRealDebridSettings().then(() => {
      this.ngOnInit();
    });
  }

  loginRealDebrid() {
    RealDebridOauthCodeForm.submit(REAL_DEBRID_CLIENT_ID).subscribe(data => {
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
                this.toastService.simpleMessage('toasts.copyToClipboard', {element: 'The code'});

                setTimeout(() => {
                  this.browserService.open(`https://real-debrid.com/device`);
                }, 1000);
                return false;
              }
            }
          ]
        })
        .then(_alert => {
          alert = _alert;

          alert.present().then(() => {
            const copyEl = document.querySelector('.copy-url');
            if (!copyEl) {
              return;
            }
            copyEl.addEventListener('click', () => {
              this.clipboardService.copyFromContent(data.user_code);
            });
          });

          this.cloudAccountService.authRealDebrid(REAL_DEBRID_CLIENT_ID, data).subscribe(loggedIn => {
            if (loggedIn) {
              alert.dismiss();
              this.ngOnInit();
            } else {
              this.toastService.simpleMessage('toasts.real-debrid.failedToLogin');
            }
          });
        });
    });
  }

  openRealDebrid() {
    this.browserService.open('http://real-debrid.com/?id=3658750');
  }

}
