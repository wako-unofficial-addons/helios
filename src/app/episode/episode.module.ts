import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EpisodePage } from './episode.page';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: EpisodePage }]), SharedModule],
  declarations: [EpisodePage]
})
export class EpisodePageModule {}
