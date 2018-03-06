import { initializeApp, credential, database, firestore, app } from "firebase-admin";
import * as path from "path";

import { NotificationSender } from "./notifications/NotificationSender";
import { Config, ConfigEventType } from "./config/Config";
import { JsonConfig } from "./config/JsonConfig";
import { FirebaseConfig } from "./config/FirebaseConfig";
import { NotificationObserver } from "./notifications/NotificationObserver";
import { ClientOptions } from "discord.js";
import { Updater } from "./updater/Updater";

export type NotificationObserverImpl = (new (settings) => NotificationObserver);

export class BotFramework {
    private observers: Map<string, NotificationObserver> = new Map();
    private updaters: Set<Updater> = new Set();
    private readonly _ObserverImplementations: Map<string, NotificationObserverImpl> = new Map();
    private readonly _forceFirebaseInit: boolean = false;
    private readonly _config: Config;
    private readonly _notificationSender: NotificationSender = new NotificationSender();
    private startTime = -1;

    constructor(builder: BotFramework.Builder) {
        this._ObserverImplementations = builder._Observer;
        this.updaters = builder._updaters;
        this._forceFirebaseInit = builder._forceFirebaseInit;

        this._config = this.initConfig(builder._configFolderPath);
        this.initObservers();
    }

    start() {
        this.startTime = new Date().getTime();
        this.initUpdater();
    }

    async addUpdater(updater: Updater) {
        this.updaters.add(updater);

        if (this.startTime > 0){
            updater.startTime = (new Date().getTime() - this.startTime - await this.config().get(`updater.${updater.configId}.startTime`) || -1);

            this.config().on(`updater.${updater.configId}.interval`, ConfigEventType.VALUE, val => updater.interval = val);
    
            try {
                updater.init();
            } catch (err) {
                console.error(`Error with updater ${updater.id}`, err);
            }
    
            console.log(`Initialized additional Updater ${updater.id}`);
        }
    }

    private initConfig(configFolderPath: string){
        let configFile: any = { use_firebase: true, firebase_service_account: 'firebase_service_account.json' };
        try {
            configFile = { ...configFile, ...require(path.join(configFolderPath, 'config.json')) };
        } catch (ex) {
            if (ex.message.startsWith("Cannot find module")) {
                console.log(`No config file provided: Trying to load from firebase using firebase_service_account.json`);
            } else {
                console.error(ex.message);
                process.exit();
            }
        }

        if (configFile.use_firebase || this._forceFirebaseInit) {
            const serviceAccount = require(path.join(configFolderPath, configFile.firebase_service_account));

            initializeApp({
                credential: credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
            });

            console.log(`Initilaized firebase (${serviceAccount.project_id})`);
        }
        
        if(configFile.use_firebase) {
            const db = database();
            console.log(`Loading configuration from firebase`);
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
        this.notificationSender().register(observer);
    }

    private unregisterObserver(id) {
        this.notificationSender().unregister(this.observers.get(id));
        this.observers.delete(id);
    }

    private initObservers(){
        this.config().on("observers", ConfigEventType.CHILD_ADDED, (settings, id) => {
            this.registerObserver(settings, id);
            console.log(`Registered Observer: ${id} (${settings.type})`);
        });

        this.config().on("observers", ConfigEventType.CHILD_CHANGED, (settings, id) => {
            this.unregisterObserver(id);
            this.registerObserver(settings, id);
            console.log(`Updated Observer: ${id} (${settings.type})`);
        });

        this.config().on("observers", ConfigEventType.CHILD_REMOVED, (settings, id) => {
            this.unregisterObserver(id);
            console.log(`Deleted Observer: ${id} (${settings.type})`);
        });
    }

    private async initUpdater(){
        await Promise.all([...this.updaters.values()].map(async updater => {
            updater.startTime = (await this.config().get(`updater.${updater.configId}.startTime`) || -1);

            this.config().on(`updater.${updater.configId}.interval`, ConfigEventType.VALUE, val => updater.interval = val);

            return;
        }));

        this.updaters.forEach(updater => {
            try {
                updater.init();
            } catch (err) {
                console.error(`Error with updater ${updater.id}`, err);
            }
        });

        console.log(`Initialized ${this.updaters.size} Updaters`);
    }

    send(type: string, message: any){
        return this.notificationSender().send(type, message);
    }

    config(){
        return this._config;
    }

    notificationSender(){
        return this._notificationSender;
    }
}

export module BotFramework {
    export class Builder {
        _Observer: Map<string, NotificationObserverImpl> = new Map();
        _updaters: Set<Updater> = new Set();
        _configFolderPath: string;
        _forceFirebaseInit: boolean = false;

        observer(type: string, observer: NotificationObserverImpl): BotFramework.Builder {
            this._Observer.set(type, observer);
            return this;
        }

        updater(updater: Updater): BotFramework.Builder {
            this._updaters.add(updater);
            return this;
        }

        configFolderPath(configFolderPath: string): BotFramework.Builder {
            this._configFolderPath = configFolderPath;
            return this;
        }

        forceFirebaseInit(): BotFramework.Builder {
            this._forceFirebaseInit = true;
            return this;
        }

        build(): BotFramework {
            return new BotFramework(this);
        }
    }
}
