// https://github.com/chenjigeng/requestDecorator/blob/master/src/RequestDecorator.js

class RequestDecorator {
  constructor({
    maxLimit = 5,
    requestApi,
  }) {
    this.maxLimit = maxLimit;
    this.requestQueue = [];
    this.currentConcurrent = 0;
    this.requestApi = requestApi;
  }
  async request(...args) {
    if (this.currentConcurrent >= this.maxLimit) {
      await this.startBlocking();
    }
    try {
      this.currentConcurrent++;
      const result = await this.requestApi(...args);
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    } finally {
      this.currentConcurrent--;
      this.next();
    }
  }
  startBlocking() {
    let _resolve;
    let promise2 = new Promise((resolve, reject) => _resolve = resolve);
    this.requestQueue.push(_resolve);
    return promise2;
  }
  next() {
    if (this.requestQueue.length <= 0) return;
    const _resolve = this.requestQueue.shift();
    _resolve();
  }
}
