import { WebhookClient, RichEmbed, ClientOptions } from "discord.js";
import { NotificationObserver } from "./NotificationObserver";

export abstract class DiscordWebhook extends WebhookClient implements NotificationObserver {
  constructor(settings: {id: string, key: string, options?: ClientOptions}){
    super(settings.id, settings.key, settings.options || {});
  }

  abstract update(key: string, message: any);
}
