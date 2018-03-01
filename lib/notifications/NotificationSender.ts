import { NotificationObserver } from "./NotificationObserver";

export class NotificationSender {
  private static observers: Set<NotificationObserver> = new Set();

  static register(observer: NotificationObserver) {
    NotificationSender.observers.add(observer);
  }

  static unregister(observer: NotificationObserver) {
    NotificationSender.observers.delete(observer);
  }

  static send(key: string, message: any) {
    NotificationSender.observers.forEach(observer => observer.update(key, message));
  }
}
