import { AllDebridErrorDto } from '../all-debrid-error.dto';

export interface AllDebridMagnetUploadDto {
  status: 'error' | 'success';
  data: {
    magnets: AllDebridMagnetUploadMagnetDto[];
  };
}

export interface AllDebridMagnetUploadMagnetDto {
  magnet: string;
  hash?: string;
  name?: string;
  size?: number;
  ready?: boolean;
  id?: number;
  error?: AllDebridErrorDto;
}
