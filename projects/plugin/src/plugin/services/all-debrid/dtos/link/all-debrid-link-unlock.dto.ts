export interface AllDebridLinkUnlockDto {
  status: 'error' | 'success';
  data: {
    link: string;
    host: string;
    filename: string;
    streaming: string[];
    paws: boolean;
    filesize: number;
    id: string;
    hostDomain: string;
  };
}
