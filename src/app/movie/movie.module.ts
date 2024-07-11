import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MoviePage } from './movie.page';


@NgModule({
    imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: MoviePage }]), MoviePage]
})
export class MoviePageModule { }
