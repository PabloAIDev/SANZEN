import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AssistantComponent } from './components/assistant/assistant.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, AssistantComponent],
})
export class AppComponent {
  constructor() {}
}
