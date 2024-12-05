import { Component, OnInit } from '@angular/core';
import { PluginLoaderService } from '../services/plugin-loader.service';
import { ExplorerFolderItem, ExplorerItem, WakoFileActionService } from '@wako-app/mobile-sdk';

import { addIcons } from 'ionicons';
import {
  arrowBackSharp,
  homeOutline,
  refreshOutline,
  folderOpenOutline,
  documentOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonSpinner,
  IonContent,
  IonList,
  IonListHeader,
  IonLabel,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab1',
  templateUrl: 'filer.page.html',
  styleUrls: ['filer.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonSpinner,
    IonContent,
    IonList,
    IonListHeader,
    IonLabel,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonSpinner,
    IonContent,
    IonList,
    IonListHeader,
    IonLabel,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonSpinner,
    IonContent,
    IonList,
    IonListHeader,
    IonLabel,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
  ],
})
export class FilerPage implements OnInit {
  private rootExplorerFolderItems: ExplorerFolderItem[] = [];
  explorerFolderItems: ExplorerFolderItem[] = [];
  currentExplorerFolderItem: ExplorerFolderItem = null;
  isLoading = false;

  constructor(
    private pluginLoader: PluginLoaderService,
    private fileActionService: WakoFileActionService,
  ) {
    addIcons({ arrowBackSharp, homeOutline, refreshOutline, folderOpenOutline, documentOutline, trashOutline });
    addIcons({ arrowBackSharp, homeOutline, refreshOutline, folderOpenOutline, documentOutline, trashOutline });
    addIcons({ arrowBackSharp, homeOutline, refreshOutline, folderOpenOutline, documentOutline, trashOutline });
  }

  ngOnInit() {
    this.goToRoot();
  }

  fetchChildren(explorerFolderItem: ExplorerItem) {
    explorerFolderItem.fetchChildren.subscribe((explorerFolderItem) => {
      this.currentExplorerFolderItem = explorerFolderItem;
      this.explorerFolderItems = [explorerFolderItem];
    });
  }

  goBack(explorerFolderItem: ExplorerFolderItem) {
    explorerFolderItem.goToParentAction.subscribe((explorerFolderItem) => {
      this.currentExplorerFolderItem = explorerFolderItem;
      if (explorerFolderItem.isRoot) {
        this.explorerFolderItems = [...this.rootExplorerFolderItems];
      }
    });
  }

  async goToRoot() {
    this.isLoading = true;
    const pluginService = this.pluginLoader.getPluginService('plugin.helios');

    this.currentExplorerFolderItem = null;

    const explorerFolderItem = await pluginService.fetchExplorerFolderItem();

    this.rootExplorerFolderItems = Array.isArray(explorerFolderItem) ? explorerFolderItem : [explorerFolderItem];
    this.explorerFolderItems = Array.isArray(explorerFolderItem) ? explorerFolderItem : [explorerFolderItem];

    this.isLoading = false;
  }

  async open(item: ExplorerItem) {
    if (!item.file.link) {
      const pluginService = this.pluginLoader.getPluginService('plugin.helios');
      const actions = await pluginService.getFileActionButtons(item.file);
      this.fileActionService.showActionSheetActions(actions);
    } else {
      this.fileActionService.openWithDefaultActions(item.file.link, item.file.streamLink);
    }
  }

  delete(folder: ExplorerFolderItem, item: ExplorerItem) {
    item.deleteAction.subscribe(() => {
      const items: ExplorerItem[] = [];

      folder.items.forEach((i) => {
        if (i.id !== item.id) {
          items.push(i);
        }
      });

      folder.items = items;
    });
  }
}
