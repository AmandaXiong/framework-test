class ApiClient {
  /** @param {import('@playwright/test').APIRequestContext} request */
  constructor(request) {
    this.request = request;
  }

  get(url, options = {}) {
    return this.request.get(url, options);
  }

  post(url, data, options = {}) {
    return this.request.post(url, { ...options, data });
  }

  put(url, data, options = {}) {
    return this.request.put(url, { ...options, data });
  }

  delete(url, options = {}) {
    return this.request.delete(url, options);
  }
}

module.exports = { ApiClient };
