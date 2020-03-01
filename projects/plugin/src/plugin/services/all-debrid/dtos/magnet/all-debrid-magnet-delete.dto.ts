export interface AllDebridMagnetDeleteDto {
  status: 'error' | 'success';
  data: {
    message: string;
  };
}
