import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilerPage } from './filer.page';

@NgModule({
    imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: FilerPage }]), FilerPage]
})
export class FilterPageModule { }
