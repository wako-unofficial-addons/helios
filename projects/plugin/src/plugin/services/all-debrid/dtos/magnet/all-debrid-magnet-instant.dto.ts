import { AllDebridErrorDto } from '../all-debrid-error.dto';

export interface AllDebridMagnetInstantDto {
  status: 'error' | 'success';
  data: {
    magnets: AllDebridMagnetInstantMagnetDto[];
  };
}

export interface AllDebridMagnetInstantMagnetDto {
  magnet: string;
  hash?: string;
  instant?: boolean;
  error?: AllDebridErrorDto;
}
