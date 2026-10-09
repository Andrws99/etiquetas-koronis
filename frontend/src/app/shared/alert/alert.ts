import { Component, Input } from '@angular/core';

export type NivelAlerta = 'warn' | 'bad' | 'good' | 'info';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.html',
  styles: [':host{display:block}'],
  standalone: true
})
export class Alert {
  @Input({required: true}) nivel: NivelAlerta = 'info';
  @Input({required: true}) titulo = '';
}
