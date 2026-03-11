import { Component } from '@angular/core'
import { NgxSonnerToaster } from 'ngx-sonner'

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgxSonnerToaster],
  template: `<ngx-sonner-toaster position="top-right" richColors />`,
})
export class ToastComponent {}
