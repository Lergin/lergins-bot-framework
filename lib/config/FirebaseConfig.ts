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
  
  async push(path, val){
    if(typeof val === "string"){
      await this._ref.child(FirebaseConfig.toFirebasePath(path)).child(val).set(true);
      return;
    }

    this._ref.child(FirebaseConfig.toFirebasePath(path)).push(val);
  }
  
  has(path, val){
    if (typeof val === "string") {
      return this._ref.child(FirebaseConfig.toFirebasePath(path)).child(val).once("value").then(snap => snap.val() ? true : false);
    }

    return this._ref.child(FirebaseConfig.toFirebasePath(path)).equalTo(val).once("value").then(snap => snap.val() ? true : false);
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