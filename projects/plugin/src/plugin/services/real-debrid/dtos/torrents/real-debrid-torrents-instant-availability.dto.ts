export interface RealDebridTorrentsInstantAvailabilityDto {
  [key: string]: {
    rd: {
      [key: number]: {
        filename: string;
        filesize: number;
      };
    }[];
  };
}
