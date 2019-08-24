import { Component } from '@angular/core';
import { SourceDetail } from '../entities/source-detail';
import { SourceService } from '../services/sources/source.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  templateUrl: './plugin-detail.component.html'
})
export class PluginDetailComponent {
  searchInput = '';
  category: 'movie' | 'tv' | 'anime' = 'movie';

  sourceDetail: SourceDetail;

  searching = false;

  private subscription: Subscription;

  constructor(private sourceService: SourceService) {}

  hideKeyboard() {}

  onSearch(event: any) {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.sourceDetail = null;
    this.searching = true;
    this.searchInput = event.target.value ? event.target.value : '';

    if (this.searchInput.length === 0) {
      this.searching = false;
      return;
    }

    this.subscription = this.sourceService
      .get(this.searchInput, this.category)
      .pipe(finalize(() => (this.searching = false)))
      .subscribe(sourceDetail => {
        this.sourceDetail = sourceDetail;
      });
  }
}
