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

  async has(path): Promise<Boolean> {
    return (await this.get(path)) !== null;
  }

  abstract set(path, val): void;

  abstract on(path: string, type: ConfigEventType, func: Function);

  protected static splitPath(path) {
    return path
      // split add . and /
      .split(/(\/|\.)/g)
      // filter to only include the even elements (0, 2, 4, ...) to not have the . and /
      .filter((e, i) => i % 2 === 0);
  }
}