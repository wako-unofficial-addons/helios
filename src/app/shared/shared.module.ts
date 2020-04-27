import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlaylistListComponent } from './playlist-list/playlist-list.component';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule],
  declarations: [PlaylistListComponent],
  exports: [PlaylistListComponent]
})
export class SharedModule {}
