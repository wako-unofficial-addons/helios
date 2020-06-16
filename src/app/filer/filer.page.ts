import { Component, OnInit } from '@angular/core';
import { PluginLoaderService } from '../services/plugin-loader.service';
import { ExplorerFolderItem, ExplorerItem, WakoFileActionService } from '@wako-app/mobile-sdk';

@Component({
  selector: 'app-tab1',
  templateUrl: 'filer.page.html',
  styleUrls: ['filer.page.scss']
})
export class FilerPage implements OnInit {
  private rootExplorerFolderItems: ExplorerFolderItem[] = [];
  explorerFolderItems: ExplorerFolderItem[] = [];
  currentExplorerFolderItem: ExplorerFolderItem = null;
  isLoading = false;

  constructor(private pluginLoader: PluginLoaderService, private fileActionService: WakoFileActionService) {}

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

  open(item: ExplorerItem) {
    this.fileActionService.openWithDefaultActions(item.file.link, item.file.streamLink);
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
