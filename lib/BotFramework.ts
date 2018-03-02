import { initializeApp, credential, database, firestore } from "firebase-admin";
import * as path from "path";

import { NotificationSender } from "./notifications/NotificationSender";
import { Config, ConfigEventType } from "./config/Config";
import { JsonConfig } from "./config/JsonConfig";
import { FirebaseConfig } from "./config/FirebaseConfig";
import { NotificationObserver } from "./notifications/NotificationObserver";
import { ClientOptions } from "discord.js";

export type NotificationObserverImpl = (new (settings) => NotificationObserver);

export class BotFramework {
    private observers: Map<String, NotificationObserver> = new Map();
    private readonly _ObserverImplementations: Map<string, NotificationObserverImpl>;
    readonly config: Config;
    readonly notificationSender: NotificationSender = new NotificationSender();

    constructor(builder: BotFramework.Builder){
        this._ObserverImplementations = builder._Observer;

        this.config = this.initConfig(builder._configFolderPath);
        this.initObservers();
    }

    private initConfig(configFolderPath: string){
        let configFile: any = { use_firebase: true, firebase_service_account: 'firebase_service_account.json' };
        try {
            configFile = { ...configFile, ...require(path.join(configFolderPath, 'config.json')) };
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

    private registerObserver(settings: { type: string }, id) {
        if (!settings.type) throw new Error('Observer Type is necessary!');
        if(!this._ObserverImplementations.has(settings.type)) throw new Error(`Unknown Observer Type ${settings.type}`);

        const observer = new (this._ObserverImplementations.get(settings.type))(settings);

        this.observers.set(id, observer);
        this.notificationSender.register(observer);
    }

    private unregisterObserver(id) {
        this.notificationSender.unregister(this.observers.get(id));
        this.observers.delete(id);
    }

    private initObservers(){
        this.config.on("observers", ConfigEventType.CHILD_ADDED, (settings, id) => {
            this.registerObserver(settings, id);
            console.log(`Registered Observer: ${id} (${settings.type})`);
        });

        this.config.on("observers", ConfigEventType.CHILD_CHANGED, (settings, id) => {
            this.unregisterObserver(id);
            this.registerObserver(settings, id);
            console.log(`Updated Observer: ${id} (${settings.type})`);
        });

        this.config.on("observers", ConfigEventType.CHILD_REMOVED, (settings, id) => {
            this.unregisterObserver(id);
            console.log(`Deleted Observer: ${id} (${settings.type})`);
        });
    }

    send(type: string, message: any){
        return this.notificationSender.send(type, message);
    }
}

export module BotFramework {
    export class Builder {
        _Observer: Map<string, NotificationObserverImpl> = new Map();
        _configFolderPath: string;

        observer(type: string, observer: NotificationObserverImpl): BotFramework.Builder {
            this._Observer.set(type, observer);
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
