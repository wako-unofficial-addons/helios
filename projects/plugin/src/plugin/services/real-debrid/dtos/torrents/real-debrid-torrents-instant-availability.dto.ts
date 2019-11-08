export interface RealDebridTorrentsInstantAvailabilityDto {
  [key: string]: {
    rd: {
      [key: number]: RealDebridTorrentsInstantAvailabilitFileDto;
    }[];
  };
}

export interface RealDebridTorrentsInstantAvailabilitFileDto {
  filename: string;
  filesize: number;
}
