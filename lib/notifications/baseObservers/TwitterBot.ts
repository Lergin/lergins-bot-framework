import * as Twitter from "twit";
import { NotificationObserver } from '../NotificationObserver';

export abstract class TwitterBot extends Twitter implements NotificationObserver {
  constructor(settings){
    super(settings);
  }

  abstract update(type: string, message: any);

  async send(message) {
    let a = (this as any).post('statuses/update', {status: message});

    try {
      let data = await a.then(res => res.data).catch(console.error);
    }catch(err ){
      console.log(err);
    }
  }
}