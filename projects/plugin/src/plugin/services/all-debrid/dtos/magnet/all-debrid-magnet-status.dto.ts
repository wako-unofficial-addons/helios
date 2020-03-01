import { AllDebridErrorDto } from '../all-debrid-error.dto';

export interface AllDebridMagnetStatusDto {
  status: 'error' | 'success';
  data: {
    magnets: AllDebridMagnetStatusMagnetDto;
  };
}

export interface AllDebridMagnetStatusMagnetDto {
  id: number;
  filename: string;
  size: number;
  status: 'Ready';
  statusCode: number;
  downloaded: number;
  uploaded: number;
  seeders: number;
  downloadSpeed: number;
  uploadSpeed: number;
  uploadDate: number;
  links: AllDebridMagnetStatusLinkDto[];
  error?: AllDebridErrorDto;
}

export interface AllDebridMagnetStatusLinkDto {
  link: string;
  filename: string;
  size: number;
}
