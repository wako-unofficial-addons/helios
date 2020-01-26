export interface PremiumizeCacheCheckDto {
  status: 'error' | 'success';
  filename: string[];
  filesize: string[];
  response: boolean[];
  transcoed: boolean[];
}
