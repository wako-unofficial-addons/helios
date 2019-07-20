import { Component } from '@angular/core';

@Component({
  templateUrl: './plugin-detail.component.html'
})
export class PluginDetailComponent {
  searchInput = '';
  category = 'movies';

  constructor() {}

  hideKeyboard() {}

  onSearch(event: any) {
    this.searchInput = event.target.value ? event.target.value : '';
  }
}
