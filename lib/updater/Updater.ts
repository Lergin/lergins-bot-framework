import { setInterval, setTimeout } from "timers";

export abstract class Updater {
  protected abstract async start();

  private _interval: number;
  private _startTime: number;
  private _running: boolean = false;

  public abstract readonly id;

  public get configId(){
    return this.id;
  }

  init() {
    setTimeout(() => {
      this._running = true;
      console.log(`Starting Updater: ${this.id}`)
      
      if(this.hasInterval()){
        this.start();
      }
    }, this.startTime);
  }

  get running(){
    return this._running;
  }

  get startTime() {
    return this._startTime
  }

  set startTime(time: number) {
    this._startTime = time;
  }

  set interval(interval: number) {
    if (this._running && !this.hasInterval() && interval > 1) {
      this._interval = interval;
      this.start();
    } else {
      this._interval = interval;
    }
  }

  get interval() {
    return this._interval;
  }

  hasInterval() {
    return this.interval > 1
  }

  // runs the function every interval, if the interval value is updated it waits for the current interval to end and from then on uses the new one
  protected eachInterval(fun: Function) {
    fun();

    let currInterval = this.interval;

    if(!this.hasInterval()) return;
    
    let run = null;
    
    // function that updates the interval value if it has changed and calls the function that should be called every interval
    const updatingIntervalFunc = () => {
      fun();
      
      if (currInterval !== this.interval) {
        clearInterval(run);
        currInterval = this.interval;

        if(this.hasInterval()) {
          run = setInterval(() => updatingIntervalFunc(), this.interval);
        }
      }
    };
    
    run = setInterval(() => updatingIntervalFunc(), this.interval);
  }

  static sendError(err, info) {
    if (err.name === "FetchError") {
      console.error(`Error Response: ${info}`)
    } else {
      console.error(`error while updating ${info}`, err)
    }
  }
}