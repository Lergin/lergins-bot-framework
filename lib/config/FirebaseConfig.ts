import { Config } from './Config'
import { database } from 'firebase-admin';

export class FirebaseConfig extends Config {
  private _ref: database.Reference;

  constructor(ref) {
    super();
    this._ref = ref;
  }

  async get(path) {
    return this._ref.child(FirebaseConfig.toFirebasePath(path)).once("value").then(snap => snap.val());
  }

  set(path, val){
    return this._ref.child(FirebaseConfig.toFirebasePath(path)).set(val);
  }

  on(path, event, func) {
    this._ref.child(FirebaseConfig.toFirebasePath(path)).on(event, snap => {
      func(snap.val(), snap.key);
    });
  };

  static toFirebasePath(path) {
    return Config.splitPath(path).join("/");
  }
}