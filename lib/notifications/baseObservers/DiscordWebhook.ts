import { WebhookClient, RichEmbed, ClientOptions } from "discord.js";
import { NotificationObserver } from "../NotificationObserver";

export abstract class DiscordWebhook extends WebhookClient implements NotificationObserver {
  constructor(settings: {id: string, key: string, options?: ClientOptions}){
    if(!settings.id || !settings.key) throw new Error('A Discord Webhook needs an id and key!');

    super(settings.id, settings.key, settings.options || {});
  }

  abstract update(type: string, message: any);
}
