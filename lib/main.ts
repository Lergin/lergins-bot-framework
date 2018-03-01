import { initializeApp, credential, database, firestore } from "firebase-admin";
import * as path from "path";

import { DiscordWebhook } from "./notifications/DiscordWebhook";
import { NotificationSender } from "./notifications/NotificationSender";
import { NotificationTwitterBot } from "./notifications/TwitterBot";
import { Config, ConfigEventType } from "./config/Config";
import { JsonConfig } from "./config/JsonConfig";
import { FirebaseConfig } from "./config/FirebaseConfig";
import { NotificationObserver } from "./notifications/NotificationObserver";
import { ClientOptions } from "discord.js";

enum ObserverType {
    TWITTER = 'twitter',
    DISCORD_WEBHOOK = 'discord_webhook'
}

export type DiscordWebhookConstructor = (new (settings: { id: string, key: string, options?: ClientOptions }) => DiscordWebhook);
export type TwitterBotConstructor = (new (settings) => NotificationTwitterBot);

export class BotFramework {
    private observers: Map<String, NotificationObserver> = new Map();
    private readonly _TwitterBot: TwitterBotConstructor;
    private readonly _DiscordWebhook: DiscordWebhookConstructor;
    readonly config: Config;
    readonly notificationSender: NotificationSender = new NotificationSender();

    constructor(builder: BotFramework.Builder){
        this._TwitterBot = builder._TwitterBot;
        this._DiscordWebhook = builder._DiscordWebhook;

        this.config = this.initConfig(builder._configFolderPath);
        this.initObservers();
    }

    private initConfig(configFolderPath: string){
        let configFile: any = { use_firebase: true, firebase_service_account: 'firebase_service_account.json' };
        try {
            configFile = require(path.join(configFolderPath, 'config.json'));
        } catch (ex) {
            console.log(`No config file provided: Trying to load from firebase using firebase_service_account.json`);
        }

        if (configFile.use_firebase) {
            const serviceAccount = require(path.join(configFolderPath, configFile.firebase_service_account));

            initializeApp({
                credential: credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
            });

            const db = database();

            console.log(`Loading configuration from firebase (${serviceAccount.project_id})`);
            return new FirebaseConfig(db.ref(configFile.firebase_config_path || "config"));
        } else {
            console.log(`Loading configuration from config.json`);
            return new JsonConfig(path.join(configFolderPath, "config.json"));
        }
    }

    private registerObserver(settings: { type: ObserverType }, key) {
        if (!settings.type) throw new Error('Observer Type is necessary!');

        let observer;

        switch (settings.type) {
            case ObserverType.DISCORD_WEBHOOK:
                if (!(settings as any).id || !(settings as any).key) throw new Error("Each webhook needs an id and a key!");

                observer = new this._DiscordWebhook(settings as any);
                break;
            case ObserverType.TWITTER:
                observer = new this._TwitterBot(settings);
                break;
            default:
                throw new Error('Unknown Observer Type');
        }

        this.observers.set(key, observer);
        this.notificationSender.register(observer);
    }

    private unregisterObserver(key) {
        this.notificationSender.unregister(this.observers.get(key));
        this.observers.delete(key);
    }

    private initObservers(){
        this.config.on("observers", ConfigEventType.CHILD_ADDED, (settings, key) => {
            this.registerObserver(settings, key);
            console.log(`Registered Observer: ${key} (${settings.type})`);
        });

        this.config.on("observers", ConfigEventType.CHILD_CHANGED, (settings, key) => {
            this.unregisterObserver(key);
            this.registerObserver(settings, key);
            console.log(`Updated Observer: ${key} (${settings.type})`);
        });

        this.config.on("observers", ConfigEventType.CHILD_REMOVED, (settings, key) => {
            this.unregisterObserver(key);
            console.log(`Deleted Observer: ${key} (${settings.type})`);
        });
    }

    send(key: string, message: any){
        return this.notificationSender.send(key, message);
    }
}

export module BotFramework {
    export class Builder {
        _DiscordWebhook: (new (settings: { id: string, key: string, options?: ClientOptions }) => DiscordWebhook)
        _TwitterBot: TwitterBotConstructor
        _configFolderPath: string;

        discordWebhook(discordWebhook: (new (settings: { id: string, key: string, options?: ClientOptions }) => DiscordWebhook)): BotFramework.Builder {
            this._DiscordWebhook = discordWebhook;
            return this;
        }

        twitterBot(twitterBot: (new (settings) => NotificationTwitterBot)): BotFramework.Builder {
            this._TwitterBot = twitterBot;
            return this;
        }

        configFolderPath(configFolderPath: string): BotFramework.Builder {
            this._configFolderPath = configFolderPath;
            return this;
        }

        build(): BotFramework {
            return new BotFramework(this);
        }
    }
}

class MyDiscordWebhook extends DiscordWebhook{
    constructor(settings: { id: string, key: string, options?: ClientOptions }){
        super(settings);
    }

    update(key, string){
        console.log("Discord", key, " ", string);
    }
}

class MyTwitterBot extends NotificationTwitterBot{
    constructor(settings){
        super(settings);
    }

    update(key, string){
        console.log("Twitter", key, " ", string);
    }
}

const botFramework = new BotFramework.Builder()
.discordWebhook(MyDiscordWebhook)
.twitterBot(MyTwitterBot)
.configFolderPath(path.join(__dirname, '..'))
.build();

setTimeout(() => {
    botFramework.send('hey', 'hoho');
}, 100);

