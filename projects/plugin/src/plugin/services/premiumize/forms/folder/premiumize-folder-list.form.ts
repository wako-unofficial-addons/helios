import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PremiumizeFolderListDto } from '../../dtos/folder/premiumize-folder-list.dto';

export class PremiumizeFolderListForm {
  static submit(folderId?: string) {
    return PremiumizeApiService.get<PremiumizeFolderListDto>('/folder/list', {
      id: folderId
    });
  }

  static remove(itemId: string) {
    return PremiumizeApiService.get<PremiumizeFolderListDto>('/item/delete', {
      id: itemId
    });
  }
}
