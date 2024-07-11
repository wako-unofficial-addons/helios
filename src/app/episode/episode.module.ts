import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EpisodePage } from './episode.page';


@NgModule({
    imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: EpisodePage }]), EpisodePage]
})
export class EpisodePageModule { }
