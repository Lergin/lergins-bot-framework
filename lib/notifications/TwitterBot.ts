import * as Twitter from "twit";
import { NotificationObserver } from './NotificationObserver';
import { NotificationSender } from "./NotificationSender";

export abstract class NotificationTwitterBot extends Twitter implements NotificationObserver {
  constructor(settings){
    super(settings);
  }

  abstract update(key: string, message: any);

  async send(message) {
    let a = (this as any).post('statuses/update', {status: message});

    try {
      let data = await a.then(res => res.data).catch(console.error);
    }catch(err ){
      console.log(err);
    }
  }
}