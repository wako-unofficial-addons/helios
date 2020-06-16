import { RealDebridApiService } from '../../services/real-debrid-api.service';
import { RealDebridFolderListDto } from '../../dtos/torrents/real-debrid-torrents-list.dto';

export class RealDebridFolderListForm {
  static submit() {
    return RealDebridApiService.get<RealDebridFolderListDto[]>('/torrents/');
  }
}
