import { TorboxApiService } from '../../services/torbox-api.service';
import { TorboxTransferListDto } from '../../dtos/transfer/torbox-transfer-list.dto';

export class TorboxTransferListForm {
  static submit() {
    return TorboxApiService.get<TorboxTransferListDto>('/transfer/list');
  }
}
