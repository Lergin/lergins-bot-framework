import * as Twitter from "twit";
import { NotificationObserver } from '../NotificationObserver';

export abstract class TwitterBot extends Twitter implements NotificationObserver {
  constructor(settings){
    super(settings);
  }

  abstract update(type: string, message: any);

  async send(message) {
    return (this as any).post('statuses/update', {status: message});
  }
}