import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PremiumizeFolderListDto } from '../../dtos/folder/premiumize-folder-list.dto';

export class PremiumizeItemDeleteForm {
  static submit(itemId: string) {
    return PremiumizeApiService.get<PremiumizeFolderListDto>('/item/delete', {
      id: itemId
    });
  }
}
