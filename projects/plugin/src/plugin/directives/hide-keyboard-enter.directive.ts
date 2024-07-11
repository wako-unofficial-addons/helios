import { Directive, ElementRef, HostListener } from '@angular/core';

declare const Keyboard: any;

@Directive({
    selector: '[wkHideKeyboardEnter]',
    standalone: true
})
export class HideKeyboardEnterDirective {
  constructor(private element: ElementRef) {
  }

  @HostListener('keypress.enter')
  keyPressEnter() {
    this.hideKeyboard();
  }

  @HostListener('keypress', ['$event'])
  keyPress(e: KeyboardEvent) {
    if (e.key.toLowerCase().match('enter')) {
      this.hideKeyboard();
    }
  }

  private hideKeyboard() {
    if (Keyboard && Keyboard.hide) {
      Keyboard.hide();
    }
    if (this.element) {
      this.element.nativeElement.querySelector('input').blur();
    }
  }
}
