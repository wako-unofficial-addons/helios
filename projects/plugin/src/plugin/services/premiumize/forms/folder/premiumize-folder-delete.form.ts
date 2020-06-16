import { PremiumizeApiService } from '../../services/premiumize-api.service';
import { PremiumizeFolderListDto } from '../../dtos/folder/premiumize-folder-list.dto';

export class PremiumizeFolderDeleteForm {
  static submit(folderId: string) {
    return PremiumizeApiService.get<PremiumizeFolderListDto>('/folder/delete', {
      id: folderId
    });
  }
}
