import { NotificationObserver } from "./NotificationObserver";

export class NotificationSender {
  private observers: Set<NotificationObserver> = new Set();

  register(observer: NotificationObserver) {
    this.observers.add(observer);
  }

  unregister(observer: NotificationObserver) {
    this.observers.delete(observer);
  }

  send(type: string, message: any) {
    this.observers.forEach(observer => observer.update(type, message));
  }
}
