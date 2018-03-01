import { Config, ConfigEventType } from './Config'
import * as fs from 'fs';
import { promisify, isArray } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export class JsonConfig extends Config {
  private _json: Promise<any> = Promise.resolve({});

  constructor(private readonly filePath) {
    super();

    this._json = readFile(filePath, 'utf8').then(data => JSON.parse(data));
  }

  async get(path): Promise<any> {
    const pathParts = Config.splitPath(path);
    let res = await this._json;


    for (let pathPart of pathParts) {
      if (!res[pathPart]) return null;

      res = res[pathPart];
    }

    return res;
  }

  on(path, event, func) {
    switch (event) {
      case ConfigEventType.VALUE:
        this.get(path).then(val => func(val));
        break;
      case ConfigEventType.CHILD_ADDED:
        this.get(path).then(data => {
          if(isArray(data)){
            data.map((val, index) => func(val, index));
          }else if(data){
            Object.entries(data).map(([key, val]) => func(val, key));
          }
        });
        break;
    }
  }

  async set(path, val) {
    const pathParts = Config.splitPath(path);
    let res = await this._json;

    for (let pathPart of pathParts) {
      if (!res[pathPart]) return null;

      res = res[pathPart];
    }

    res = val;

    return writeFile(this.filePath, JSON.stringify(await this._json, null, 2));
  }
}