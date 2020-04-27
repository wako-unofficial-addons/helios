import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MoviePage } from './movie.page';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: MoviePage }]), SharedModule],
  declarations: [MoviePage]
})
export class MoviePageModule {}
