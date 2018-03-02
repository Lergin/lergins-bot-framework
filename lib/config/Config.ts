import { isArray } from "util";

export enum ConfigEventType {
  VALUE = "value",
  CHILD_ADDED = "child_added",
  CHILD_CHANGED = "child_changed",
  CHILD_REMOVED = "child_removed",
  CHILD_MOVED = "child_moved"
}

export abstract class Config {
  /**
   * gets the value from the configuration
   * @param path path as a string eather splited by . or / use Config.splitPath() to get an array of path elements
   */
  abstract async get(path): Promise<any>;

  /**
   * checks if the value exists in the array
   * @param path @see get
   * @param val the value to search in the array
   */
  async has(path, val): Promise<Boolean> {
    const arr = await this.get(path);

    if (!isArray(arr) && arr != undefined) throw new Error('can only check "has" on array');

    if (arr) {
      return (arr as any[]).indexOf(val) !== -1;
    } else {
      return false;
    }
  }

  async hasPath(path): Promise<Boolean> {
    return (await this.get(path)) !== null;
  }

  abstract set(path, val): void;

  async push(path, val): Promise<void> {
    const arr = await this.get(path);

    if(!isArray(arr) && arr != undefined) throw new Error('can only push to array');

    if(arr){
      arr.push(val);
      return this.set(path, arr);
    }else{
      return this.set(path, [val]);
    }
  }

  abstract on(path: string, type: ConfigEventType, func: Function);

  protected static splitPath(path) {
    return path
      // split add . and /
      .split(/(\/|\.)/g)
      // filter to only include the even elements (0, 2, 4, ...) to not have the . and /
      .filter((e, i) => i % 2 === 0);
  }
}