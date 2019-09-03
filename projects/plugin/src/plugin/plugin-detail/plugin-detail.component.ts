import { Component, Input, OnInit } from '@angular/core';
import { SourceDetail } from '../entities/source-detail';
import { SourceService } from '../services/sources/source.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { KodiOpenMedia } from '../entities/kodi-open-media';

@Component({
  selector: 'helios-plugin-detail',
  templateUrl: './plugin-detail.component.html'
})
export class PluginDetailComponent implements OnInit {
  @Input()
  searchInput = '';

  @Input()
  category: 'movie' | 'tv' | 'anime' = 'movie';

  sourceDetail: SourceDetail;

  searching = false;

  @Input()
  kodiOpenMedia: KodiOpenMedia;

  private subscription: Subscription;

  constructor(private sourceService: SourceService) {
  }

  hideKeyboard() {
  }

  ngOnInit() {
    if (this.searchInput.length > 0) {
      this.search();
    }
  }

  onSearch(event: any) {
    this.searchInput = event.target.value ? event.target.value : '';
    this.search();
  }

  private search() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.sourceDetail = null;
    this.searching = true;

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
