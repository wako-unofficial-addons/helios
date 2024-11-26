import { TorboxApiService } from '../../services/torbox-api.service';
import { TorboxFileListDto } from '../../dtos/file/torbox-file-list.dto';

export class TorboxFileListForm {
  static submit(transferId?: string) {
    return TorboxApiService.get<TorboxFileListDto>('/files', {
      transfer_id: transferId,
    });
  }
}
