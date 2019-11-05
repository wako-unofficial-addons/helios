export interface RealDebridOauthCodeDto {
  device_code: string;
  user_code: string;
  interval: number;
  expires_in: number;
  verification_url: string;
}
