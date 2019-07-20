import { RealDebridApiService } from '../../services/real-debrid-api.service';
import { RealDebridTorrentsInstantAvailabilityDto } from '../../dtos/torrents/real-debrid-torrents-instant-availability.dto';

export class RealDebridTorrentsInstantAvailabilityForm {
  static submit(hashList: string[]) {
    return RealDebridApiService.get<RealDebridTorrentsInstantAvailabilityDto>(
      `/torrents/instantAvailability/${hashList.join('/')}`
    );
  }
}
