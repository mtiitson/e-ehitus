#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/http-cache-semantics/index.js
var require_http_cache_semantics = __commonJS({
  "node_modules/http-cache-semantics/index.js"(exports2, module2) {
    "use strict";
    var statusCodeCacheableByDefault = /* @__PURE__ */ new Set([
      200,
      203,
      204,
      206,
      300,
      301,
      308,
      404,
      405,
      410,
      414,
      501
    ]);
    var understoodStatuses = /* @__PURE__ */ new Set([
      200,
      203,
      204,
      300,
      301,
      302,
      303,
      307,
      308,
      404,
      405,
      410,
      414,
      501
    ]);
    var errorStatusCodes = /* @__PURE__ */ new Set([
      500,
      502,
      503,
      504
    ]);
    var hopByHopHeaders = {
      date: true,
      // included, because we add Age update Date
      connection: true,
      "keep-alive": true,
      "proxy-authenticate": true,
      "proxy-authorization": true,
      te: true,
      trailer: true,
      "transfer-encoding": true,
      upgrade: true
    };
    var excludedFromRevalidationUpdate = {
      // Since the old body is reused, it doesn't make sense to change properties of the body
      "content-length": true,
      "content-encoding": true,
      "transfer-encoding": true,
      "content-range": true
    };
    function toNumberOrZero(s) {
      const n2 = parseInt(s, 10);
      return isFinite(n2) ? n2 : 0;
    }
    function isErrorResponse(response) {
      if (!response) {
        return true;
      }
      return errorStatusCodes.has(response.status);
    }
    function parseCacheControl(header) {
      const cc = {};
      if (!header) return cc;
      const parts = header.trim().split(/,/);
      for (const part of parts) {
        const [k, v] = part.split(/=/, 2);
        cc[k.trim()] = v === void 0 ? true : v.trim().replace(/^"|"$/g, "");
      }
      return cc;
    }
    function formatCacheControl(cc) {
      let parts = [];
      for (const k in cc) {
        const v = cc[k];
        parts.push(v === true ? k : k + "=" + v);
      }
      if (!parts.length) {
        return void 0;
      }
      return parts.join(", ");
    }
    module2.exports = class CachePolicy {
      /**
       * Creates a new CachePolicy instance.
       * @param {HttpRequest} req - Incoming client request.
       * @param {HttpResponse} res - Received server response.
       * @param {Object} [options={}] - Configuration options.
       * @param {boolean} [options.shared=true] - Is the cache shared (a public proxy)? `false` for personal browser caches.
       * @param {number} [options.cacheHeuristic=0.1] - Fallback heuristic (age fraction) for cache duration.
       * @param {number} [options.immutableMinTimeToLive=86400000] - Minimum TTL for immutable responses in milliseconds.
       * @param {boolean} [options.ignoreCargoCult=false] - Detect nonsense cache headers, and override them.
       * @param {any} [options._fromObject] - Internal parameter for deserialization. Do not use.
       */
      constructor(req, res, {
        shared,
        cacheHeuristic,
        immutableMinTimeToLive,
        ignoreCargoCult,
        _fromObject
      } = {}) {
        if (_fromObject) {
          this._fromObject(_fromObject);
          return;
        }
        if (!res || !res.headers) {
          throw Error("Response headers missing");
        }
        this._assertRequestHasHeaders(req);
        this._responseTime = this.now();
        this._isShared = shared !== false;
        this._ignoreCargoCult = !!ignoreCargoCult;
        this._cacheHeuristic = void 0 !== cacheHeuristic ? cacheHeuristic : 0.1;
        this._immutableMinTtl = void 0 !== immutableMinTimeToLive ? immutableMinTimeToLive : 24 * 3600 * 1e3;
        this._status = "status" in res ? res.status : 200;
        this._resHeaders = res.headers;
        this._rescc = parseCacheControl(res.headers["cache-control"]);
        this._method = "method" in req ? req.method : "GET";
        this._url = req.url;
        this._host = req.headers.host;
        this._noAuthorization = !req.headers.authorization;
        this._reqHeaders = res.headers.vary ? req.headers : null;
        this._reqcc = parseCacheControl(req.headers["cache-control"]);
        if (this._ignoreCargoCult && "pre-check" in this._rescc && "post-check" in this._rescc) {
          delete this._rescc["pre-check"];
          delete this._rescc["post-check"];
          delete this._rescc["no-cache"];
          delete this._rescc["no-store"];
          delete this._rescc["must-revalidate"];
          this._resHeaders = Object.assign({}, this._resHeaders, {
            "cache-control": formatCacheControl(this._rescc)
          });
          delete this._resHeaders.expires;
          delete this._resHeaders.pragma;
        }
        if (res.headers["cache-control"] == null && /no-cache/.test(res.headers.pragma)) {
          this._rescc["no-cache"] = true;
        }
      }
      /**
       * You can monkey-patch it for testing.
       * @returns {number} Current time in milliseconds.
       */
      now() {
        return Date.now();
      }
      /**
       * Determines if the response is storable in a cache.
       * @returns {boolean} `false` if can never be cached.
       */
      storable() {
        return !!(!this._reqcc["no-store"] && // A cache MUST NOT store a response to any request, unless:
        // The request method is understood by the cache and defined as being cacheable, and
        ("GET" === this._method || "HEAD" === this._method || "POST" === this._method && this._hasExplicitExpiration()) && // the response status code is understood by the cache, and
        understoodStatuses.has(this._status) && // the "no-store" cache directive does not appear in request or response header fields, and
        !this._rescc["no-store"] && // the "private" response directive does not appear in the response, if the cache is shared, and
        (!this._isShared || !this._rescc.private) && // the Authorization header field does not appear in the request, if the cache is shared,
        (!this._isShared || this._noAuthorization || this._allowsStoringAuthenticated()) && // the response either:
        // contains an Expires header field, or
        (this._resHeaders.expires || // contains a max-age response directive, or
        // contains a s-maxage response directive and the cache is shared, or
        // contains a public response directive.
        this._rescc["max-age"] || this._isShared && this._rescc["s-maxage"] || this._rescc.public || // has a status code that is defined as cacheable by default
        statusCodeCacheableByDefault.has(this._status)));
      }
      /**
       * @returns {boolean} true if expiration is explicitly defined.
       */
      _hasExplicitExpiration() {
        return !!(this._isShared && this._rescc["s-maxage"] || this._rescc["max-age"] || this._resHeaders.expires);
      }
      /**
       * @param {HttpRequest} req - a request
       * @throws {Error} if the headers are missing.
       */
      _assertRequestHasHeaders(req) {
        if (!req || !req.headers) {
          throw Error("Request headers missing");
        }
      }
      /**
       * Checks if the request matches the cache and can be satisfied from the cache immediately,
       * without having to make a request to the server.
       *
       * This doesn't support `stale-while-revalidate`. See `evaluateRequest()` for a more complete solution.
       *
       * @param {HttpRequest} req - The new incoming HTTP request.
       * @returns {boolean} `true`` if the cached response used to construct this cache policy satisfies the request without revalidation.
       */
      satisfiesWithoutRevalidation(req) {
        const result = this.evaluateRequest(req);
        return !result.revalidation;
      }
      /**
       * @param {{headers: Record<string, string>, synchronous: boolean}|undefined} revalidation - Revalidation information, if any.
       * @returns {{response: {headers: Record<string, string>}, revalidation: {headers: Record<string, string>, synchronous: boolean}|undefined}} An object with a cached response headers and revalidation info.
       */
      _evaluateRequestHitResult(revalidation) {
        return {
          response: {
            headers: this.responseHeaders()
          },
          revalidation
        };
      }
      /**
       * @param {HttpRequest} request - new incoming
       * @param {boolean} synchronous - whether revalidation must be synchronous (not s-w-r).
       * @returns {{headers: Record<string, string>, synchronous: boolean}} An object with revalidation headers and a synchronous flag.
       */
      _evaluateRequestRevalidation(request, synchronous) {
        return {
          synchronous,
          headers: this.revalidationHeaders(request)
        };
      }
      /**
       * @param {HttpRequest} request - new incoming
       * @returns {{response: undefined, revalidation: {headers: Record<string, string>, synchronous: boolean}}} An object indicating no cached response and revalidation details.
       */
      _evaluateRequestMissResult(request) {
        return {
          response: void 0,
          revalidation: this._evaluateRequestRevalidation(request, true)
        };
      }
      /**
       * Checks if the given request matches this cache entry, and how the cache can be used to satisfy it. Returns an object with:
       *
       * ```
       * {
       *     // If defined, you must send a request to the server.
       *     revalidation: {
       *         headers: {}, // HTTP headers to use when sending the revalidation response
       *         // If true, you MUST wait for a response from the server before using the cache
       *         // If false, this is stale-while-revalidate. The cache is stale, but you can use it while you update it asynchronously.
       *         synchronous: bool,
       *     },
       *     // If defined, you can use this cached response.
       *     response: {
       *         headers: {}, // Updated cached HTTP headers you must use when responding to the client
       *     },
       * }
       * ```
       * @param {HttpRequest} req - new incoming HTTP request
       * @returns {{response: {headers: Record<string, string>}|undefined, revalidation: {headers: Record<string, string>, synchronous: boolean}|undefined}} An object containing keys:
       *   - revalidation: { headers: Record<string, string>, synchronous: boolean } Set if you should send this to the origin server
       *   - response: { headers: Record<string, string> } Set if you can respond to the client with these cached headers
       */
      evaluateRequest(req) {
        this._assertRequestHasHeaders(req);
        if (this._rescc["must-revalidate"]) {
          return this._evaluateRequestMissResult(req);
        }
        if (!this._requestMatches(req, false)) {
          return this._evaluateRequestMissResult(req);
        }
        const requestCC = parseCacheControl(req.headers["cache-control"]);
        if (requestCC["no-cache"] || /no-cache/.test(req.headers.pragma)) {
          return this._evaluateRequestMissResult(req);
        }
        if (requestCC["max-age"] && this.age() > toNumberOrZero(requestCC["max-age"])) {
          return this._evaluateRequestMissResult(req);
        }
        if (requestCC["min-fresh"] && this.maxAge() - this.age() < toNumberOrZero(requestCC["min-fresh"])) {
          return this._evaluateRequestMissResult(req);
        }
        if (this.stale()) {
          const allowsStaleWithoutRevalidation = "max-stale" in requestCC && (true === requestCC["max-stale"] || requestCC["max-stale"] > this.age() - this.maxAge());
          if (allowsStaleWithoutRevalidation) {
            return this._evaluateRequestHitResult(void 0);
          }
          if (this.useStaleWhileRevalidate()) {
            return this._evaluateRequestHitResult(this._evaluateRequestRevalidation(req, false));
          }
          return this._evaluateRequestMissResult(req);
        }
        return this._evaluateRequestHitResult(void 0);
      }
      /**
       * @param {HttpRequest} req - check if this is for the same cache entry
       * @param {boolean} allowHeadMethod - allow a HEAD method to match.
       * @returns {boolean} `true` if the request matches.
       */
      _requestMatches(req, allowHeadMethod) {
        return !!((!this._url || this._url === req.url) && this._host === req.headers.host && // the request method associated with the stored response allows it to be used for the presented request, and
        (!req.method || this._method === req.method || allowHeadMethod && "HEAD" === req.method) && // selecting header fields nominated by the stored response (if any) match those presented, and
        this._varyMatches(req));
      }
      /**
       * Determines whether storing authenticated responses is allowed.
       * @returns {boolean} `true` if allowed.
       */
      _allowsStoringAuthenticated() {
        return !!(this._rescc["must-revalidate"] || this._rescc.public || this._rescc["s-maxage"]);
      }
      /**
       * Checks whether the Vary header in the response matches the new request.
       * @param {HttpRequest} req - incoming HTTP request
       * @returns {boolean} `true` if the vary headers match.
       */
      _varyMatches(req) {
        if (!this._resHeaders.vary) {
          return true;
        }
        if (this._resHeaders.vary === "*") {
          return false;
        }
        const fields = this._resHeaders.vary.trim().toLowerCase().split(/\s*,\s*/);
        for (const name of fields) {
          if (req.headers[name] !== this._reqHeaders[name]) return false;
        }
        return true;
      }
      /**
       * Creates a copy of the given headers without any hop-by-hop headers.
       * @param {Record<string, string>} inHeaders - old headers from the cached response
       * @returns {Record<string, string>} A new headers object without hop-by-hop headers.
       */
      _copyWithoutHopByHopHeaders(inHeaders) {
        const headers = {};
        for (const name in inHeaders) {
          if (hopByHopHeaders[name]) continue;
          headers[name] = inHeaders[name];
        }
        if (inHeaders.connection) {
          const tokens = inHeaders.connection.trim().split(/\s*,\s*/);
          for (const name of tokens) {
            delete headers[name];
          }
        }
        if (headers.warning) {
          const warnings = headers.warning.split(/,/).filter((warning) => {
            return !/^\s*1[0-9][0-9]/.test(warning);
          });
          if (!warnings.length) {
            delete headers.warning;
          } else {
            headers.warning = warnings.join(",").trim();
          }
        }
        return headers;
      }
      /**
       * Returns the response headers adjusted for serving the cached response.
       * Removes hop-by-hop headers and updates the Age and Date headers.
       * @returns {Record<string, string>} The adjusted response headers.
       */
      responseHeaders() {
        const headers = this._copyWithoutHopByHopHeaders(this._resHeaders);
        const age = this.age();
        if (age > 3600 * 24 && !this._hasExplicitExpiration() && this.maxAge() > 3600 * 24) {
          headers.warning = (headers.warning ? `${headers.warning}, ` : "") + '113 - "rfc7234 5.5.4"';
        }
        headers.age = `${Math.round(age)}`;
        headers.date = new Date(this.now()).toUTCString();
        return headers;
      }
      /**
       * Returns the Date header value from the response or the current time if invalid.
       * @returns {number} Timestamp (in milliseconds) representing the Date header or response time.
       */
      date() {
        const serverDate = Date.parse(this._resHeaders.date);
        if (isFinite(serverDate)) {
          return serverDate;
        }
        return this._responseTime;
      }
      /**
       * Value of the Age header, in seconds, updated for the current time.
       * May be fractional.
       * @returns {number} The age in seconds.
       */
      age() {
        let age = this._ageValue();
        const residentTime = (this.now() - this._responseTime) / 1e3;
        return age + residentTime;
      }
      /**
       * @returns {number} The Age header value as a number.
       */
      _ageValue() {
        return toNumberOrZero(this._resHeaders.age);
      }
      /**
       * Possibly outdated value of applicable max-age (or heuristic equivalent) in seconds.
       * This counts since response's `Date`.
       *
       * For an up-to-date value, see `timeToLive()`.
       *
       * Returns the maximum age (freshness lifetime) of the response in seconds.
       * @returns {number} The max-age value in seconds.
       */
      maxAge() {
        if (!this.storable() || this._rescc["no-cache"]) {
          return 0;
        }
        if (this._isShared && (this._resHeaders["set-cookie"] && !this._rescc.public && !this._rescc.immutable)) {
          return 0;
        }
        if (this._resHeaders.vary === "*") {
          return 0;
        }
        if (this._isShared) {
          if (this._rescc["proxy-revalidate"]) {
            return 0;
          }
          if (this._rescc["s-maxage"]) {
            return toNumberOrZero(this._rescc["s-maxage"]);
          }
        }
        if (this._rescc["max-age"]) {
          return toNumberOrZero(this._rescc["max-age"]);
        }
        const defaultMinTtl = this._rescc.immutable ? this._immutableMinTtl : 0;
        const serverDate = this.date();
        if (this._resHeaders.expires) {
          const expires = Date.parse(this._resHeaders.expires);
          if (Number.isNaN(expires) || expires < serverDate) {
            return 0;
          }
          return Math.max(defaultMinTtl, (expires - serverDate) / 1e3);
        }
        if (this._resHeaders["last-modified"]) {
          const lastModified = Date.parse(this._resHeaders["last-modified"]);
          if (isFinite(lastModified) && serverDate > lastModified) {
            return Math.max(
              defaultMinTtl,
              (serverDate - lastModified) / 1e3 * this._cacheHeuristic
            );
          }
        }
        return defaultMinTtl;
      }
      /**
       * Remaining time this cache entry may be useful for, in *milliseconds*.
       * You can use this as an expiration time for your cache storage.
       *
       * Prefer this method over `maxAge()`, because it includes other factors like `age` and `stale-while-revalidate`.
       * @returns {number} Time-to-live in milliseconds.
       */
      timeToLive() {
        const age = this.maxAge() - this.age();
        const staleIfErrorAge = age + toNumberOrZero(this._rescc["stale-if-error"]);
        const staleWhileRevalidateAge = age + toNumberOrZero(this._rescc["stale-while-revalidate"]);
        return Math.round(Math.max(0, age, staleIfErrorAge, staleWhileRevalidateAge) * 1e3);
      }
      /**
       * If true, this cache entry is past its expiration date.
       * Note that stale cache may be useful sometimes, see `evaluateRequest()`.
       * @returns {boolean} `false` doesn't mean it's fresh nor usable
       */
      stale() {
        return this.maxAge() <= this.age();
      }
      /**
       * @returns {boolean} `true` if `stale-if-error` condition allows use of a stale response.
       */
      _useStaleIfError() {
        return this.maxAge() + toNumberOrZero(this._rescc["stale-if-error"]) > this.age();
      }
      /** See `evaluateRequest()` for a more complete solution
       * @returns {boolean} `true` if `stale-while-revalidate` is currently allowed.
       */
      useStaleWhileRevalidate() {
        const swr = toNumberOrZero(this._rescc["stale-while-revalidate"]);
        return swr > 0 && this.maxAge() + swr > this.age();
      }
      /**
       * Creates a `CachePolicy` instance from a serialized object.
       * @param {Object} obj - The serialized object.
       * @returns {CachePolicy} A new CachePolicy instance.
       */
      static fromObject(obj) {
        return new this(void 0, void 0, { _fromObject: obj });
      }
      /**
       * @param {any} obj - The serialized object.
       * @throws {Error} If already initialized or if the object is invalid.
       */
      _fromObject(obj) {
        if (this._responseTime) throw Error("Reinitialized");
        if (!obj || obj.v !== 1) throw Error("Invalid serialization");
        this._responseTime = obj.t;
        this._isShared = obj.sh;
        this._cacheHeuristic = obj.ch;
        this._immutableMinTtl = obj.imm !== void 0 ? obj.imm : 24 * 3600 * 1e3;
        this._ignoreCargoCult = !!obj.icc;
        this._status = obj.st;
        this._resHeaders = obj.resh;
        this._rescc = obj.rescc;
        this._method = obj.m;
        this._url = obj.u;
        this._host = obj.h;
        this._noAuthorization = obj.a;
        this._reqHeaders = obj.reqh;
        this._reqcc = obj.reqcc;
      }
      /**
       * Serializes the `CachePolicy` instance into a JSON-serializable object.
       * @returns {Object} The serialized object.
       */
      toObject() {
        return {
          v: 1,
          t: this._responseTime,
          sh: this._isShared,
          ch: this._cacheHeuristic,
          imm: this._immutableMinTtl,
          icc: this._ignoreCargoCult,
          st: this._status,
          resh: this._resHeaders,
          rescc: this._rescc,
          m: this._method,
          u: this._url,
          h: this._host,
          a: this._noAuthorization,
          reqh: this._reqHeaders,
          reqcc: this._reqcc
        };
      }
      /**
       * Headers for sending to the origin server to revalidate stale response.
       * Allows server to return 304 to allow reuse of the previous response.
       *
       * Hop by hop headers are always stripped.
       * Revalidation headers may be added or removed, depending on request.
       * @param {HttpRequest} incomingReq - The incoming HTTP request.
       * @returns {Record<string, string>} The headers for the revalidation request.
       */
      revalidationHeaders(incomingReq) {
        this._assertRequestHasHeaders(incomingReq);
        const headers = this._copyWithoutHopByHopHeaders(incomingReq.headers);
        delete headers["if-range"];
        if (!this._requestMatches(incomingReq, true) || !this.storable()) {
          delete headers["if-none-match"];
          delete headers["if-modified-since"];
          return headers;
        }
        if (this._resHeaders.etag) {
          headers["if-none-match"] = headers["if-none-match"] ? `${headers["if-none-match"]}, ${this._resHeaders.etag}` : this._resHeaders.etag;
        }
        const forbidsWeakValidators = headers["accept-ranges"] || headers["if-match"] || headers["if-unmodified-since"] || this._method && this._method != "GET";
        if (forbidsWeakValidators) {
          delete headers["if-modified-since"];
          if (headers["if-none-match"]) {
            const etags = headers["if-none-match"].split(/,/).filter((etag) => {
              return !/^\s*W\//.test(etag);
            });
            if (!etags.length) {
              delete headers["if-none-match"];
            } else {
              headers["if-none-match"] = etags.join(",").trim();
            }
          }
        } else if (this._resHeaders["last-modified"] && !headers["if-modified-since"]) {
          headers["if-modified-since"] = this._resHeaders["last-modified"];
        }
        return headers;
      }
      /**
       * Creates new CachePolicy with information combined from the previews response,
       * and the new revalidation response.
       *
       * Returns {policy, modified} where modified is a boolean indicating
       * whether the response body has been modified, and old cached body can't be used.
       *
       * @param {HttpRequest} request - The latest HTTP request asking for the cached entry.
       * @param {HttpResponse} response - The latest revalidation HTTP response from the origin server.
       * @returns {{policy: CachePolicy, modified: boolean, matches: boolean}} The updated policy and modification status.
       * @throws {Error} If the response headers are missing.
       */
      revalidatedPolicy(request, response) {
        this._assertRequestHasHeaders(request);
        if (this._useStaleIfError() && isErrorResponse(response)) {
          return {
            policy: this,
            modified: false,
            matches: true
          };
        }
        if (!response || !response.headers) {
          throw Error("Response headers missing");
        }
        let matches = false;
        if (response.status !== void 0 && response.status != 304) {
          matches = false;
        } else if (response.headers.etag && !/^\s*W\//.test(response.headers.etag)) {
          matches = this._resHeaders.etag && this._resHeaders.etag.replace(/^\s*W\//, "") === response.headers.etag;
        } else if (this._resHeaders.etag && response.headers.etag) {
          matches = this._resHeaders.etag.replace(/^\s*W\//, "") === response.headers.etag.replace(/^\s*W\//, "");
        } else if (this._resHeaders["last-modified"]) {
          matches = this._resHeaders["last-modified"] === response.headers["last-modified"];
        } else {
          if (!this._resHeaders.etag && !this._resHeaders["last-modified"] && !response.headers.etag && !response.headers["last-modified"]) {
            matches = true;
          }
        }
        const optionsCopy = {
          shared: this._isShared,
          cacheHeuristic: this._cacheHeuristic,
          immutableMinTimeToLive: this._immutableMinTtl,
          ignoreCargoCult: this._ignoreCargoCult
        };
        if (!matches) {
          return {
            policy: new this.constructor(request, response, optionsCopy),
            // Client receiving 304 without body, even if it's invalid/mismatched has no option
            // but to reuse a cached body. We don't have a good way to tell clients to do
            // error recovery in such case.
            modified: response.status != 304,
            matches: false
          };
        }
        const headers = {};
        for (const k in this._resHeaders) {
          headers[k] = k in response.headers && !excludedFromRevalidationUpdate[k] ? response.headers[k] : this._resHeaders[k];
        }
        const newResponse = Object.assign({}, response, {
          status: this._status,
          method: this._method,
          headers
        });
        return {
          policy: new this.constructor(request, newResponse, optionsCopy),
          modified: false,
          matches: true
        };
      }
    };
  }
});

// node_modules/quick-lru/index.js
var require_quick_lru = __commonJS({
  "node_modules/quick-lru/index.js"(exports2, module2) {
    "use strict";
    var QuickLRU = class {
      constructor(options = {}) {
        if (!(options.maxSize && options.maxSize > 0)) {
          throw new TypeError("`maxSize` must be a number greater than 0");
        }
        this.maxSize = options.maxSize;
        this.onEviction = options.onEviction;
        this.cache = /* @__PURE__ */ new Map();
        this.oldCache = /* @__PURE__ */ new Map();
        this._size = 0;
      }
      _set(key, value) {
        this.cache.set(key, value);
        this._size++;
        if (this._size >= this.maxSize) {
          this._size = 0;
          if (typeof this.onEviction === "function") {
            for (const [key2, value2] of this.oldCache.entries()) {
              this.onEviction(key2, value2);
            }
          }
          this.oldCache = this.cache;
          this.cache = /* @__PURE__ */ new Map();
        }
      }
      get(key) {
        if (this.cache.has(key)) {
          return this.cache.get(key);
        }
        if (this.oldCache.has(key)) {
          const value = this.oldCache.get(key);
          this.oldCache.delete(key);
          this._set(key, value);
          return value;
        }
      }
      set(key, value) {
        if (this.cache.has(key)) {
          this.cache.set(key, value);
        } else {
          this._set(key, value);
        }
        return this;
      }
      has(key) {
        return this.cache.has(key) || this.oldCache.has(key);
      }
      peek(key) {
        if (this.cache.has(key)) {
          return this.cache.get(key);
        }
        if (this.oldCache.has(key)) {
          return this.oldCache.get(key);
        }
      }
      delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
          this._size--;
        }
        return this.oldCache.delete(key) || deleted;
      }
      clear() {
        this.cache.clear();
        this.oldCache.clear();
        this._size = 0;
      }
      *keys() {
        for (const [key] of this) {
          yield key;
        }
      }
      *values() {
        for (const [, value] of this) {
          yield value;
        }
      }
      *[Symbol.iterator]() {
        for (const item of this.cache) {
          yield item;
        }
        for (const item of this.oldCache) {
          const [key] = item;
          if (!this.cache.has(key)) {
            yield item;
          }
        }
      }
      get size() {
        let oldCacheSize = 0;
        for (const key of this.oldCache.keys()) {
          if (!this.cache.has(key)) {
            oldCacheSize++;
          }
        }
        return Math.min(this._size + oldCacheSize, this.maxSize);
      }
    };
    module2.exports = QuickLRU;
  }
});

// node_modules/http2-wrapper/source/utils/delay-async-destroy.js
var require_delay_async_destroy = __commonJS({
  "node_modules/http2-wrapper/source/utils/delay-async-destroy.js"(exports2, module2) {
    "use strict";
    module2.exports = (stream2) => {
      if (stream2.listenerCount("error") !== 0) {
        return stream2;
      }
      stream2.__destroy = stream2._destroy;
      stream2._destroy = (...args) => {
        const callback = args.pop();
        stream2.__destroy(...args, async (error) => {
          await Promise.resolve();
          callback(error);
        });
      };
      const onError = (error) => {
        Promise.resolve().then(() => {
          stream2.emit("error", error);
        });
      };
      stream2.once("error", onError);
      Promise.resolve().then(() => {
        stream2.off("error", onError);
      });
      return stream2;
    };
  }
});

// node_modules/http2-wrapper/source/agent.js
var require_agent = __commonJS({
  "node_modules/http2-wrapper/source/agent.js"(exports2, module2) {
    "use strict";
    var { URL: URL3 } = require("url");
    var EventEmitter3 = require("events");
    var tls = require("tls");
    var http22 = require("http2");
    var QuickLRU = require_quick_lru();
    var delayAsyncDestroy = require_delay_async_destroy();
    var kCurrentStreamCount = Symbol("currentStreamCount");
    var kRequest = Symbol("request");
    var kOriginSet = Symbol("cachedOriginSet");
    var kGracefullyClosing = Symbol("gracefullyClosing");
    var kLength = Symbol("length");
    var nameKeys = [
      // Not an Agent option actually
      "createConnection",
      // `http2.connect()` options
      "maxDeflateDynamicTableSize",
      "maxSettings",
      "maxSessionMemory",
      "maxHeaderListPairs",
      "maxOutstandingPings",
      "maxReservedRemoteStreams",
      "maxSendHeaderBlockLength",
      "paddingStrategy",
      "peerMaxConcurrentStreams",
      "settings",
      // `tls.connect()` source options
      "family",
      "localAddress",
      "rejectUnauthorized",
      // `tls.connect()` secure context options
      "pskCallback",
      "minDHSize",
      // `tls.connect()` destination options
      // - `servername` is automatically validated, skip it
      // - `host` and `port` just describe the destination server,
      "path",
      "socket",
      // `tls.createSecureContext()` options
      "ca",
      "cert",
      "sigalgs",
      "ciphers",
      "clientCertEngine",
      "crl",
      "dhparam",
      "ecdhCurve",
      "honorCipherOrder",
      "key",
      "privateKeyEngine",
      "privateKeyIdentifier",
      "maxVersion",
      "minVersion",
      "pfx",
      "secureOptions",
      "secureProtocol",
      "sessionIdContext",
      "ticketKeys"
    ];
    var getSortedIndex = (array, value, compare) => {
      let low = 0;
      let high = array.length;
      while (low < high) {
        const mid = low + high >>> 1;
        if (compare(array[mid], value)) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      return low;
    };
    var compareSessions = (a2, b) => a2.remoteSettings.maxConcurrentStreams > b.remoteSettings.maxConcurrentStreams;
    var closeCoveredSessions = (where, session) => {
      for (let index = 0; index < where.length; index++) {
        const coveredSession = where[index];
        if (
          // Unfortunately `.every()` returns true for an empty array
          coveredSession[kOriginSet].length > 0 && coveredSession[kOriginSet].length < session[kOriginSet].length && coveredSession[kOriginSet].every((origin) => session[kOriginSet].includes(origin)) && coveredSession[kCurrentStreamCount] + session[kCurrentStreamCount] <= session.remoteSettings.maxConcurrentStreams
        ) {
          gracefullyClose(coveredSession);
        }
      }
    };
    var closeSessionIfCovered = (where, coveredSession) => {
      for (let index = 0; index < where.length; index++) {
        const session = where[index];
        if (coveredSession[kOriginSet].length > 0 && coveredSession[kOriginSet].length < session[kOriginSet].length && coveredSession[kOriginSet].every((origin) => session[kOriginSet].includes(origin)) && coveredSession[kCurrentStreamCount] + session[kCurrentStreamCount] <= session.remoteSettings.maxConcurrentStreams) {
          gracefullyClose(coveredSession);
          return true;
        }
      }
      return false;
    };
    var gracefullyClose = (session) => {
      session[kGracefullyClosing] = true;
      if (session[kCurrentStreamCount] === 0) {
        session.close();
      }
    };
    var Agent = class _Agent extends EventEmitter3 {
      constructor({ timeout = 0, maxSessions = Number.POSITIVE_INFINITY, maxEmptySessions = 10, maxCachedTlsSessions = 100 } = {}) {
        super();
        this.sessions = {};
        this.queue = {};
        this.timeout = timeout;
        this.maxSessions = maxSessions;
        this.maxEmptySessions = maxEmptySessions;
        this._emptySessionCount = 0;
        this._sessionCount = 0;
        this.settings = {
          enablePush: false,
          initialWindowSize: 1024 * 1024 * 32
          // 32MB, see https://github.com/nodejs/node/issues/38426
        };
        this.tlsSessionCache = new QuickLRU({ maxSize: maxCachedTlsSessions });
      }
      get protocol() {
        return "https:";
      }
      normalizeOptions(options) {
        let normalized = "";
        for (let index = 0; index < nameKeys.length; index++) {
          const key = nameKeys[index];
          normalized += ":";
          if (options && options[key] !== void 0) {
            normalized += options[key];
          }
        }
        return normalized;
      }
      _processQueue() {
        if (this._sessionCount >= this.maxSessions) {
          this.closeEmptySessions(this.maxSessions - this._sessionCount + 1);
          return;
        }
        for (const normalizedOptions in this.queue) {
          for (const normalizedOrigin in this.queue[normalizedOptions]) {
            const item = this.queue[normalizedOptions][normalizedOrigin];
            if (!item.completed) {
              item.completed = true;
              item();
            }
          }
        }
      }
      _isBetterSession(thisStreamCount, thatStreamCount) {
        return thisStreamCount > thatStreamCount;
      }
      _accept(session, listeners, normalizedOrigin, options) {
        let index = 0;
        while (index < listeners.length && session[kCurrentStreamCount] < session.remoteSettings.maxConcurrentStreams) {
          listeners[index].resolve(session);
          index++;
        }
        listeners.splice(0, index);
        if (listeners.length > 0) {
          this.getSession(normalizedOrigin, options, listeners);
          listeners.length = 0;
        }
      }
      getSession(origin, options, listeners) {
        return new Promise((resolve, reject) => {
          if (Array.isArray(listeners) && listeners.length > 0) {
            listeners = [...listeners];
            resolve();
          } else {
            listeners = [{ resolve, reject }];
          }
          try {
            if (typeof origin === "string") {
              origin = new URL3(origin);
            } else if (!(origin instanceof URL3)) {
              throw new TypeError("The `origin` argument needs to be a string or an URL object");
            }
            if (options) {
              const { servername } = options;
              const { hostname } = origin;
              if (servername && hostname !== servername) {
                throw new Error(`Origin ${hostname} differs from servername ${servername}`);
              }
            }
          } catch (error) {
            for (let index = 0; index < listeners.length; index++) {
              listeners[index].reject(error);
            }
            return;
          }
          const normalizedOptions = this.normalizeOptions(options);
          const normalizedOrigin = origin.origin;
          if (normalizedOptions in this.sessions) {
            const sessions = this.sessions[normalizedOptions];
            let maxConcurrentStreams = -1;
            let currentStreamsCount = -1;
            let optimalSession;
            for (let index = 0; index < sessions.length; index++) {
              const session = sessions[index];
              const sessionMaxConcurrentStreams = session.remoteSettings.maxConcurrentStreams;
              if (sessionMaxConcurrentStreams < maxConcurrentStreams) {
                break;
              }
              if (!session[kOriginSet].includes(normalizedOrigin)) {
                continue;
              }
              const sessionCurrentStreamsCount = session[kCurrentStreamCount];
              if (sessionCurrentStreamsCount >= sessionMaxConcurrentStreams || session[kGracefullyClosing] || session.destroyed) {
                continue;
              }
              if (!optimalSession) {
                maxConcurrentStreams = sessionMaxConcurrentStreams;
              }
              if (this._isBetterSession(sessionCurrentStreamsCount, currentStreamsCount)) {
                optimalSession = session;
                currentStreamsCount = sessionCurrentStreamsCount;
              }
            }
            if (optimalSession) {
              this._accept(optimalSession, listeners, normalizedOrigin, options);
              return;
            }
          }
          if (normalizedOptions in this.queue) {
            if (normalizedOrigin in this.queue[normalizedOptions]) {
              this.queue[normalizedOptions][normalizedOrigin].listeners.push(...listeners);
              return;
            }
          } else {
            this.queue[normalizedOptions] = {
              [kLength]: 0
            };
          }
          const removeFromQueue = () => {
            if (normalizedOptions in this.queue && this.queue[normalizedOptions][normalizedOrigin] === entry) {
              delete this.queue[normalizedOptions][normalizedOrigin];
              if (--this.queue[normalizedOptions][kLength] === 0) {
                delete this.queue[normalizedOptions];
              }
            }
          };
          const entry = async () => {
            this._sessionCount++;
            const name = `${normalizedOrigin}:${normalizedOptions}`;
            let receivedSettings = false;
            let socket;
            try {
              const computedOptions = { ...options };
              if (computedOptions.settings === void 0) {
                computedOptions.settings = this.settings;
              }
              if (computedOptions.session === void 0) {
                computedOptions.session = this.tlsSessionCache.get(name);
              }
              const createConnection = computedOptions.createConnection || this.createConnection;
              socket = await createConnection.call(this, origin, computedOptions);
              computedOptions.createConnection = () => socket;
              const session = http22.connect(origin, computedOptions);
              session[kCurrentStreamCount] = 0;
              session[kGracefullyClosing] = false;
              const getOriginSet = () => {
                const { socket: socket2 } = session;
                let originSet;
                if (socket2.servername === false) {
                  socket2.servername = socket2.remoteAddress;
                  originSet = session.originSet;
                  socket2.servername = false;
                } else {
                  originSet = session.originSet;
                }
                return originSet;
              };
              const isFree = () => session[kCurrentStreamCount] < session.remoteSettings.maxConcurrentStreams;
              session.socket.once("session", (tlsSession) => {
                this.tlsSessionCache.set(name, tlsSession);
              });
              session.once("error", (error) => {
                for (let index = 0; index < listeners.length; index++) {
                  listeners[index].reject(error);
                }
                this.tlsSessionCache.delete(name);
              });
              session.setTimeout(this.timeout, () => {
                session.destroy();
              });
              session.once("close", () => {
                this._sessionCount--;
                if (receivedSettings) {
                  this._emptySessionCount--;
                  const where = this.sessions[normalizedOptions];
                  if (where.length === 1) {
                    delete this.sessions[normalizedOptions];
                  } else {
                    where.splice(where.indexOf(session), 1);
                  }
                } else {
                  removeFromQueue();
                  const error = new Error("Session closed without receiving a SETTINGS frame");
                  error.code = "HTTP2WRAPPER_NOSETTINGS";
                  for (let index = 0; index < listeners.length; index++) {
                    listeners[index].reject(error);
                  }
                }
                this._processQueue();
              });
              const processListeners = () => {
                const queue = this.queue[normalizedOptions];
                if (!queue) {
                  return;
                }
                const originSet = session[kOriginSet];
                for (let index = 0; index < originSet.length; index++) {
                  const origin2 = originSet[index];
                  if (origin2 in queue) {
                    const { listeners: listeners2, completed } = queue[origin2];
                    let index2 = 0;
                    while (index2 < listeners2.length && isFree()) {
                      listeners2[index2].resolve(session);
                      index2++;
                    }
                    queue[origin2].listeners.splice(0, index2);
                    if (queue[origin2].listeners.length === 0 && !completed) {
                      delete queue[origin2];
                      if (--queue[kLength] === 0) {
                        delete this.queue[normalizedOptions];
                        break;
                      }
                    }
                    if (!isFree()) {
                      break;
                    }
                  }
                }
              };
              session.on("origin", () => {
                session[kOriginSet] = getOriginSet() || [];
                session[kGracefullyClosing] = false;
                closeSessionIfCovered(this.sessions[normalizedOptions], session);
                if (session[kGracefullyClosing] || !isFree()) {
                  return;
                }
                processListeners();
                if (!isFree()) {
                  return;
                }
                closeCoveredSessions(this.sessions[normalizedOptions], session);
              });
              session.once("remoteSettings", () => {
                if (entry.destroyed) {
                  const error = new Error("Agent has been destroyed");
                  for (let index = 0; index < listeners.length; index++) {
                    listeners[index].reject(error);
                  }
                  session.destroy();
                  return;
                }
                if (session.setLocalWindowSize) {
                  session.setLocalWindowSize(1024 * 1024 * 4);
                }
                session[kOriginSet] = getOriginSet() || [];
                if (session.socket.encrypted) {
                  const mainOrigin = session[kOriginSet][0];
                  if (mainOrigin !== normalizedOrigin) {
                    const error = new Error(`Requested origin ${normalizedOrigin} does not match server ${mainOrigin}`);
                    for (let index = 0; index < listeners.length; index++) {
                      listeners[index].reject(error);
                    }
                    session.destroy();
                    return;
                  }
                }
                removeFromQueue();
                {
                  const where = this.sessions;
                  if (normalizedOptions in where) {
                    const sessions = where[normalizedOptions];
                    sessions.splice(getSortedIndex(sessions, session, compareSessions), 0, session);
                  } else {
                    where[normalizedOptions] = [session];
                  }
                }
                receivedSettings = true;
                this._emptySessionCount++;
                this.emit("session", session);
                this._accept(session, listeners, normalizedOrigin, options);
                if (session[kCurrentStreamCount] === 0 && this._emptySessionCount > this.maxEmptySessions) {
                  this.closeEmptySessions(this._emptySessionCount - this.maxEmptySessions);
                }
                session.on("remoteSettings", () => {
                  if (!isFree()) {
                    return;
                  }
                  processListeners();
                  if (!isFree()) {
                    return;
                  }
                  closeCoveredSessions(this.sessions[normalizedOptions], session);
                });
              });
              session[kRequest] = session.request;
              session.request = (headers, streamOptions) => {
                if (session[kGracefullyClosing]) {
                  throw new Error("The session is gracefully closing. No new streams are allowed.");
                }
                const stream2 = session[kRequest](headers, streamOptions);
                session.ref();
                if (session[kCurrentStreamCount]++ === 0) {
                  this._emptySessionCount--;
                }
                stream2.once("close", () => {
                  if (--session[kCurrentStreamCount] === 0) {
                    this._emptySessionCount++;
                    session.unref();
                    if (this._emptySessionCount > this.maxEmptySessions || session[kGracefullyClosing]) {
                      session.close();
                      return;
                    }
                  }
                  if (session.destroyed || session.closed) {
                    return;
                  }
                  if (isFree() && !closeSessionIfCovered(this.sessions[normalizedOptions], session)) {
                    closeCoveredSessions(this.sessions[normalizedOptions], session);
                    processListeners();
                    if (session[kCurrentStreamCount] === 0) {
                      this._processQueue();
                    }
                  }
                });
                return stream2;
              };
            } catch (error) {
              removeFromQueue();
              this._sessionCount--;
              for (let index = 0; index < listeners.length; index++) {
                listeners[index].reject(error);
              }
            }
          };
          entry.listeners = listeners;
          entry.completed = false;
          entry.destroyed = false;
          this.queue[normalizedOptions][normalizedOrigin] = entry;
          this.queue[normalizedOptions][kLength]++;
          this._processQueue();
        });
      }
      request(origin, options, headers, streamOptions) {
        return new Promise((resolve, reject) => {
          this.getSession(origin, options, [{
            reject,
            resolve: (session) => {
              try {
                const stream2 = session.request(headers, streamOptions);
                delayAsyncDestroy(stream2);
                resolve(stream2);
              } catch (error) {
                reject(error);
              }
            }
          }]);
        });
      }
      async createConnection(origin, options) {
        return _Agent.connect(origin, options);
      }
      static connect(origin, options) {
        options.ALPNProtocols = ["h2"];
        const port = origin.port || 443;
        const host = origin.hostname;
        if (typeof options.servername === "undefined") {
          options.servername = host;
        }
        const socket = tls.connect(port, host, options);
        if (options.socket) {
          socket._peername = {
            family: void 0,
            address: void 0,
            port
          };
        }
        return socket;
      }
      closeEmptySessions(maxCount = Number.POSITIVE_INFINITY) {
        let closedCount = 0;
        const { sessions } = this;
        for (const key in sessions) {
          const thisSessions = sessions[key];
          for (let index = 0; index < thisSessions.length; index++) {
            const session = thisSessions[index];
            if (session[kCurrentStreamCount] === 0) {
              closedCount++;
              session.close();
              if (closedCount >= maxCount) {
                return closedCount;
              }
            }
          }
        }
        return closedCount;
      }
      destroy(reason) {
        const { sessions, queue } = this;
        for (const key in sessions) {
          const thisSessions = sessions[key];
          for (let index = 0; index < thisSessions.length; index++) {
            thisSessions[index].destroy(reason);
          }
        }
        for (const normalizedOptions in queue) {
          const entries2 = queue[normalizedOptions];
          for (const normalizedOrigin in entries2) {
            entries2[normalizedOrigin].destroyed = true;
          }
        }
        this.queue = {};
        this.tlsSessionCache.clear();
      }
      get emptySessionCount() {
        return this._emptySessionCount;
      }
      get pendingSessionCount() {
        return this._sessionCount - this._emptySessionCount;
      }
      get sessionCount() {
        return this._sessionCount;
      }
    };
    Agent.kCurrentStreamCount = kCurrentStreamCount;
    Agent.kGracefullyClosing = kGracefullyClosing;
    module2.exports = {
      Agent,
      globalAgent: new Agent()
    };
  }
});

// node_modules/http2-wrapper/source/incoming-message.js
var require_incoming_message = __commonJS({
  "node_modules/http2-wrapper/source/incoming-message.js"(exports2, module2) {
    "use strict";
    var { Readable } = require("stream");
    var IncomingMessage = class extends Readable {
      constructor(socket, highWaterMark) {
        super({
          emitClose: false,
          autoDestroy: true,
          highWaterMark
        });
        this.statusCode = null;
        this.statusMessage = "";
        this.httpVersion = "2.0";
        this.httpVersionMajor = 2;
        this.httpVersionMinor = 0;
        this.headers = {};
        this.trailers = {};
        this.req = null;
        this.aborted = false;
        this.complete = false;
        this.upgrade = null;
        this.rawHeaders = [];
        this.rawTrailers = [];
        this.socket = socket;
        this._dumped = false;
      }
      get connection() {
        return this.socket;
      }
      set connection(value) {
        this.socket = value;
      }
      _destroy(error, callback) {
        if (!this.readableEnded) {
          this.aborted = true;
        }
        callback();
        this.req._request.destroy(error);
      }
      setTimeout(ms, callback) {
        this.req.setTimeout(ms, callback);
        return this;
      }
      _dump() {
        if (!this._dumped) {
          this._dumped = true;
          this.removeAllListeners("data");
          this.resume();
        }
      }
      _read() {
        if (this.req) {
          this.req._request.resume();
        }
      }
    };
    module2.exports = IncomingMessage;
  }
});

// node_modules/http2-wrapper/source/utils/proxy-events.js
var require_proxy_events = __commonJS({
  "node_modules/http2-wrapper/source/utils/proxy-events.js"(exports2, module2) {
    "use strict";
    module2.exports = (from, to, events) => {
      for (const event of events) {
        from.on(event, (...args) => to.emit(event, ...args));
      }
    };
  }
});

// node_modules/http2-wrapper/source/utils/errors.js
var require_errors = __commonJS({
  "node_modules/http2-wrapper/source/utils/errors.js"(exports2, module2) {
    "use strict";
    var makeError = (Base, key, getMessage) => {
      module2.exports[key] = class NodeError extends Base {
        constructor(...args) {
          super(typeof getMessage === "string" ? getMessage : getMessage(args));
          this.name = `${super.name} [${key}]`;
          this.code = key;
        }
      };
    };
    makeError(TypeError, "ERR_INVALID_ARG_TYPE", (args) => {
      const type = args[0].includes(".") ? "property" : "argument";
      let valid = args[1];
      const isManyTypes = Array.isArray(valid);
      if (isManyTypes) {
        valid = `${valid.slice(0, -1).join(", ")} or ${valid.slice(-1)}`;
      }
      return `The "${args[0]}" ${type} must be ${isManyTypes ? "one of" : "of"} type ${valid}. Received ${typeof args[2]}`;
    });
    makeError(
      TypeError,
      "ERR_INVALID_PROTOCOL",
      (args) => `Protocol "${args[0]}" not supported. Expected "${args[1]}"`
    );
    makeError(
      Error,
      "ERR_HTTP_HEADERS_SENT",
      (args) => `Cannot ${args[0]} headers after they are sent to the client`
    );
    makeError(
      TypeError,
      "ERR_INVALID_HTTP_TOKEN",
      (args) => `${args[0]} must be a valid HTTP token [${args[1]}]`
    );
    makeError(
      TypeError,
      "ERR_HTTP_INVALID_HEADER_VALUE",
      (args) => `Invalid value "${args[0]} for header "${args[1]}"`
    );
    makeError(
      TypeError,
      "ERR_INVALID_CHAR",
      (args) => `Invalid character in ${args[0]} [${args[1]}]`
    );
    makeError(
      Error,
      "ERR_HTTP2_NO_SOCKET_MANIPULATION",
      "HTTP/2 sockets should not be directly manipulated (e.g. read and written)"
    );
  }
});

// node_modules/http2-wrapper/source/utils/is-request-pseudo-header.js
var require_is_request_pseudo_header = __commonJS({
  "node_modules/http2-wrapper/source/utils/is-request-pseudo-header.js"(exports2, module2) {
    "use strict";
    module2.exports = (header) => {
      switch (header) {
        case ":method":
        case ":scheme":
        case ":authority":
        case ":path":
          return true;
        default:
          return false;
      }
    };
  }
});

// node_modules/http2-wrapper/source/utils/validate-header-name.js
var require_validate_header_name = __commonJS({
  "node_modules/http2-wrapper/source/utils/validate-header-name.js"(exports2, module2) {
    "use strict";
    var { ERR_INVALID_HTTP_TOKEN } = require_errors();
    var isRequestPseudoHeader = require_is_request_pseudo_header();
    var isValidHttpToken = /^[\^`\-\w!#$%&*+.|~]+$/;
    module2.exports = (name) => {
      if (typeof name !== "string" || !isValidHttpToken.test(name) && !isRequestPseudoHeader(name)) {
        throw new ERR_INVALID_HTTP_TOKEN("Header name", name);
      }
    };
  }
});

// node_modules/http2-wrapper/source/utils/validate-header-value.js
var require_validate_header_value = __commonJS({
  "node_modules/http2-wrapper/source/utils/validate-header-value.js"(exports2, module2) {
    "use strict";
    var {
      ERR_HTTP_INVALID_HEADER_VALUE,
      ERR_INVALID_CHAR
    } = require_errors();
    var isInvalidHeaderValue = /[^\t\u0020-\u007E\u0080-\u00FF]/;
    module2.exports = (name, value) => {
      if (typeof value === "undefined") {
        throw new ERR_HTTP_INVALID_HEADER_VALUE(value, name);
      }
      if (isInvalidHeaderValue.test(value)) {
        throw new ERR_INVALID_CHAR("header content", name);
      }
    };
  }
});

// node_modules/http2-wrapper/source/utils/proxy-socket-handler.js
var require_proxy_socket_handler = __commonJS({
  "node_modules/http2-wrapper/source/utils/proxy-socket-handler.js"(exports2, module2) {
    "use strict";
    var { ERR_HTTP2_NO_SOCKET_MANIPULATION } = require_errors();
    var proxySocketHandler = {
      has(stream2, property) {
        const reference = stream2.session === void 0 ? stream2 : stream2.session.socket;
        return property in stream2 || property in reference;
      },
      get(stream2, property) {
        switch (property) {
          case "on":
          case "once":
          case "end":
          case "emit":
          case "destroy":
            return stream2[property].bind(stream2);
          case "writable":
          case "destroyed":
            return stream2[property];
          case "readable":
            if (stream2.destroyed) {
              return false;
            }
            return stream2.readable;
          case "setTimeout": {
            const { session } = stream2;
            if (session !== void 0) {
              return session.setTimeout.bind(session);
            }
            return stream2.setTimeout.bind(stream2);
          }
          case "write":
          case "read":
          case "pause":
          case "resume":
            throw new ERR_HTTP2_NO_SOCKET_MANIPULATION();
          default: {
            const reference = stream2.session === void 0 ? stream2 : stream2.session.socket;
            const value = reference[property];
            return typeof value === "function" ? value.bind(reference) : value;
          }
        }
      },
      getPrototypeOf(stream2) {
        if (stream2.session !== void 0) {
          return Reflect.getPrototypeOf(stream2.session.socket);
        }
        return Reflect.getPrototypeOf(stream2);
      },
      set(stream2, property, value) {
        switch (property) {
          case "writable":
          case "readable":
          case "destroyed":
          case "on":
          case "once":
          case "end":
          case "emit":
          case "destroy":
            stream2[property] = value;
            return true;
          case "setTimeout": {
            const { session } = stream2;
            if (session === void 0) {
              stream2.setTimeout = value;
            } else {
              session.setTimeout = value;
            }
            return true;
          }
          case "write":
          case "read":
          case "pause":
          case "resume":
            throw new ERR_HTTP2_NO_SOCKET_MANIPULATION();
          default: {
            const reference = stream2.session === void 0 ? stream2 : stream2.session.socket;
            reference[property] = value;
            return true;
          }
        }
      }
    };
    module2.exports = proxySocketHandler;
  }
});

// node_modules/http2-wrapper/source/client-request.js
var require_client_request = __commonJS({
  "node_modules/http2-wrapper/source/client-request.js"(exports2, module2) {
    "use strict";
    var { URL: URL3, urlToHttpOptions } = require("url");
    var http22 = require("http2");
    var { Writable } = require("stream");
    var { Agent, globalAgent } = require_agent();
    var IncomingMessage = require_incoming_message();
    var proxyEvents2 = require_proxy_events();
    var {
      ERR_INVALID_ARG_TYPE,
      ERR_INVALID_PROTOCOL,
      ERR_HTTP_HEADERS_SENT
    } = require_errors();
    var validateHeaderName = require_validate_header_name();
    var validateHeaderValue = require_validate_header_value();
    var proxySocketHandler = require_proxy_socket_handler();
    var {
      HTTP2_HEADER_STATUS,
      HTTP2_HEADER_METHOD,
      HTTP2_HEADER_PATH,
      HTTP2_HEADER_AUTHORITY,
      HTTP2_METHOD_CONNECT
    } = http22.constants;
    var kHeaders = Symbol("headers");
    var kOrigin = Symbol("origin");
    var kSession = Symbol("session");
    var kOptions = Symbol("options");
    var kFlushedHeaders = Symbol("flushedHeaders");
    var kJobs = Symbol("jobs");
    var kPendingAgentPromise = Symbol("pendingAgentPromise");
    var ClientRequest = class extends Writable {
      constructor(input, options, callback) {
        super({
          autoDestroy: false,
          emitClose: false
        });
        if (typeof input === "string") {
          input = urlToHttpOptions(new URL3(input));
        } else if (input instanceof URL3) {
          input = urlToHttpOptions(input);
        } else {
          input = { ...input };
        }
        if (typeof options === "function" || options === void 0) {
          callback = options;
          options = input;
        } else {
          options = Object.assign(input, options);
        }
        if (options.h2session) {
          this[kSession] = options.h2session;
          if (this[kSession].destroyed) {
            throw new Error("The session has been closed already");
          }
          this.protocol = this[kSession].socket.encrypted ? "https:" : "http:";
        } else if (options.agent === false) {
          this.agent = new Agent({ maxEmptySessions: 0 });
        } else if (typeof options.agent === "undefined" || options.agent === null) {
          this.agent = globalAgent;
        } else if (typeof options.agent.request === "function") {
          this.agent = options.agent;
        } else {
          throw new ERR_INVALID_ARG_TYPE("options.agent", ["http2wrapper.Agent-like Object", "undefined", "false"], options.agent);
        }
        if (this.agent) {
          this.protocol = this.agent.protocol;
        }
        if (options.protocol && options.protocol !== this.protocol) {
          throw new ERR_INVALID_PROTOCOL(options.protocol, this.protocol);
        }
        if (!options.port) {
          options.port = options.defaultPort || this.agent && this.agent.defaultPort || 443;
        }
        options.host = options.hostname || options.host || "localhost";
        delete options.hostname;
        const { timeout } = options;
        options.timeout = void 0;
        this[kHeaders] = /* @__PURE__ */ Object.create(null);
        this[kJobs] = [];
        this[kPendingAgentPromise] = void 0;
        this.socket = null;
        this.connection = null;
        this.method = options.method || "GET";
        if (!(this.method === "CONNECT" && (options.path === "/" || options.path === void 0))) {
          this.path = options.path;
        }
        this.res = null;
        this.aborted = false;
        this.reusedSocket = false;
        const { headers } = options;
        if (headers) {
          for (const header in headers) {
            this.setHeader(header, headers[header]);
          }
        }
        if (options.auth && !("authorization" in this[kHeaders])) {
          this[kHeaders].authorization = "Basic " + Buffer.from(options.auth).toString("base64");
        }
        options.session = options.tlsSession;
        options.path = options.socketPath;
        this[kOptions] = options;
        this[kOrigin] = new URL3(`${this.protocol}//${options.servername || options.host}:${options.port}`);
        const reuseSocket = options._reuseSocket;
        if (reuseSocket) {
          options.createConnection = (...args) => {
            if (reuseSocket.destroyed) {
              return this.agent.createConnection(...args);
            }
            return reuseSocket;
          };
          this.agent.getSession(this[kOrigin], this[kOptions]).catch(() => {
          });
        }
        if (timeout) {
          this.setTimeout(timeout);
        }
        if (callback) {
          this.once("response", callback);
        }
        this[kFlushedHeaders] = false;
      }
      get method() {
        return this[kHeaders][HTTP2_HEADER_METHOD];
      }
      set method(value) {
        if (value) {
          this[kHeaders][HTTP2_HEADER_METHOD] = value.toUpperCase();
        }
      }
      get path() {
        const header = this.method === "CONNECT" ? HTTP2_HEADER_AUTHORITY : HTTP2_HEADER_PATH;
        return this[kHeaders][header];
      }
      set path(value) {
        if (value) {
          const header = this.method === "CONNECT" ? HTTP2_HEADER_AUTHORITY : HTTP2_HEADER_PATH;
          this[kHeaders][header] = value;
        }
      }
      get host() {
        return this[kOrigin].hostname;
      }
      set host(_value) {
      }
      get _mustNotHaveABody() {
        return this.method === "GET" || this.method === "HEAD" || this.method === "DELETE";
      }
      _write(chunk2, encoding, callback) {
        if (this._mustNotHaveABody) {
          callback(new Error("The GET, HEAD and DELETE methods must NOT have a body"));
          return;
        }
        this.flushHeaders();
        const callWrite = () => this._request.write(chunk2, encoding, callback);
        if (this._request) {
          callWrite();
        } else {
          this[kJobs].push(callWrite);
        }
      }
      _final(callback) {
        this.flushHeaders();
        const callEnd = () => {
          if (this._mustNotHaveABody || this.method === "CONNECT") {
            callback();
            return;
          }
          this._request.end(callback);
        };
        if (this._request) {
          callEnd();
        } else {
          this[kJobs].push(callEnd);
        }
      }
      abort() {
        if (this.res && this.res.complete) {
          return;
        }
        if (!this.aborted) {
          process.nextTick(() => this.emit("abort"));
        }
        this.aborted = true;
        this.destroy();
      }
      async _destroy(error, callback) {
        if (this.res) {
          this.res._dump();
        }
        if (this._request) {
          this._request.destroy();
        } else {
          process.nextTick(() => {
            this.emit("close");
          });
        }
        try {
          await this[kPendingAgentPromise];
        } catch (internalError) {
          if (this.aborted) {
            error = internalError;
          }
        }
        callback(error);
      }
      async flushHeaders() {
        if (this[kFlushedHeaders] || this.destroyed) {
          return;
        }
        this[kFlushedHeaders] = true;
        const isConnectMethod = this.method === HTTP2_METHOD_CONNECT;
        const onStream = (stream2) => {
          this._request = stream2;
          if (this.destroyed) {
            stream2.destroy();
            return;
          }
          if (!isConnectMethod) {
            proxyEvents2(stream2, this, ["timeout", "continue"]);
          }
          stream2.once("error", (error) => {
            this.destroy(error);
          });
          stream2.once("aborted", () => {
            const { res } = this;
            if (res) {
              res.aborted = true;
              res.emit("aborted");
              res.destroy();
            } else {
              this.destroy(new Error("The server aborted the HTTP/2 stream"));
            }
          });
          const onResponse = (headers, flags, rawHeaders) => {
            const response = new IncomingMessage(this.socket, stream2.readableHighWaterMark);
            this.res = response;
            response.url = `${this[kOrigin].origin}${this.path}`;
            response.req = this;
            response.statusCode = headers[HTTP2_HEADER_STATUS];
            response.headers = headers;
            response.rawHeaders = rawHeaders;
            response.once("end", () => {
              response.complete = true;
              response.socket = null;
              response.connection = null;
            });
            if (isConnectMethod) {
              response.upgrade = true;
              if (this.emit("connect", response, stream2, Buffer.alloc(0))) {
                this.emit("close");
              } else {
                stream2.destroy();
              }
            } else {
              stream2.on("data", (chunk2) => {
                if (!response._dumped && !response.push(chunk2)) {
                  stream2.pause();
                }
              });
              stream2.once("end", () => {
                if (!this.aborted) {
                  response.push(null);
                }
              });
              if (!this.emit("response", response)) {
                response._dump();
              }
            }
          };
          stream2.once("response", onResponse);
          stream2.once("headers", (headers) => this.emit("information", { statusCode: headers[HTTP2_HEADER_STATUS] }));
          stream2.once("trailers", (trailers, flags, rawTrailers) => {
            const { res } = this;
            if (res === null) {
              onResponse(trailers, flags, rawTrailers);
              return;
            }
            res.trailers = trailers;
            res.rawTrailers = rawTrailers;
          });
          stream2.once("close", () => {
            const { aborted, res } = this;
            if (res) {
              if (aborted) {
                res.aborted = true;
                res.emit("aborted");
                res.destroy();
              }
              const finish = () => {
                res.emit("close");
                this.destroy();
                this.emit("close");
              };
              if (res.readable) {
                res.once("end", finish);
              } else {
                finish();
              }
              return;
            }
            if (!this.destroyed) {
              this.destroy(new Error("The HTTP/2 stream has been early terminated"));
              this.emit("close");
              return;
            }
            this.destroy();
            this.emit("close");
          });
          this.socket = new Proxy(stream2, proxySocketHandler);
          for (const job of this[kJobs]) {
            job();
          }
          this[kJobs].length = 0;
          this.emit("socket", this.socket);
        };
        if (!(HTTP2_HEADER_AUTHORITY in this[kHeaders]) && !isConnectMethod) {
          this[kHeaders][HTTP2_HEADER_AUTHORITY] = this[kOrigin].host;
        }
        if (this[kSession]) {
          try {
            onStream(this[kSession].request(this[kHeaders]));
          } catch (error) {
            this.destroy(error);
          }
        } else {
          this.reusedSocket = true;
          try {
            const promise = this.agent.request(this[kOrigin], this[kOptions], this[kHeaders]);
            this[kPendingAgentPromise] = promise;
            onStream(await promise);
            this[kPendingAgentPromise] = false;
          } catch (error) {
            this[kPendingAgentPromise] = false;
            this.destroy(error);
          }
        }
      }
      get connection() {
        return this.socket;
      }
      set connection(value) {
        this.socket = value;
      }
      getHeaderNames() {
        return Object.keys(this[kHeaders]);
      }
      hasHeader(name) {
        if (typeof name !== "string") {
          throw new ERR_INVALID_ARG_TYPE("name", "string", name);
        }
        return Boolean(this[kHeaders][name.toLowerCase()]);
      }
      getHeader(name) {
        if (typeof name !== "string") {
          throw new ERR_INVALID_ARG_TYPE("name", "string", name);
        }
        return this[kHeaders][name.toLowerCase()];
      }
      get headersSent() {
        return this[kFlushedHeaders];
      }
      removeHeader(name) {
        if (typeof name !== "string") {
          throw new ERR_INVALID_ARG_TYPE("name", "string", name);
        }
        if (this.headersSent) {
          throw new ERR_HTTP_HEADERS_SENT("remove");
        }
        delete this[kHeaders][name.toLowerCase()];
      }
      setHeader(name, value) {
        if (this.headersSent) {
          throw new ERR_HTTP_HEADERS_SENT("set");
        }
        validateHeaderName(name);
        validateHeaderValue(name, value);
        const lowercased = name.toLowerCase();
        if (lowercased === "connection") {
          if (value.toLowerCase() === "keep-alive") {
            return;
          }
          throw new Error(`Invalid 'connection' header: ${value}`);
        }
        if (lowercased === "host" && this.method === "CONNECT") {
          this[kHeaders][HTTP2_HEADER_AUTHORITY] = value;
        } else {
          this[kHeaders][lowercased] = value;
        }
      }
      setNoDelay() {
      }
      setSocketKeepAlive() {
      }
      setTimeout(ms, callback) {
        const applyTimeout = () => this._request.setTimeout(ms, callback);
        if (this._request) {
          applyTimeout();
        } else {
          this[kJobs].push(applyTimeout);
        }
        return this;
      }
      get maxHeadersCount() {
        if (!this.destroyed && this._request) {
          return this._request.session.localSettings.maxHeaderListSize;
        }
        return void 0;
      }
      set maxHeadersCount(_value) {
      }
    };
    module2.exports = ClientRequest;
  }
});

// node_modules/resolve-alpn/index.js
var require_resolve_alpn = __commonJS({
  "node_modules/resolve-alpn/index.js"(exports2, module2) {
    "use strict";
    var tls = require("tls");
    module2.exports = (options = {}, connect = tls.connect) => new Promise((resolve, reject) => {
      let timeout = false;
      let socket;
      const callback = async () => {
        await socketPromise;
        socket.off("timeout", onTimeout);
        socket.off("error", reject);
        if (options.resolveSocket) {
          resolve({ alpnProtocol: socket.alpnProtocol, socket, timeout });
          if (timeout) {
            await Promise.resolve();
            socket.emit("timeout");
          }
        } else {
          socket.destroy();
          resolve({ alpnProtocol: socket.alpnProtocol, timeout });
        }
      };
      const onTimeout = async () => {
        timeout = true;
        callback();
      };
      const socketPromise = (async () => {
        try {
          socket = await connect(options, callback);
          socket.on("error", reject);
          socket.once("timeout", onTimeout);
        } catch (error) {
          reject(error);
        }
      })();
    });
  }
});

// node_modules/http2-wrapper/source/utils/calculate-server-name.js
var require_calculate_server_name = __commonJS({
  "node_modules/http2-wrapper/source/utils/calculate-server-name.js"(exports2, module2) {
    "use strict";
    var { isIP } = require("net");
    var assert2 = require("assert");
    var getHost = (host) => {
      if (host[0] === "[") {
        const idx2 = host.indexOf("]");
        assert2(idx2 !== -1);
        return host.slice(1, idx2);
      }
      const idx = host.indexOf(":");
      if (idx === -1) {
        return host;
      }
      return host.slice(0, idx);
    };
    module2.exports = (host) => {
      const servername = getHost(host);
      if (isIP(servername)) {
        return "";
      }
      return servername;
    };
  }
});

// node_modules/http2-wrapper/source/auto.js
var require_auto = __commonJS({
  "node_modules/http2-wrapper/source/auto.js"(exports2, module2) {
    "use strict";
    var { URL: URL3, urlToHttpOptions } = require("url");
    var http3 = require("http");
    var https2 = require("https");
    var resolveALPN = require_resolve_alpn();
    var QuickLRU = require_quick_lru();
    var { Agent, globalAgent } = require_agent();
    var Http2ClientRequest = require_client_request();
    var calculateServerName = require_calculate_server_name();
    var delayAsyncDestroy = require_delay_async_destroy();
    var cache = new QuickLRU({ maxSize: 100 });
    var queue = /* @__PURE__ */ new Map();
    var installSocket = (agent, socket, options) => {
      socket._httpMessage = { shouldKeepAlive: true };
      const onFree = () => {
        agent.emit("free", socket, options);
      };
      socket.on("free", onFree);
      const onClose = () => {
        agent.removeSocket(socket, options);
      };
      socket.on("close", onClose);
      const onTimeout = () => {
        const { freeSockets } = agent;
        for (const sockets of Object.values(freeSockets)) {
          if (sockets.includes(socket)) {
            socket.destroy();
            return;
          }
        }
      };
      socket.on("timeout", onTimeout);
      const onRemove = () => {
        agent.removeSocket(socket, options);
        socket.off("close", onClose);
        socket.off("free", onFree);
        socket.off("timeout", onTimeout);
        socket.off("agentRemove", onRemove);
      };
      socket.on("agentRemove", onRemove);
      agent.emit("free", socket, options);
    };
    var createResolveProtocol = (cache2, queue2 = /* @__PURE__ */ new Map(), connect = void 0) => {
      return async (options) => {
        const name = `${options.host}:${options.port}:${options.ALPNProtocols.sort()}`;
        if (!cache2.has(name)) {
          if (queue2.has(name)) {
            const result = await queue2.get(name);
            return { alpnProtocol: result.alpnProtocol };
          }
          const { path } = options;
          options.path = options.socketPath;
          const resultPromise = resolveALPN(options, connect);
          queue2.set(name, resultPromise);
          try {
            const result = await resultPromise;
            cache2.set(name, result.alpnProtocol);
            queue2.delete(name);
            options.path = path;
            return result;
          } catch (error) {
            queue2.delete(name);
            options.path = path;
            throw error;
          }
        }
        return { alpnProtocol: cache2.get(name) };
      };
    };
    var defaultResolveProtocol = createResolveProtocol(cache, queue);
    module2.exports = async (input, options, callback) => {
      if (typeof input === "string") {
        input = urlToHttpOptions(new URL3(input));
      } else if (input instanceof URL3) {
        input = urlToHttpOptions(input);
      } else {
        input = { ...input };
      }
      if (typeof options === "function" || options === void 0) {
        callback = options;
        options = input;
      } else {
        options = Object.assign(input, options);
      }
      options.ALPNProtocols = options.ALPNProtocols || ["h2", "http/1.1"];
      if (!Array.isArray(options.ALPNProtocols) || options.ALPNProtocols.length === 0) {
        throw new Error("The `ALPNProtocols` option must be an Array with at least one entry");
      }
      options.protocol = options.protocol || "https:";
      const isHttps = options.protocol === "https:";
      options.host = options.hostname || options.host || "localhost";
      options.session = options.tlsSession;
      options.servername = options.servername || calculateServerName(options.headers && options.headers.host || options.host);
      options.port = options.port || (isHttps ? 443 : 80);
      options._defaultAgent = isHttps ? https2.globalAgent : http3.globalAgent;
      const resolveProtocol = options.resolveProtocol || defaultResolveProtocol;
      let { agent } = options;
      if (agent !== void 0 && agent !== false && agent.constructor.name !== "Object") {
        throw new Error("The `options.agent` can be only an object `http`, `https` or `http2` properties");
      }
      if (isHttps) {
        options.resolveSocket = true;
        let { socket, alpnProtocol, timeout } = await resolveProtocol(options);
        if (timeout) {
          if (socket) {
            socket.destroy();
          }
          const error = new Error(`Timed out resolving ALPN: ${options.timeout} ms`);
          error.code = "ETIMEDOUT";
          error.ms = options.timeout;
          throw error;
        }
        if (socket && options.createConnection) {
          socket.destroy();
          socket = void 0;
        }
        delete options.resolveSocket;
        const isHttp2 = alpnProtocol === "h2";
        if (agent) {
          agent = isHttp2 ? agent.http2 : agent.https;
          options.agent = agent;
        }
        if (agent === void 0) {
          agent = isHttp2 ? globalAgent : https2.globalAgent;
        }
        if (socket) {
          if (agent === false) {
            socket.destroy();
          } else {
            const defaultCreateConnection = (isHttp2 ? Agent : https2.Agent).prototype.createConnection;
            if (agent.createConnection === defaultCreateConnection) {
              if (isHttp2) {
                options._reuseSocket = socket;
              } else {
                installSocket(agent, socket, options);
              }
            } else {
              socket.destroy();
            }
          }
        }
        if (isHttp2) {
          return delayAsyncDestroy(new Http2ClientRequest(options, callback));
        }
      } else if (agent) {
        options.agent = agent.http;
      }
      if (options.headers) {
        options.headers = { ...options.headers };
        if (options.headers[":authority"]) {
          if (!options.headers.host) {
            options.headers.host = options.headers[":authority"];
          }
          delete options.headers[":authority"];
        }
        delete options.headers[":method"];
        delete options.headers[":scheme"];
        delete options.headers[":path"];
      }
      return delayAsyncDestroy(http3.request(options, callback));
    };
    module2.exports.protocolCache = cache;
    module2.exports.resolveProtocol = defaultResolveProtocol;
    module2.exports.createResolveProtocol = createResolveProtocol;
  }
});

// node_modules/http2-wrapper/source/utils/js-stream-socket.js
var require_js_stream_socket = __commonJS({
  "node_modules/http2-wrapper/source/utils/js-stream-socket.js"(exports2, module2) {
    "use strict";
    var stream2 = require("stream");
    var tls = require("tls");
    var JSStreamSocket = new tls.TLSSocket(new stream2.PassThrough())._handle._parentWrap.constructor;
    module2.exports = JSStreamSocket;
  }
});

// node_modules/http2-wrapper/source/proxies/unexpected-status-code-error.js
var require_unexpected_status_code_error = __commonJS({
  "node_modules/http2-wrapper/source/proxies/unexpected-status-code-error.js"(exports2, module2) {
    "use strict";
    var UnexpectedStatusCodeError = class extends Error {
      constructor(statusCode, statusMessage = "") {
        super(`The proxy server rejected the request with status code ${statusCode} (${statusMessage || "empty status message"})`);
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
      }
    };
    module2.exports = UnexpectedStatusCodeError;
  }
});

// node_modules/http2-wrapper/source/utils/check-type.js
var require_check_type = __commonJS({
  "node_modules/http2-wrapper/source/utils/check-type.js"(exports2, module2) {
    "use strict";
    var checkType = (name, value, types2) => {
      const valid = types2.some((type) => {
        const typeofType = typeof type;
        if (typeofType === "string") {
          return typeof value === type;
        }
        return value instanceof type;
      });
      if (!valid) {
        const names = types2.map((type) => typeof type === "string" ? type : type.name);
        throw new TypeError(`Expected '${name}' to be a type of ${names.join(" or ")}, got ${typeof value}`);
      }
    };
    module2.exports = checkType;
  }
});

// node_modules/http2-wrapper/source/proxies/initialize.js
var require_initialize = __commonJS({
  "node_modules/http2-wrapper/source/proxies/initialize.js"(exports2, module2) {
    "use strict";
    var { URL: URL3 } = require("url");
    var checkType = require_check_type();
    module2.exports = (self, proxyOptions) => {
      checkType("proxyOptions", proxyOptions, ["object"]);
      checkType("proxyOptions.headers", proxyOptions.headers, ["object", "undefined"]);
      checkType("proxyOptions.raw", proxyOptions.raw, ["boolean", "undefined"]);
      checkType("proxyOptions.url", proxyOptions.url, [URL3, "string"]);
      const url = new URL3(proxyOptions.url);
      self.proxyOptions = {
        raw: true,
        ...proxyOptions,
        headers: { ...proxyOptions.headers },
        url
      };
    };
  }
});

// node_modules/http2-wrapper/source/proxies/get-auth-headers.js
var require_get_auth_headers = __commonJS({
  "node_modules/http2-wrapper/source/proxies/get-auth-headers.js"(exports2, module2) {
    "use strict";
    module2.exports = (self) => {
      const { username, password } = self.proxyOptions.url;
      if (username || password) {
        const data = `${username}:${password}`;
        const authorization = `Basic ${Buffer.from(data).toString("base64")}`;
        return {
          "proxy-authorization": authorization,
          authorization
        };
      }
      return {};
    };
  }
});

// node_modules/http2-wrapper/source/proxies/h1-over-h2.js
var require_h1_over_h2 = __commonJS({
  "node_modules/http2-wrapper/source/proxies/h1-over-h2.js"(exports2, module2) {
    "use strict";
    var tls = require("tls");
    var http3 = require("http");
    var https2 = require("https");
    var JSStreamSocket = require_js_stream_socket();
    var { globalAgent } = require_agent();
    var UnexpectedStatusCodeError = require_unexpected_status_code_error();
    var initialize = require_initialize();
    var getAuthorizationHeaders = require_get_auth_headers();
    var createConnection = (self, options, callback) => {
      (async () => {
        try {
          const { proxyOptions } = self;
          const { url, headers, raw } = proxyOptions;
          const stream2 = await globalAgent.request(url, proxyOptions, {
            ...getAuthorizationHeaders(self),
            ...headers,
            ":method": "CONNECT",
            ":authority": `${options.host}:${options.port}`
          });
          stream2.once("error", callback);
          stream2.once("response", (headers2) => {
            const statusCode = headers2[":status"];
            if (statusCode !== 200) {
              callback(new UnexpectedStatusCodeError(statusCode, ""));
              return;
            }
            const encrypted = self instanceof https2.Agent;
            if (raw && encrypted) {
              options.socket = stream2;
              const secureStream = tls.connect(options);
              secureStream.once("close", () => {
                stream2.destroy();
              });
              callback(null, secureStream);
              return;
            }
            const socket = new JSStreamSocket(stream2);
            socket.encrypted = false;
            socket._handle.getpeername = (out) => {
              out.family = void 0;
              out.address = void 0;
              out.port = void 0;
            };
            callback(null, socket);
          });
        } catch (error) {
          callback(error);
        }
      })();
    };
    var HttpOverHttp2 = class extends http3.Agent {
      constructor(options) {
        super(options);
        initialize(this, options.proxyOptions);
      }
      createConnection(options, callback) {
        createConnection(this, options, callback);
      }
    };
    var HttpsOverHttp2 = class extends https2.Agent {
      constructor(options) {
        super(options);
        initialize(this, options.proxyOptions);
      }
      createConnection(options, callback) {
        createConnection(this, options, callback);
      }
    };
    module2.exports = {
      HttpOverHttp2,
      HttpsOverHttp2
    };
  }
});

// node_modules/http2-wrapper/source/proxies/h2-over-hx.js
var require_h2_over_hx = __commonJS({
  "node_modules/http2-wrapper/source/proxies/h2-over-hx.js"(exports2, module2) {
    "use strict";
    var { Agent } = require_agent();
    var JSStreamSocket = require_js_stream_socket();
    var UnexpectedStatusCodeError = require_unexpected_status_code_error();
    var initialize = require_initialize();
    var Http2OverHttpX = class extends Agent {
      constructor(options) {
        super(options);
        initialize(this, options.proxyOptions);
      }
      async createConnection(origin, options) {
        const authority = `${origin.hostname}:${origin.port || 443}`;
        const [stream2, statusCode, statusMessage] = await this._getProxyStream(authority);
        if (statusCode !== 200) {
          throw new UnexpectedStatusCodeError(statusCode, statusMessage);
        }
        if (this.proxyOptions.raw) {
          options.socket = stream2;
        } else {
          const socket = new JSStreamSocket(stream2);
          socket.encrypted = false;
          socket._handle.getpeername = (out) => {
            out.family = void 0;
            out.address = void 0;
            out.port = void 0;
          };
          return socket;
        }
        return super.createConnection(origin, options);
      }
    };
    module2.exports = Http2OverHttpX;
  }
});

// node_modules/http2-wrapper/source/proxies/h2-over-h2.js
var require_h2_over_h2 = __commonJS({
  "node_modules/http2-wrapper/source/proxies/h2-over-h2.js"(exports2, module2) {
    "use strict";
    var { globalAgent } = require_agent();
    var Http2OverHttpX = require_h2_over_hx();
    var getAuthorizationHeaders = require_get_auth_headers();
    var getStatusCode = (stream2) => new Promise((resolve, reject) => {
      stream2.once("error", reject);
      stream2.once("response", (headers) => {
        stream2.off("error", reject);
        resolve(headers[":status"]);
      });
    });
    var Http2OverHttp2 = class extends Http2OverHttpX {
      async _getProxyStream(authority) {
        const { proxyOptions } = this;
        const headers = {
          ...getAuthorizationHeaders(this),
          ...proxyOptions.headers,
          ":method": "CONNECT",
          ":authority": authority
        };
        const stream2 = await globalAgent.request(proxyOptions.url, proxyOptions, headers);
        const statusCode = await getStatusCode(stream2);
        return [stream2, statusCode, ""];
      }
    };
    module2.exports = Http2OverHttp2;
  }
});

// node_modules/http2-wrapper/source/proxies/h2-over-h1.js
var require_h2_over_h1 = __commonJS({
  "node_modules/http2-wrapper/source/proxies/h2-over-h1.js"(exports2, module2) {
    "use strict";
    var http3 = require("http");
    var https2 = require("https");
    var Http2OverHttpX = require_h2_over_hx();
    var getAuthorizationHeaders = require_get_auth_headers();
    var getStream = (request) => new Promise((resolve, reject) => {
      const onConnect = (response, socket, head) => {
        socket.unshift(head);
        request.off("error", reject);
        resolve([socket, response.statusCode, response.statusMessage]);
      };
      request.once("error", reject);
      request.once("connect", onConnect);
    });
    var Http2OverHttp = class extends Http2OverHttpX {
      async _getProxyStream(authority) {
        const { proxyOptions } = this;
        const { url, headers } = this.proxyOptions;
        const network = url.protocol === "https:" ? https2 : http3;
        const request = network.request({
          ...proxyOptions,
          hostname: url.hostname,
          port: url.port,
          path: authority,
          headers: {
            ...getAuthorizationHeaders(this),
            ...headers,
            host: authority
          },
          method: "CONNECT"
        }).end();
        return getStream(request);
      }
    };
    module2.exports = {
      Http2OverHttp,
      Http2OverHttps: Http2OverHttp
    };
  }
});

// node_modules/http2-wrapper/source/index.js
var require_source = __commonJS({
  "node_modules/http2-wrapper/source/index.js"(exports2, module2) {
    "use strict";
    var http22 = require("http2");
    var {
      Agent,
      globalAgent
    } = require_agent();
    var ClientRequest = require_client_request();
    var IncomingMessage = require_incoming_message();
    var auto = require_auto();
    var {
      HttpOverHttp2,
      HttpsOverHttp2
    } = require_h1_over_h2();
    var Http2OverHttp2 = require_h2_over_h2();
    var {
      Http2OverHttp,
      Http2OverHttps
    } = require_h2_over_h1();
    var validateHeaderName = require_validate_header_name();
    var validateHeaderValue = require_validate_header_value();
    var request = (url, options, callback) => new ClientRequest(url, options, callback);
    var get = (url, options, callback) => {
      const req = new ClientRequest(url, options, callback);
      req.end();
      return req;
    };
    module2.exports = {
      ...http22,
      ClientRequest,
      IncomingMessage,
      Agent,
      globalAgent,
      request,
      get,
      auto,
      proxies: {
        HttpOverHttp2,
        HttpsOverHttp2,
        Http2OverHttp2,
        Http2OverHttp,
        Http2OverHttps
      },
      validateHeaderName,
      validateHeaderValue
    };
  }
});

// node_modules/tldts/dist/cjs/index.js
var require_cjs = __commonJS({
  "node_modules/tldts/dist/cjs/index.js"(exports2) {
    "use strict";
    function shareSameDomainSuffix(hostname, vhost) {
      if (hostname.endsWith(vhost)) {
        return hostname.length === vhost.length || hostname[hostname.length - vhost.length - 1] === ".";
      }
      return false;
    }
    function extractDomainWithSuffix(hostname, publicSuffix) {
      const publicSuffixIndex = hostname.length - publicSuffix.length - 2;
      const lastDotBeforeSuffixIndex = hostname.lastIndexOf(".", publicSuffixIndex);
      if (lastDotBeforeSuffixIndex === -1) {
        return hostname;
      }
      return hostname.slice(lastDotBeforeSuffixIndex + 1);
    }
    function getDomain$1(suffix, hostname, options) {
      if (options.validHosts !== null) {
        const validHosts = options.validHosts;
        for (const vhost of validHosts) {
          if (
            /*@__INLINE__*/
            shareSameDomainSuffix(hostname, vhost)
          ) {
            return vhost;
          }
        }
      }
      let numberOfLeadingDots = 0;
      if (hostname.startsWith(".")) {
        while (numberOfLeadingDots < hostname.length && hostname[numberOfLeadingDots] === ".") {
          numberOfLeadingDots += 1;
        }
      }
      if (suffix.length === hostname.length - numberOfLeadingDots) {
        return null;
      }
      return (
        /*@__INLINE__*/
        extractDomainWithSuffix(hostname, suffix)
      );
    }
    function getDomainWithoutSuffix$1(domain, suffix) {
      return domain.slice(0, -suffix.length - 1);
    }
    function extractHostname(url, urlIsValidHostname) {
      let start = 0;
      let end = url.length;
      let hasUpper = false;
      if (!urlIsValidHostname) {
        if (url.startsWith("data:")) {
          return null;
        }
        while (start < url.length && url.charCodeAt(start) <= 32) {
          start += 1;
        }
        while (end > start + 1 && url.charCodeAt(end - 1) <= 32) {
          end -= 1;
        }
        if (url.charCodeAt(start) === 47 && url.charCodeAt(start + 1) === 47) {
          start += 2;
        } else {
          const indexOfProtocol = url.indexOf(":/", start);
          if (indexOfProtocol !== -1) {
            const protocolSize = indexOfProtocol - start;
            const c0 = url.charCodeAt(start);
            const c1 = url.charCodeAt(start + 1);
            const c22 = url.charCodeAt(start + 2);
            const c3 = url.charCodeAt(start + 3);
            const c4 = url.charCodeAt(start + 4);
            if (protocolSize === 5 && c0 === 104 && c1 === 116 && c22 === 116 && c3 === 112 && c4 === 115) ;
            else if (protocolSize === 4 && c0 === 104 && c1 === 116 && c22 === 116 && c3 === 112) ;
            else if (protocolSize === 3 && c0 === 119 && c1 === 115 && c22 === 115) ;
            else if (protocolSize === 2 && c0 === 119 && c1 === 115) ;
            else {
              for (let i2 = start; i2 < indexOfProtocol; i2 += 1) {
                const lowerCaseCode = url.charCodeAt(i2) | 32;
                if (!(lowerCaseCode >= 97 && lowerCaseCode <= 122 || // [a, z]
                lowerCaseCode >= 48 && lowerCaseCode <= 57 || // [0, 9]
                lowerCaseCode === 46 || // '.'
                lowerCaseCode === 45 || // '-'
                lowerCaseCode === 43)) {
                  return null;
                }
              }
            }
            start = indexOfProtocol + 2;
            while (url.charCodeAt(start) === 47) {
              start += 1;
            }
          }
        }
        let indexOfIdentifier = -1;
        let indexOfClosingBracket = -1;
        let indexOfPort = -1;
        for (let i2 = start; i2 < end; i2 += 1) {
          const code = url.charCodeAt(i2);
          if (code === 35 || // '#'
          code === 47 || // '/'
          code === 63) {
            end = i2;
            break;
          } else if (code === 64) {
            indexOfIdentifier = i2;
          } else if (code === 93) {
            indexOfClosingBracket = i2;
          } else if (code === 58) {
            indexOfPort = i2;
          } else if (code >= 65 && code <= 90) {
            hasUpper = true;
          }
        }
        if (indexOfIdentifier !== -1 && indexOfIdentifier > start && indexOfIdentifier < end) {
          start = indexOfIdentifier + 1;
        }
        if (url.charCodeAt(start) === 91) {
          if (indexOfClosingBracket !== -1) {
            return url.slice(start + 1, indexOfClosingBracket).toLowerCase();
          }
          return null;
        } else if (indexOfPort !== -1 && indexOfPort > start && indexOfPort < end) {
          end = indexOfPort;
        }
      }
      while (end > start + 1 && url.charCodeAt(end - 1) === 46) {
        end -= 1;
      }
      const hostname = start !== 0 || end !== url.length ? url.slice(start, end) : url;
      if (hasUpper) {
        return hostname.toLowerCase();
      }
      return hostname;
    }
    function isProbablyIpv4(hostname) {
      if (hostname.length < 7) {
        return false;
      }
      if (hostname.length > 15) {
        return false;
      }
      let numberOfDots = 0;
      for (let i2 = 0; i2 < hostname.length; i2 += 1) {
        const code = hostname.charCodeAt(i2);
        if (code === 46) {
          numberOfDots += 1;
        } else if (code < 48 || code > 57) {
          return false;
        }
      }
      return numberOfDots === 3 && hostname.charCodeAt(0) !== 46 && hostname.charCodeAt(hostname.length - 1) !== 46;
    }
    function isProbablyIpv6(hostname) {
      if (hostname.length < 3) {
        return false;
      }
      let start = hostname.startsWith("[") ? 1 : 0;
      let end = hostname.length;
      if (hostname[end - 1] === "]") {
        end -= 1;
      }
      if (end - start > 39) {
        return false;
      }
      let hasColon = false;
      for (; start < end; start += 1) {
        const code = hostname.charCodeAt(start);
        if (code === 58) {
          hasColon = true;
        } else if (!(code >= 48 && code <= 57 || // 0-9
        code >= 97 && code <= 102 || // a-f
        code >= 65 && code <= 90)) {
          return false;
        }
      }
      return hasColon;
    }
    function isIp(hostname) {
      return isProbablyIpv6(hostname) || isProbablyIpv4(hostname);
    }
    function isValidAscii(code) {
      return code >= 97 && code <= 122 || code >= 48 && code <= 57 || code > 127;
    }
    function isValidHostname(hostname) {
      if (hostname.length > 255) {
        return false;
      }
      if (hostname.length === 0) {
        return false;
      }
      if (
        /*@__INLINE__*/
        !isValidAscii(hostname.charCodeAt(0)) && hostname.charCodeAt(0) !== 46 && // '.' (dot)
        hostname.charCodeAt(0) !== 95
      ) {
        return false;
      }
      let lastDotIndex = -1;
      let lastCharCode = -1;
      const len = hostname.length;
      for (let i2 = 0; i2 < len; i2 += 1) {
        const code = hostname.charCodeAt(i2);
        if (code === 46) {
          if (
            // Check that previous label is < 63 bytes long (64 = 63 + '.')
            i2 - lastDotIndex > 64 || // Check that previous character was not already a '.'
            lastCharCode === 46 || // Check that the previous label does not end with a '-' (dash)
            lastCharCode === 45 || // Check that the previous label does not end with a '_' (underscore)
            lastCharCode === 95
          ) {
            return false;
          }
          lastDotIndex = i2;
        } else if (!/*@__INLINE__*/
        (isValidAscii(code) || code === 45 || code === 95)) {
          return false;
        }
        lastCharCode = code;
      }
      return (
        // Check that last label is shorter than 63 chars
        len - lastDotIndex - 1 <= 63 && // Check that the last character is an allowed trailing label character.
        // Since we already checked that the char is a valid hostname character,
        // we only need to check that it's different from '-'.
        lastCharCode !== 45
      );
    }
    function setDefaultsImpl({ allowIcannDomains = true, allowPrivateDomains = false, detectIp = true, extractHostname: extractHostname2 = true, mixedInputs = true, validHosts = null, validateHostname = true }) {
      return {
        allowIcannDomains,
        allowPrivateDomains,
        detectIp,
        extractHostname: extractHostname2,
        mixedInputs,
        validHosts,
        validateHostname
      };
    }
    var DEFAULT_OPTIONS = (
      /*@__INLINE__*/
      setDefaultsImpl({})
    );
    function setDefaults(options) {
      if (options === void 0) {
        return DEFAULT_OPTIONS;
      }
      return (
        /*@__INLINE__*/
        setDefaultsImpl(options)
      );
    }
    function getSubdomain$1(hostname, domain) {
      if (domain.length === hostname.length) {
        return "";
      }
      return hostname.slice(0, -domain.length - 1);
    }
    function getEmptyResult() {
      return {
        domain: null,
        domainWithoutSuffix: null,
        hostname: null,
        isIcann: null,
        isIp: null,
        isPrivate: null,
        publicSuffix: null,
        subdomain: null
      };
    }
    function resetResult(result) {
      result.domain = null;
      result.domainWithoutSuffix = null;
      result.hostname = null;
      result.isIcann = null;
      result.isIp = null;
      result.isPrivate = null;
      result.publicSuffix = null;
      result.subdomain = null;
    }
    function parseImpl(url, step, suffixLookup2, partialOptions, result) {
      const options = (
        /*@__INLINE__*/
        setDefaults(partialOptions)
      );
      if (typeof url !== "string") {
        return result;
      }
      if (!options.extractHostname) {
        result.hostname = url;
      } else if (options.mixedInputs) {
        result.hostname = extractHostname(url, isValidHostname(url));
      } else {
        result.hostname = extractHostname(url, false);
      }
      if (options.detectIp && result.hostname !== null) {
        result.isIp = isIp(result.hostname);
        if (result.isIp) {
          return result;
        }
      }
      if (options.validateHostname && options.extractHostname && result.hostname !== null && !isValidHostname(result.hostname)) {
        result.hostname = null;
        return result;
      }
      if (step === 0 || result.hostname === null) {
        return result;
      }
      suffixLookup2(result.hostname, options, result);
      if (step === 2 || result.publicSuffix === null) {
        return result;
      }
      result.domain = getDomain$1(result.publicSuffix, result.hostname, options);
      if (step === 3 || result.domain === null) {
        return result;
      }
      result.subdomain = getSubdomain$1(result.hostname, result.domain);
      if (step === 4) {
        return result;
      }
      result.domainWithoutSuffix = getDomainWithoutSuffix$1(result.domain, result.publicSuffix);
      return result;
    }
    function fastPathLookup(hostname, options, out) {
      if (!options.allowPrivateDomains && hostname.length > 3) {
        const last = hostname.length - 1;
        const c3 = hostname.charCodeAt(last);
        const c22 = hostname.charCodeAt(last - 1);
        const c1 = hostname.charCodeAt(last - 2);
        const c0 = hostname.charCodeAt(last - 3);
        if (c3 === 109 && c22 === 111 && c1 === 99 && c0 === 46) {
          out.isIcann = true;
          out.isPrivate = false;
          out.publicSuffix = "com";
          return true;
        } else if (c3 === 103 && c22 === 114 && c1 === 111 && c0 === 46) {
          out.isIcann = true;
          out.isPrivate = false;
          out.publicSuffix = "org";
          return true;
        } else if (c3 === 117 && c22 === 100 && c1 === 101 && c0 === 46) {
          out.isIcann = true;
          out.isPrivate = false;
          out.publicSuffix = "edu";
          return true;
        } else if (c3 === 118 && c22 === 111 && c1 === 103 && c0 === 46) {
          out.isIcann = true;
          out.isPrivate = false;
          out.publicSuffix = "gov";
          return true;
        } else if (c3 === 116 && c22 === 101 && c1 === 110 && c0 === 46) {
          out.isIcann = true;
          out.isPrivate = false;
          out.publicSuffix = "net";
          return true;
        } else if (c3 === 101 && c22 === 100 && c1 === 46) {
          out.isIcann = true;
          out.isPrivate = false;
          out.publicSuffix = "de";
          return true;
        }
      }
      return false;
    }
    var exceptions = /* @__PURE__ */ (function() {
      const _0 = [1, {}], _1 = [0, { "city": _0 }];
      const exceptions2 = [0, { "ck": [0, { "www": _0 }], "jp": [0, { "kawasaki": _1, "kitakyushu": _1, "kobe": _1, "nagoya": _1, "sapporo": _1, "sendai": _1, "yokohama": _1 }] }];
      return exceptions2;
    })();
    var rules = /* @__PURE__ */ (function() {
      const _2 = [1, {}], _3 = [2, {}], _4 = [1, { "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2 }], _5 = [1, { "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2 }], _6 = [0, { "*": _3 }], _7 = [2, { "s": _6 }], _8 = [0, { "relay": _3 }], _9 = [2, { "id": _3 }], _10 = [1, { "gov": _2 }], _11 = [0, { "airflow": _6, "lambda-url": _3, "transfer-webapp": _3 }], _12 = [0, { "airflow": _6, "transfer-webapp": _3 }], _13 = [0, { "transfer-webapp": _3 }], _14 = [0, { "transfer-webapp": _3, "transfer-webapp-fips": _3 }], _15 = [0, { "notebook": _3, "studio": _3 }], _16 = [0, { "labeling": _3, "notebook": _3, "studio": _3 }], _17 = [0, { "notebook": _3 }], _18 = [0, { "labeling": _3, "notebook": _3, "notebook-fips": _3, "studio": _3 }], _19 = [0, { "notebook": _3, "notebook-fips": _3, "studio": _3, "studio-fips": _3 }], _20 = [0, { "shop": _3 }], _21 = [0, { "*": _2 }], _22 = [1, { "co": _3 }], _23 = [0, { "objects": _3 }], _24 = [2, { "eu-west-1": _3, "us-east-1": _3 }], _25 = [2, { "nodes": _3 }], _26 = [0, { "my": _3 }], _27 = [0, { "s3": _3, "s3-accesspoint": _3, "s3-website": _3 }], _28 = [0, { "s3": _3, "s3-accesspoint": _3 }], _29 = [0, { "direct": _3 }], _30 = [0, { "webview-assets": _3 }], _31 = [0, { "vfs": _3, "webview-assets": _3 }], _32 = [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _27, "s3": _3, "s3-accesspoint": _3, "s3-object-lambda": _3, "s3-website": _3, "aws-cloud9": _30, "cloud9": _31 }], _33 = [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _28, "s3": _3, "s3-accesspoint": _3, "s3-object-lambda": _3, "s3-website": _3, "aws-cloud9": _30, "cloud9": _31 }], _34 = [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _27, "s3": _3, "s3-accesspoint": _3, "s3-object-lambda": _3, "s3-website": _3, "analytics-gateway": _3, "aws-cloud9": _30, "cloud9": _31 }], _35 = [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _27, "s3": _3, "s3-accesspoint": _3, "s3-object-lambda": _3, "s3-website": _3 }], _36 = [0, { "s3": _3, "s3-accesspoint": _3, "s3-accesspoint-fips": _3, "s3-fips": _3, "s3-website": _3 }], _37 = [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _36, "s3": _3, "s3-accesspoint": _3, "s3-accesspoint-fips": _3, "s3-fips": _3, "s3-object-lambda": _3, "s3-website": _3, "aws-cloud9": _30, "cloud9": _31 }], _38 = [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _36, "s3": _3, "s3-accesspoint": _3, "s3-accesspoint-fips": _3, "s3-fips": _3, "s3-object-lambda": _3, "s3-website": _3 }], _39 = [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _36, "s3": _3, "s3-accesspoint": _3, "s3-accesspoint-fips": _3, "s3-deprecated": _3, "s3-fips": _3, "s3-object-lambda": _3, "s3-website": _3, "analytics-gateway": _3, "aws-cloud9": _30, "cloud9": _31 }], _40 = [0, { "auth": _3 }], _41 = [0, { "auth": _3, "auth-fips": _3 }], _42 = [0, { "auth-fips": _3 }], _43 = [0, { "apps": _3 }], _44 = [0, { "paas": _3 }], _45 = [2, { "eu": _3 }], _46 = [0, { "app": _3 }], _47 = [0, { "site": _3 }], _48 = [1, { "com": _2, "edu": _2, "net": _2, "org": _2 }], _49 = [0, { "j": _3 }], _50 = [0, { "dyn": _3 }], _51 = [2, { "web": _3 }], _52 = [1, { "co": _2, "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2 }], _53 = [0, { "p": _3 }], _54 = [0, { "user": _3 }], _55 = [1, { "ms": _3 }], _56 = [0, { "cdn": _3 }], _57 = [2, { "raw": _6 }], _58 = [0, { "cust": _3, "reservd": _3 }], _59 = [0, { "cust": _3 }], _60 = [0, { "s3": _3 }], _61 = [1, { "biz": _2, "com": _2, "edu": _2, "gov": _2, "info": _2, "net": _2, "org": _2 }], _62 = [0, { "ipfs": _3 }], _63 = [1, { "framer": _3 }], _64 = [0, { "forgot": _3 }], _65 = [0, { "blob": _3, "file": _3, "web": _3 }], _66 = [0, { "core": _65, "servicebus": _3 }], _67 = [1, { "gs": _2 }], _68 = [0, { "nes": _2 }], _69 = [1, { "k12": _2, "cc": _2, "lib": _2 }], _70 = [1, { "cc": _2 }], _71 = [1, { "cc": _2, "lib": _2 }];
      const rules2 = [0, { "ac": [1, { "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "drr": _3, "feedback": _3, "forms": _3 }], "ad": _2, "ae": [1, { "ac": _2, "co": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "sch": _2 }], "aero": [1, { "airline": _2, "airport": _2, "accident-investigation": _2, "accident-prevention": _2, "aerobatic": _2, "aeroclub": _2, "aerodrome": _2, "agents": _2, "air-surveillance": _2, "air-traffic-control": _2, "aircraft": _2, "airtraffic": _2, "ambulance": _2, "association": _2, "author": _2, "ballooning": _2, "broker": _2, "caa": _2, "cargo": _2, "catering": _2, "certification": _2, "championship": _2, "charter": _2, "civilaviation": _2, "club": _2, "conference": _2, "consultant": _2, "consulting": _2, "control": _2, "council": _2, "crew": _2, "design": _2, "dgca": _2, "educator": _2, "emergency": _2, "engine": _2, "engineer": _2, "entertainment": _2, "equipment": _2, "exchange": _2, "express": _2, "federation": _2, "flight": _2, "freight": _2, "fuel": _2, "gliding": _2, "government": _2, "groundhandling": _2, "group": _2, "hanggliding": _2, "homebuilt": _2, "insurance": _2, "journal": _2, "journalist": _2, "leasing": _2, "logistics": _2, "magazine": _2, "maintenance": _2, "marketplace": _2, "media": _2, "microlight": _2, "modelling": _2, "navigation": _2, "parachuting": _2, "paragliding": _2, "passenger-association": _2, "pilot": _2, "press": _2, "production": _2, "recreation": _2, "repbody": _2, "res": _2, "research": _2, "rotorcraft": _2, "safety": _2, "scientist": _2, "services": _2, "show": _2, "skydiving": _2, "software": _2, "student": _2, "taxi": _2, "trader": _2, "trading": _2, "trainer": _2, "union": _2, "workinggroup": _2, "works": _2 }], "af": _4, "ag": [1, { "co": _2, "com": _2, "net": _2, "nom": _2, "org": _2, "obj": _3 }], "ai": [1, { "com": _2, "net": _2, "off": _2, "org": _2, "uwu": _3, "framer": _3, "kiloapps": _3 }], "al": _5, "am": [1, { "co": _2, "com": _2, "commune": _2, "net": _2, "org": _2, "radio": _3 }], "ao": [1, { "co": _2, "ed": _2, "edu": _2, "gov": _2, "gv": _2, "it": _2, "og": _2, "org": _2, "pb": _2 }], "aq": _2, "ar": [1, { "bet": _2, "com": _2, "coop": _2, "edu": _2, "gob": _2, "gov": _2, "int": _2, "mil": _2, "musica": _2, "mutual": _2, "net": _2, "org": _2, "seg": _2, "senasa": _2, "tur": _2 }], "arpa": [1, { "e164": _2, "home": _2, "in-addr": _2, "ip6": _2, "iris": _2, "uri": _2, "urn": _2 }], "as": _10, "asia": [1, { "cloudns": _3, "daemon": _3, "dix": _3 }], "at": [1, { "4": _3, "ac": [1, { "sth": _2 }], "co": _2, "gv": _2, "or": _2, "funkfeuer": [0, { "wien": _3 }], "futurecms": [0, { "*": _3, "ex": _6, "in": _6 }], "futurehosting": _3, "futuremailing": _3, "ortsinfo": [0, { "ex": _6, "kunden": _6 }], "biz": _3, "info": _3, "123webseite": _3, "priv": _3, "my": _3, "myspreadshop": _3, "12hp": _3, "2ix": _3, "4lima": _3, "lima-city": _3 }], "au": [1, { "asn": _2, "com": [1, { "cloudlets": [0, { "mel": _3 }], "myspreadshop": _3 }], "edu": [1, { "act": _2, "catholic": _2, "nsw": _2, "nt": _2, "qld": _2, "sa": _2, "tas": _2, "vic": _2, "wa": _2 }], "gov": [1, { "qld": _2, "sa": _2, "tas": _2, "vic": _2, "wa": _2 }], "id": _2, "net": _2, "org": _2, "conf": _2, "oz": _2, "act": _2, "nsw": _2, "nt": _2, "qld": _2, "sa": _2, "tas": _2, "vic": _2, "wa": _2, "hrsn": [0, { "vps": _3 }] }], "aw": [1, { "com": _2 }], "ax": _2, "az": [1, { "biz": _2, "co": _2, "com": _2, "edu": _2, "gov": _2, "info": _2, "int": _2, "mil": _2, "name": _2, "net": _2, "org": _2, "pp": _2, "pro": _2 }], "ba": [1, { "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "brendly": _20, "rs": _3 }], "bb": [1, { "biz": _2, "co": _2, "com": _2, "edu": _2, "gov": _2, "info": _2, "net": _2, "org": _2, "store": _2, "tv": _2 }], "bd": [1, { "ac": _2, "ai": _2, "co": _2, "com": _2, "edu": _2, "gov": _2, "id": _2, "info": _2, "it": _2, "mil": _2, "net": _2, "org": _2, "sch": _2, "tv": _2 }], "be": [1, { "ac": _2, "cloudns": _3, "webhosting": _3, "interhostsolutions": [0, { "cloud": _3 }], "kuleuven": [0, { "ezproxy": _3 }], "my": _3, "123website": _3, "myspreadshop": _3, "transurl": _6 }], "bf": _10, "bg": [1, { "0": _2, "1": _2, "2": _2, "3": _2, "4": _2, "5": _2, "6": _2, "7": _2, "8": _2, "9": _2, "a": _2, "b": _2, "c": _2, "d": _2, "e": _2, "f": _2, "g": _2, "h": _2, "i": _2, "j": _2, "k": _2, "l": _2, "m": _2, "n": _2, "o": _2, "p": _2, "q": _2, "r": _2, "s": _2, "t": _2, "u": _2, "v": _2, "w": _2, "x": _2, "y": _2, "z": _2, "barsy": _3 }], "bh": _4, "bi": [1, { "co": _2, "com": _2, "edu": _2, "or": _2, "org": _2 }], "biz": [1, { "activetrail": _3, "cloud-ip": _3, "cloudns": _3, "jozi": _3, "dyndns": _3, "for-better": _3, "for-more": _3, "for-some": _3, "for-the": _3, "selfip": _3, "webhop": _3, "orx": _3, "mmafan": _3, "myftp": _3, "no-ip": _3, "dscloud": _3 }], "bj": [1, { "africa": _2, "agro": _2, "architectes": _2, "assur": _2, "avocats": _2, "co": _2, "com": _2, "eco": _2, "econo": _2, "edu": _2, "info": _2, "loisirs": _2, "money": _2, "net": _2, "org": _2, "ote": _2, "restaurant": _2, "resto": _2, "tourism": _2, "univ": _2 }], "bm": _4, "bn": [1, { "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "co": _3 }], "bo": [1, { "com": _2, "edu": _2, "gob": _2, "int": _2, "mil": _2, "net": _2, "org": _2, "tv": _2, "web": _2, "academia": _2, "agro": _2, "arte": _2, "blog": _2, "bolivia": _2, "ciencia": _2, "cooperativa": _2, "democracia": _2, "deporte": _2, "ecologia": _2, "economia": _2, "empresa": _2, "indigena": _2, "industria": _2, "info": _2, "medicina": _2, "movimiento": _2, "musica": _2, "natural": _2, "nombre": _2, "noticias": _2, "patria": _2, "plurinacional": _2, "politica": _2, "profesional": _2, "pueblo": _2, "revista": _2, "salud": _2, "tecnologia": _2, "tksat": _2, "transporte": _2, "wiki": _2 }], "br": [1, { "9guacu": _2, "abc": _2, "adm": _2, "adv": _2, "agr": _2, "aju": _2, "am": _2, "anani": _2, "aparecida": _2, "api": _2, "app": _2, "arq": _2, "art": _2, "ato": _2, "b": _2, "barueri": _2, "belem": _2, "bet": _2, "bhz": _2, "bib": _2, "bio": _2, "blog": _2, "bmd": _2, "boavista": _2, "bsb": _2, "campinagrande": _2, "campinas": _2, "caxias": _2, "cim": _2, "cng": _2, "cnt": _2, "com": [1, { "simplesite": _3 }], "contagem": _2, "coop": _2, "coz": _2, "cri": _2, "cuiaba": _2, "curitiba": _2, "def": _2, "des": _2, "det": _2, "dev": _2, "ecn": _2, "eco": _2, "edu": _2, "emp": _2, "enf": _2, "eng": _2, "esp": _2, "etc": _2, "eti": _2, "far": _2, "feira": _2, "flog": _2, "floripa": _2, "fm": _2, "fnd": _2, "fortal": _2, "fot": _2, "foz": _2, "fst": _2, "g12": _2, "geo": _2, "ggf": _2, "goiania": _2, "gov": [1, { "ac": _2, "al": _2, "am": _2, "ap": _2, "ba": _2, "ce": _2, "df": _2, "es": _2, "go": _2, "ma": _2, "mg": _2, "ms": _2, "mt": _2, "pa": _2, "pb": _2, "pe": _2, "pi": _2, "pr": _2, "rj": _2, "rn": _2, "ro": _2, "rr": _2, "rs": _2, "sc": _2, "se": _2, "sp": _2, "to": _2 }], "gru": _2, "ia": _2, "imb": _2, "ind": _2, "inf": _2, "jab": _2, "jampa": _2, "jdf": _2, "joinville": _2, "jor": _2, "jus": _2, "leg": [1, { "ac": _3, "al": _3, "am": _3, "ap": _3, "ba": _3, "ce": _3, "df": _3, "es": _3, "go": _3, "ma": _3, "mg": _3, "ms": _3, "mt": _3, "pa": _3, "pb": _3, "pe": _3, "pi": _3, "pr": _3, "rj": _3, "rn": _3, "ro": _3, "rr": _3, "rs": _3, "sc": _3, "se": _3, "sp": _3, "to": _3 }], "leilao": _2, "lel": _2, "log": _2, "londrina": _2, "macapa": _2, "maceio": _2, "manaus": _2, "maringa": _2, "mat": _2, "med": _2, "mil": _2, "morena": _2, "mp": _2, "mus": _2, "natal": _2, "net": _2, "niteroi": _2, "nom": _21, "not": _2, "ntr": _2, "odo": _2, "ong": _2, "org": _2, "osasco": _2, "palmas": _2, "poa": _2, "ppg": _2, "pro": _2, "psc": _2, "psi": _2, "pvh": _2, "qsl": _2, "radio": _2, "rec": _2, "recife": _2, "rep": _2, "ribeirao": _2, "rio": _2, "riobranco": _2, "riopreto": _2, "salvador": _2, "sampa": _2, "santamaria": _2, "santoandre": _2, "saobernardo": _2, "saogonca": _2, "seg": _2, "sjc": _2, "slg": _2, "slz": _2, "social": _2, "sorocaba": _2, "srv": _2, "taxi": _2, "tc": _2, "tec": _2, "teo": _2, "the": _2, "tmp": _2, "trd": _2, "tur": _2, "tv": _2, "udi": _2, "vet": _2, "vix": _2, "vlog": _2, "wiki": _2, "xyz": _2, "zlg": _2, "tche": _3 }], "bs": [1, { "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "we": _3 }], "bt": _4, "bv": _2, "bw": [1, { "ac": _2, "co": _2, "gov": _2, "net": _2, "org": _2 }], "by": [1, { "gov": _2, "mil": _2, "com": _2, "of": _2, "mediatech": _3 }], "bz": [1, { "co": _2, "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "za": _3, "mydns": _3, "gsj": _3 }], "ca": [1, { "ab": _2, "bc": _2, "mb": _2, "nb": _2, "nf": _2, "nl": _2, "ns": _2, "nt": _2, "nu": _2, "on": _2, "pe": _2, "qc": _2, "sk": _2, "yk": _2, "gc": _2, "barsy": _3, "awdev": _6, "co": _3, "no-ip": _3, "onid": _3, "myspreadshop": _3, "box": _3 }], "cat": _2, "cc": [1, { "cleverapps": _3, "cloud-ip": _3, "cloudns": _3, "ccwu": _3, "ftpaccess": _3, "game-server": _3, "myphotos": _3, "scrapping": _3, "twmail": _3, "csx": _3, "fantasyleague": _3, "spawn": [0, { "instances": _3 }], "ec": _3, "eu": _3, "gu": _3, "uk": _3, "us": _3 }], "cd": [1, { "gov": _2, "cc": _3 }], "cf": _2, "cg": _2, "ch": [1, { "square7": _3, "cloudns": _3, "cloudscale": [0, { "cust": _3, "lpg": _23, "rma": _23 }], "objectstorage": [0, { "lpg": _3, "rma": _3 }], "flow": [0, { "ae": [0, { "alp1": _3 }], "appengine": _3 }], "linkyard-cloud": _3, "gotdns": _3, "dnsking": _3, "123website": _3, "myspreadshop": _3, "firenet": [0, { "*": _3, "svc": _6 }], "12hp": _3, "2ix": _3, "4lima": _3, "lima-city": _3 }], "ci": [1, { "ac": _2, "xn--aroport-bya": _2, "a\xE9roport": _2, "asso": _2, "co": _2, "com": _2, "ed": _2, "edu": _2, "go": _2, "gouv": _2, "int": _2, "net": _2, "or": _2, "org": _2, "us": _3 }], "ck": _21, "cl": [1, { "co": _2, "gob": _2, "gov": _2, "mil": _2, "cloudns": _3 }], "cm": [1, { "co": _2, "com": _2, "gov": _2, "net": _2 }], "cn": [1, { "ac": _2, "com": [1, { "amazonaws": [0, { "cn-north-1": [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "rds": _6, "dualstack": _27, "s3": _3, "s3-accesspoint": _3, "s3-deprecated": _3, "s3-object-lambda": _3, "s3-website": _3 }], "cn-northwest-1": [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "rds": _6, "dualstack": _28, "s3": _3, "s3-accesspoint": _3, "s3-object-lambda": _3, "s3-website": _3 }], "compute": _6, "airflow": [0, { "cn-north-1": _6, "cn-northwest-1": _6 }], "eb": [0, { "cn-north-1": _3, "cn-northwest-1": _3 }], "elb": _6 }], "amazonwebservices": [0, { "on": [0, { "cn-north-1": _12, "cn-northwest-1": _12 }] }], "sagemaker": [0, { "cn-north-1": _15, "cn-northwest-1": _15 }] }], "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "xn--55qx5d": _2, "\u516C\u53F8": _2, "xn--od0alg": _2, "\u7DB2\u7D61": _2, "xn--io0a7i": _2, "\u7F51\u7EDC": _2, "ah": _2, "bj": _2, "cq": _2, "fj": _2, "gd": _2, "gs": _2, "gx": _2, "gz": _2, "ha": _2, "hb": _2, "he": _2, "hi": _2, "hk": _2, "hl": _2, "hn": _2, "jl": _2, "js": _2, "jx": _2, "ln": _2, "mo": _2, "nm": _2, "nx": _2, "qh": _2, "sc": _2, "sd": _2, "sh": [1, { "as": _3 }], "sn": _2, "sx": _2, "tj": _2, "tw": _2, "xj": _2, "xz": _2, "yn": _2, "zj": _2, "canva-apps": _3, "canvasite": _26, "myqnapcloud": _3, "quickconnect": _29 }], "co": [1, { "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "nom": _2, "org": _2, "carrd": _3, "crd": _3, "otap": _6, "hidns": _3, "leadpages": _3, "lpages": _3, "mypi": _3, "xmit": _6, "rdpa": [0, { "clusters": _6, "srvrless": _6 }], "firewalledreplit": _9, "repl": _9, "supabase": [2, { "realtime": _3, "storage": _3 }], "umso": _3 }], "com": [1, { "a2hosted": _3, "cpserver": _3, "adobeaemcloud": [2, { "dev": _6 }], "africa": _3, "auiusercontent": _6, "aivencloud": _3, "alibabacloudcs": _3, "kasserver": _3, "amazonaws": [0, { "af-south-1": _32, "ap-east-1": _33, "ap-northeast-1": _34, "ap-northeast-2": _34, "ap-northeast-3": _32, "ap-south-1": _34, "ap-south-2": _35, "ap-southeast-1": _34, "ap-southeast-2": _34, "ap-southeast-3": _35, "ap-southeast-4": _35, "ap-southeast-5": [0, { "execute-api": _3, "dualstack": _27, "s3": _3, "s3-accesspoint": _3, "s3-deprecated": _3, "s3-object-lambda": _3, "s3-website": _3 }], "ca-central-1": _37, "ca-west-1": _38, "eu-central-1": _34, "eu-central-2": _35, "eu-north-1": _33, "eu-south-1": _32, "eu-south-2": _35, "eu-west-1": [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _27, "s3": _3, "s3-accesspoint": _3, "s3-deprecated": _3, "s3-object-lambda": _3, "s3-website": _3, "analytics-gateway": _3, "aws-cloud9": _30, "cloud9": _31 }], "eu-west-2": _33, "eu-west-3": _32, "il-central-1": [0, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _27, "s3": _3, "s3-accesspoint": _3, "s3-object-lambda": _3, "s3-website": _3, "aws-cloud9": _30, "cloud9": [0, { "vfs": _3 }] }], "me-central-1": _35, "me-south-1": _33, "sa-east-1": _32, "us-east-1": [2, { "execute-api": _3, "emrappui-prod": _3, "emrnotebooks-prod": _3, "emrstudio-prod": _3, "dualstack": _36, "s3": _3, "s3-accesspoint": _3, "s3-accesspoint-fips": _3, "s3-deprecated": _3, "s3-fips": _3, "s3-object-lambda": _3, "s3-website": _3, "analytics-gateway": _3, "aws-cloud9": _30, "cloud9": _31 }], "us-east-2": _39, "us-gov-east-1": _38, "us-gov-west-1": _38, "us-west-1": _37, "us-west-2": _39, "compute": _6, "compute-1": _6, "airflow": [0, { "af-south-1": _6, "ap-east-1": _6, "ap-northeast-1": _6, "ap-northeast-2": _6, "ap-northeast-3": _6, "ap-south-1": _6, "ap-south-2": _6, "ap-southeast-1": _6, "ap-southeast-2": _6, "ap-southeast-3": _6, "ap-southeast-4": _6, "ap-southeast-5": _6, "ap-southeast-7": _6, "ca-central-1": _6, "ca-west-1": _6, "eu-central-1": _6, "eu-central-2": _6, "eu-north-1": _6, "eu-south-1": _6, "eu-south-2": _6, "eu-west-1": _6, "eu-west-2": _6, "eu-west-3": _6, "il-central-1": _6, "me-central-1": _6, "me-south-1": _6, "sa-east-1": _6, "us-east-1": _6, "us-east-2": _6, "us-west-1": _6, "us-west-2": _6 }], "rds": [0, { "af-south-1": _6, "ap-east-1": _6, "ap-east-2": _6, "ap-northeast-1": _6, "ap-northeast-2": _6, "ap-northeast-3": _6, "ap-south-1": _6, "ap-south-2": _6, "ap-southeast-1": _6, "ap-southeast-2": _6, "ap-southeast-3": _6, "ap-southeast-4": _6, "ap-southeast-5": _6, "ap-southeast-6": _6, "ap-southeast-7": _6, "ca-central-1": _6, "ca-west-1": _6, "eu-central-1": _6, "eu-central-2": _6, "eu-west-1": _6, "eu-west-2": _6, "eu-west-3": _6, "il-central-1": _6, "me-central-1": _6, "me-south-1": _6, "mx-central-1": _6, "sa-east-1": _6, "us-east-1": _6, "us-east-2": _6, "us-gov-east-1": _6, "us-gov-west-1": _6, "us-northeast-1": _6, "us-west-1": _6, "us-west-2": _6 }], "s3": _3, "s3-1": _3, "s3-ap-east-1": _3, "s3-ap-northeast-1": _3, "s3-ap-northeast-2": _3, "s3-ap-northeast-3": _3, "s3-ap-south-1": _3, "s3-ap-southeast-1": _3, "s3-ap-southeast-2": _3, "s3-ca-central-1": _3, "s3-eu-central-1": _3, "s3-eu-north-1": _3, "s3-eu-west-1": _3, "s3-eu-west-2": _3, "s3-eu-west-3": _3, "s3-external-1": _3, "s3-fips-us-gov-east-1": _3, "s3-fips-us-gov-west-1": _3, "s3-global": [0, { "accesspoint": [0, { "mrap": _3 }] }], "s3-me-south-1": _3, "s3-sa-east-1": _3, "s3-us-east-2": _3, "s3-us-gov-east-1": _3, "s3-us-gov-west-1": _3, "s3-us-west-1": _3, "s3-us-west-2": _3, "s3-website-ap-northeast-1": _3, "s3-website-ap-southeast-1": _3, "s3-website-ap-southeast-2": _3, "s3-website-eu-west-1": _3, "s3-website-sa-east-1": _3, "s3-website-us-east-1": _3, "s3-website-us-gov-west-1": _3, "s3-website-us-west-1": _3, "s3-website-us-west-2": _3, "elb": _6 }], "amazoncognito": [0, { "af-south-1": _40, "ap-east-1": _40, "ap-northeast-1": _40, "ap-northeast-2": _40, "ap-northeast-3": _40, "ap-south-1": _40, "ap-south-2": _40, "ap-southeast-1": _40, "ap-southeast-2": _40, "ap-southeast-3": _40, "ap-southeast-4": _40, "ap-southeast-5": _40, "ap-southeast-7": _40, "ca-central-1": _40, "ca-west-1": _40, "eu-central-1": _40, "eu-central-2": _40, "eu-north-1": _40, "eu-south-1": _40, "eu-south-2": _40, "eu-west-1": _40, "eu-west-2": _40, "eu-west-3": _40, "il-central-1": _40, "me-central-1": _40, "me-south-1": _40, "mx-central-1": _40, "sa-east-1": _40, "us-east-1": _41, "us-east-2": _41, "us-gov-east-1": _42, "us-gov-west-1": _42, "us-west-1": _41, "us-west-2": _41 }], "amplifyapp": _3, "awsapprunner": _6, "awsapps": _3, "elasticbeanstalk": [2, { "af-south-1": _3, "ap-east-1": _3, "ap-northeast-1": _3, "ap-northeast-2": _3, "ap-northeast-3": _3, "ap-south-1": _3, "ap-southeast-1": _3, "ap-southeast-2": _3, "ap-southeast-3": _3, "ap-southeast-5": _3, "ap-southeast-7": _3, "ca-central-1": _3, "eu-central-1": _3, "eu-north-1": _3, "eu-south-1": _3, "eu-south-2": _3, "eu-west-1": _3, "eu-west-2": _3, "eu-west-3": _3, "il-central-1": _3, "me-central-1": _3, "me-south-1": _3, "sa-east-1": _3, "us-east-1": _3, "us-east-2": _3, "us-gov-east-1": _3, "us-gov-west-1": _3, "us-west-1": _3, "us-west-2": _3 }], "awsglobalaccelerator": _3, "siiites": _3, "appspacehosted": _3, "appspaceusercontent": _3, "on-aptible": _3, "myasustor": _3, "balena-devices": _3, "boutir": _3, "bplaced": _3, "cafjs": _3, "canva-apps": _3, "canva-hosted-embed": _3, "canvacode": _3, "rice-labs": _3, "cdn77-storage": _3, "br": _3, "cn": _3, "de": _3, "eu": _3, "jpn": _3, "mex": _3, "ru": _3, "sa": _3, "uk": _3, "us": _3, "za": _3, "clever-cloud": [0, { "services": _6 }], "abrdns": _3, "dnsabr": _3, "ip-ddns": _3, "jdevcloud": _3, "wpdevcloud": _3, "cf-ipfs": _3, "cloudflare-ipfs": _3, "trycloudflare": _3, "co": _3, "devinapps": _6, "builtwithdark": _3, "datadetect": [0, { "demo": _3, "instance": _3 }], "dattolocal": _3, "dattorelay": _3, "dattoweb": _3, "mydatto": _3, "digitaloceanspaces": _6, "discordsays": _3, "discordsez": _3, "drayddns": _3, "dreamhosters": _3, "durumis": _3, "blogdns": _3, "cechire": _3, "dnsalias": _3, "dnsdojo": _3, "doesntexist": _3, "dontexist": _3, "doomdns": _3, "dyn-o-saur": _3, "dynalias": _3, "dyndns-at-home": _3, "dyndns-at-work": _3, "dyndns-blog": _3, "dyndns-free": _3, "dyndns-home": _3, "dyndns-ip": _3, "dyndns-mail": _3, "dyndns-office": _3, "dyndns-pics": _3, "dyndns-remote": _3, "dyndns-server": _3, "dyndns-web": _3, "dyndns-wiki": _3, "dyndns-work": _3, "est-a-la-maison": _3, "est-a-la-masion": _3, "est-le-patron": _3, "est-mon-blogueur": _3, "from-ak": _3, "from-al": _3, "from-ar": _3, "from-ca": _3, "from-ct": _3, "from-dc": _3, "from-de": _3, "from-fl": _3, "from-ga": _3, "from-hi": _3, "from-ia": _3, "from-id": _3, "from-il": _3, "from-in": _3, "from-ks": _3, "from-ky": _3, "from-ma": _3, "from-md": _3, "from-mi": _3, "from-mn": _3, "from-mo": _3, "from-ms": _3, "from-mt": _3, "from-nc": _3, "from-nd": _3, "from-ne": _3, "from-nh": _3, "from-nj": _3, "from-nm": _3, "from-nv": _3, "from-oh": _3, "from-ok": _3, "from-or": _3, "from-pa": _3, "from-pr": _3, "from-ri": _3, "from-sc": _3, "from-sd": _3, "from-tn": _3, "from-tx": _3, "from-ut": _3, "from-va": _3, "from-vt": _3, "from-wa": _3, "from-wi": _3, "from-wv": _3, "from-wy": _3, "getmyip": _3, "gotdns": _3, "hobby-site": _3, "homelinux": _3, "homeunix": _3, "iamallama": _3, "is-a-anarchist": _3, "is-a-blogger": _3, "is-a-bookkeeper": _3, "is-a-bulls-fan": _3, "is-a-caterer": _3, "is-a-chef": _3, "is-a-conservative": _3, "is-a-cpa": _3, "is-a-cubicle-slave": _3, "is-a-democrat": _3, "is-a-designer": _3, "is-a-doctor": _3, "is-a-financialadvisor": _3, "is-a-geek": _3, "is-a-green": _3, "is-a-guru": _3, "is-a-hard-worker": _3, "is-a-hunter": _3, "is-a-landscaper": _3, "is-a-lawyer": _3, "is-a-liberal": _3, "is-a-libertarian": _3, "is-a-llama": _3, "is-a-musician": _3, "is-a-nascarfan": _3, "is-a-nurse": _3, "is-a-painter": _3, "is-a-personaltrainer": _3, "is-a-photographer": _3, "is-a-player": _3, "is-a-republican": _3, "is-a-rockstar": _3, "is-a-socialist": _3, "is-a-student": _3, "is-a-teacher": _3, "is-a-techie": _3, "is-a-therapist": _3, "is-an-accountant": _3, "is-an-actor": _3, "is-an-actress": _3, "is-an-anarchist": _3, "is-an-artist": _3, "is-an-engineer": _3, "is-an-entertainer": _3, "is-certified": _3, "is-gone": _3, "is-into-anime": _3, "is-into-cars": _3, "is-into-cartoons": _3, "is-into-games": _3, "is-leet": _3, "is-not-certified": _3, "is-slick": _3, "is-uberleet": _3, "is-with-theband": _3, "isa-geek": _3, "isa-hockeynut": _3, "issmarterthanyou": _3, "likes-pie": _3, "likescandy": _3, "neat-url": _3, "saves-the-whales": _3, "selfip": _3, "sells-for-less": _3, "sells-for-u": _3, "servebbs": _3, "simple-url": _3, "space-to-rent": _3, "teaches-yoga": _3, "writesthisblog": _3, "1cooldns": _3, "bumbleshrimp": _3, "ddnsfree": _3, "ddnsgeek": _3, "ddnsguru": _3, "dynuddns": _3, "dynuhosting": _3, "giize": _3, "gleeze": _3, "kozow": _3, "loseyourip": _3, "ooguy": _3, "pivohosting": _3, "theworkpc": _3, "wiredbladehosting": _3, "emergentagent": [0, { "preview": _3 }], "mytuleap": _3, "tuleap-partners": _3, "encoreapi": _3, "evennode": [0, { "eu-1": _3, "eu-2": _3, "eu-3": _3, "eu-4": _3, "us-1": _3, "us-2": _3, "us-3": _3, "us-4": _3 }], "onfabrica": _3, "fastly-edge": _3, "fastly-terrarium": _3, "fastvps-server": _3, "mydobiss": _3, "firebaseapp": _3, "fldrv": _3, "framercanvas": _3, "freebox-os": _3, "freeboxos": _3, "freemyip": _3, "aliases121": _3, "gentapps": _3, "gentlentapis": _3, "githubusercontent": _3, "0emm": _6, "appspot": [2, { "r": _6 }], "blogspot": _3, "codespot": _3, "googleapis": _3, "googlecode": _3, "pagespeedmobilizer": _3, "withgoogle": _3, "withyoutube": _3, "grayjayleagues": _3, "hatenablog": _3, "hatenadiary": _3, "hercules-app": _3, "hercules-dev": _3, "herokuapp": _3, "gr": _3, "smushcdn": _3, "wphostedmail": _3, "wpmucdn": _3, "pixolino": _3, "apps-1and1": _3, "live-website": _3, "webspace-host": _3, "dopaas": _3, "hosted-by-previder": _44, "hosteur": [0, { "rag-cloud": _3, "rag-cloud-ch": _3 }], "ik-server": [0, { "jcloud": _3, "jcloud-ver-jpc": _3 }], "jelastic": [0, { "demo": _3 }], "massivegrid": _44, "wafaicloud": [0, { "jed": _3, "ryd": _3 }], "eu1-plenit": _3, "la1-plenit": _3, "us1-plenit": _3, "webadorsite": _3, "on-forge": _3, "on-vapor": _3, "lpusercontent": _3, "linode": [0, { "members": _3, "nodebalancer": _6 }], "linodeobjects": _6, "linodeusercontent": [0, { "ip": _3 }], "localtonet": _3, "lovableproject": _3, "barsycenter": _3, "barsyonline": _3, "lutrausercontent": _6, "magicpatternsapp": _3, "modelscape": _3, "mwcloudnonprod": _3, "polyspace": _3, "miniserver": _3, "atmeta": _3, "fbsbx": _43, "meteorapp": _45, "routingthecloud": _3, "same-app": _3, "same-preview": _3, "mydbserver": _3, "mochausercontent": _3, "hostedpi": _3, "mythic-beasts": [0, { "caracal": _3, "customer": _3, "fentiger": _3, "lynx": _3, "ocelot": _3, "oncilla": _3, "onza": _3, "sphinx": _3, "vs": _3, "x": _3, "yali": _3 }], "nospamproxy": [0, { "cloud": [2, { "o365": _3 }] }], "4u": _3, "nfshost": _3, "3utilities": _3, "blogsyte": _3, "ciscofreak": _3, "damnserver": _3, "ddnsking": _3, "ditchyourip": _3, "dnsiskinky": _3, "dynns": _3, "geekgalaxy": _3, "health-carereform": _3, "homesecuritymac": _3, "homesecuritypc": _3, "myactivedirectory": _3, "mysecuritycamera": _3, "myvnc": _3, "net-freaks": _3, "onthewifi": _3, "point2this": _3, "quicksytes": _3, "securitytactics": _3, "servebeer": _3, "servecounterstrike": _3, "serveexchange": _3, "serveftp": _3, "servegame": _3, "servehalflife": _3, "servehttp": _3, "servehumour": _3, "serveirc": _3, "servemp3": _3, "servep2p": _3, "servepics": _3, "servequake": _3, "servesarcasm": _3, "stufftoread": _3, "unusualperson": _3, "workisboring": _3, "myiphost": _3, "observableusercontent": [0, { "static": _3 }], "simplesite": _3, "oaiusercontent": _6, "orsites": _3, "operaunite": _3, "customer-oci": [0, { "*": _3, "oci": _6, "ocp": _6, "ocs": _6 }], "oraclecloudapps": _6, "oraclegovcloudapps": _6, "authgear-staging": _3, "authgearapps": _3, "outsystemscloud": _3, "ownprovider": _3, "pgfog": _3, "pagexl": _3, "gotpantheon": _3, "paywhirl": _6, "forgeblocks": _3, "upsunapp": _3, "postman-echo": _3, "prgmr": [0, { "xen": _3 }], "project-study": [0, { "dev": _3 }], "pythonanywhere": _45, "qa2": _3, "alpha-myqnapcloud": _3, "dev-myqnapcloud": _3, "mycloudnas": _3, "mynascloud": _3, "myqnapcloud": _3, "qualifioapp": _3, "ladesk": _3, "qualyhqpartner": _6, "qualyhqportal": _6, "qbuser": _3, "quipelements": _6, "rackmaze": _3, "readthedocs-hosted": _3, "rhcloud": _3, "onrender": _3, "render": _46, "subsc-pay": _3, "180r": _3, "dojin": _3, "sakuratan": _3, "sakuraweb": _3, "x0": _3, "code": [0, { "builder": _6, "dev-builder": _6, "stg-builder": _6 }], "salesforce": [0, { "platform": [0, { "code-builder-stg": [0, { "test": [0, { "001": _6 }] }] }] }], "logoip": _3, "scrysec": _3, "firewall-gateway": _3, "myshopblocks": _3, "myshopify": _3, "shopitsite": _3, "1kapp": _3, "appchizi": _3, "applinzi": _3, "sinaapp": _3, "vipsinaapp": _3, "streamlitapp": _3, "try-snowplow": _3, "playstation-cloud": _3, "myspreadshop": _3, "w-corp-staticblitz": _3, "w-credentialless-staticblitz": _3, "w-staticblitz": _3, "stackhero-network": _3, "stdlib": [0, { "api": _3 }], "strapiapp": [2, { "media": _3 }], "streak-link": _3, "streaklinks": _3, "streakusercontent": _3, "temp-dns": _3, "dsmynas": _3, "familyds": _3, "mytabit": _3, "taveusercontent": _3, "tb-hosting": _47, "reservd": _3, "thingdustdata": _3, "townnews-staging": _3, "typeform": [0, { "pro": _3 }], "hk": _3, "it": _3, "deus-canvas": _3, "vultrobjects": _6, "wafflecell": _3, "hotelwithflight": _3, "reserve-online": _3, "cprapid": _3, "pleskns": _3, "remotewd": _3, "wiardweb": [0, { "pages": _3 }], "drive-platform": _3, "base44-sandbox": _3, "wixsite": _3, "wixstudio": _3, "messwithdns": _3, "woltlab-demo": _3, "wpenginepowered": [2, { "js": _3 }], "xnbay": [2, { "u2": _3, "u2-local": _3 }], "xtooldevice": _3, "yolasite": _3 }], "coop": _2, "cr": [1, { "ac": _2, "co": _2, "ed": _2, "fi": _2, "go": _2, "or": _2, "sa": _2 }], "cu": [1, { "com": _2, "edu": _2, "gob": _2, "inf": _2, "nat": _2, "net": _2, "org": _2 }], "cv": [1, { "com": _2, "edu": _2, "id": _2, "int": _2, "net": _2, "nome": _2, "org": _2, "publ": _2 }], "cw": _48, "cx": [1, { "gov": _2, "cloudns": _3, "ath": _3, "info": _3, "assessments": _3, "calculators": _3, "funnels": _3, "paynow": _3, "quizzes": _3, "researched": _3, "tests": _3 }], "cy": [1, { "ac": _2, "biz": _2, "com": [1, { "scaleforce": _49 }], "ekloges": _2, "gov": _2, "ltd": _2, "mil": _2, "net": _2, "org": _2, "press": _2, "pro": _2, "tm": _2 }], "cz": [1, { "gov": _2, "contentproxy9": [0, { "rsc": _3 }], "realm": _3, "e4": _3, "co": _3, "metacentrum": [0, { "cloud": _6, "custom": _3 }], "muni": [0, { "cloud": [0, { "flt": _3, "usr": _3 }] }] }], "de": [1, { "bplaced": _3, "square7": _3, "bwcloud-os-instance": _6, "com": _3, "cosidns": _50, "dnsupdater": _3, "dynamisches-dns": _3, "internet-dns": _3, "l-o-g-i-n": _3, "ddnss": [2, { "dyn": _3, "dyndns": _3 }], "dyn-ip24": _3, "dyndns1": _3, "home-webserver": [2, { "dyn": _3 }], "myhome-server": _3, "dnshome": _3, "fuettertdasnetz": _3, "isteingeek": _3, "istmein": _3, "lebtimnetz": _3, "leitungsen": _3, "traeumtgerade": _3, "frusky": _6, "goip": _3, "xn--gnstigbestellen-zvb": _3, "g\xFCnstigbestellen": _3, "xn--gnstigliefern-wob": _3, "g\xFCnstigliefern": _3, "hs-heilbronn": [0, { "it": [0, { "pages": _3, "pages-research": _3 }] }], "dyn-berlin": _3, "in-berlin": _3, "in-brb": _3, "in-butter": _3, "in-dsl": _3, "in-vpn": _3, "iservschule": _3, "mein-iserv": _3, "schuldock": _3, "schulplattform": _3, "schulserver": _3, "test-iserv": _3, "keymachine": _3, "co": _3, "git-repos": _3, "lcube-server": _3, "svn-repos": _3, "barsy": _3, "webspaceconfig": _3, "123webseite": _3, "rub": _3, "ruhr-uni-bochum": [2, { "noc": [0, { "io": _3 }] }], "logoip": _3, "firewall-gateway": _3, "my-gateway": _3, "my-router": _3, "spdns": _3, "my": _3, "speedpartner": [0, { "customer": _3 }], "myspreadshop": _3, "taifun-dns": _3, "12hp": _3, "2ix": _3, "4lima": _3, "lima-city": _3, "virtual-user": _3, "virtualuser": _3, "community-pro": _3, "diskussionsbereich": _3, "xenonconnect": _6 }], "dj": _2, "dk": [1, { "biz": _3, "co": _3, "firm": _3, "reg": _3, "store": _3, "123hjemmeside": _3, "myspreadshop": _3 }], "dm": _52, "do": [1, { "art": _2, "com": _2, "edu": _2, "gob": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "sld": _2, "web": _2 }], "dz": [1, { "art": _2, "asso": _2, "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "pol": _2, "soc": _2, "tm": _2 }], "ec": [1, { "abg": _2, "adm": _2, "agron": _2, "arqt": _2, "art": _2, "bar": _2, "chef": _2, "com": _2, "cont": _2, "cpa": _2, "cue": _2, "dent": _2, "dgn": _2, "disco": _2, "doc": _2, "edu": _2, "eng": _2, "esm": _2, "fin": _2, "fot": _2, "gal": _2, "gob": _2, "gov": _2, "gye": _2, "ibr": _2, "info": _2, "k12": _2, "lat": _2, "loj": _2, "med": _2, "mil": _2, "mktg": _2, "mon": _2, "net": _2, "ntr": _2, "odont": _2, "org": _2, "pro": _2, "prof": _2, "psic": _2, "psiq": _2, "pub": _2, "rio": _2, "rrpp": _2, "sal": _2, "tech": _2, "tul": _2, "tur": _2, "uio": _2, "vet": _2, "xxx": _2, "base": _3, "official": _3 }], "edu": [1, { "rit": [0, { "git-pages": _3 }] }], "ee": [1, { "aip": _2, "com": _2, "edu": _2, "fie": _2, "gov": _2, "lib": _2, "med": _2, "org": _2, "pri": _2, "riik": _2 }], "eg": [1, { "ac": _2, "com": _2, "edu": _2, "eun": _2, "gov": _2, "info": _2, "me": _2, "mil": _2, "name": _2, "net": _2, "org": _2, "sci": _2, "sport": _2, "tv": _2 }], "er": _21, "es": [1, { "com": _2, "edu": _2, "gob": _2, "nom": _2, "org": _2, "123miweb": _3, "myspreadshop": _3 }], "et": [1, { "biz": _2, "com": _2, "edu": _2, "gov": _2, "info": _2, "name": _2, "net": _2, "org": _2 }], "eu": [1, { "amazonwebservices": [0, { "on": [0, { "eusc-de-east-1": [0, { "cognito-idp": _40 }] }] }], "cloudns": _3, "prvw": _3, "deuxfleurs": _3, "dogado": [0, { "jelastic": _3 }], "barsy": _3, "spdns": _3, "nxa": _6, "directwp": _3, "transurl": _6 }], "fi": [1, { "aland": _2, "dy": _3, "xn--hkkinen-5wa": _3, "h\xE4kkinen": _3, "iki": _3, "cloudplatform": [0, { "fi": _3 }], "datacenter": [0, { "demo": _3, "paas": _3 }], "kapsi": _3, "123kotisivu": _3, "myspreadshop": _3 }], "fj": [1, { "ac": _2, "biz": _2, "com": _2, "edu": _2, "gov": _2, "id": _2, "info": _2, "mil": _2, "name": _2, "net": _2, "org": _2, "pro": _2 }], "fk": _21, "fm": [1, { "com": _2, "edu": _2, "net": _2, "org": _2, "radio": _3, "user": _6 }], "fo": _2, "fr": [1, { "asso": _2, "com": _2, "gouv": _2, "nom": _2, "prd": _2, "tm": _2, "avoues": _2, "cci": _2, "greta": _2, "huissier-justice": _2, "fbx-os": _3, "fbxos": _3, "freebox-os": _3, "freeboxos": _3, "goupile": _3, "kdns": _3, "123siteweb": _3, "on-web": _3, "chirurgiens-dentistes-en-france": _3, "dedibox": _3, "aeroport": _3, "avocat": _3, "chambagri": _3, "chirurgiens-dentistes": _3, "experts-comptables": _3, "medecin": _3, "notaires": _3, "pharmacien": _3, "port": _3, "veterinaire": _3, "myspreadshop": _3, "ynh": _3 }], "ga": _2, "gb": _2, "gd": [1, { "edu": _2, "gov": _2 }], "ge": [1, { "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "pvt": _2, "school": _2 }], "gf": _2, "gg": [1, { "co": _2, "net": _2, "org": _2, "ply": [0, { "at": _6, "d6": _3 }], "botdash": _3, "kaas": _3, "stackit": _3, "panel": [2, { "daemon": _3 }] }], "gh": [1, { "biz": _2, "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2 }], "gi": [1, { "com": _2, "edu": _2, "gov": _2, "ltd": _2, "mod": _2, "org": _2 }], "gl": [1, { "co": _2, "com": _2, "edu": _2, "net": _2, "org": _2 }], "gm": _2, "gn": [1, { "ac": _2, "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2 }], "gov": _2, "gp": [1, { "asso": _2, "com": _2, "edu": _2, "mobi": _2, "net": _2, "org": _2 }], "gq": _2, "gr": [1, { "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "barsy": _3, "simplesite": _3 }], "gs": _2, "gt": [1, { "com": _2, "edu": _2, "gob": _2, "ind": _2, "mil": _2, "net": _2, "org": _2 }], "gu": [1, { "com": _2, "edu": _2, "gov": _2, "guam": _2, "info": _2, "net": _2, "org": _2, "web": _2 }], "gw": [1, { "nx": _3 }], "gy": _52, "hk": [1, { "com": _2, "edu": _2, "gov": _2, "idv": _2, "net": _2, "org": _2, "xn--ciqpn": _2, "\u4E2A\u4EBA": _2, "xn--gmqw5a": _2, "\u500B\u4EBA": _2, "xn--55qx5d": _2, "\u516C\u53F8": _2, "xn--mxtq1m": _2, "\u653F\u5E9C": _2, "xn--lcvr32d": _2, "\u654E\u80B2": _2, "xn--wcvs22d": _2, "\u6559\u80B2": _2, "xn--gmq050i": _2, "\u7B87\u4EBA": _2, "xn--uc0atv": _2, "\u7D44\u7E54": _2, "xn--uc0ay4a": _2, "\u7D44\u7EC7": _2, "xn--od0alg": _2, "\u7DB2\u7D61": _2, "xn--zf0avx": _2, "\u7DB2\u7EDC": _2, "xn--mk0axi": _2, "\u7EC4\u7E54": _2, "xn--tn0ag": _2, "\u7EC4\u7EC7": _2, "xn--od0aq3b": _2, "\u7F51\u7D61": _2, "xn--io0a7i": _2, "\u7F51\u7EDC": _2, "inc": _3, "ltd": _3 }], "hm": _2, "hn": [1, { "com": _2, "edu": _2, "gob": _2, "mil": _2, "net": _2, "org": _2 }], "hr": [1, { "com": _2, "from": _2, "iz": _2, "name": _2, "brendly": _20 }], "ht": [1, { "adult": _2, "art": _2, "asso": _2, "com": _2, "coop": _2, "edu": _2, "firm": _2, "gouv": _2, "info": _2, "med": _2, "net": _2, "org": _2, "perso": _2, "pol": _2, "pro": _2, "rel": _2, "shop": _2, "rt": _3 }], "hu": [1, { "2000": _2, "agrar": _2, "bolt": _2, "casino": _2, "city": _2, "co": _2, "erotica": _2, "erotika": _2, "film": _2, "forum": _2, "games": _2, "hotel": _2, "info": _2, "ingatlan": _2, "jogasz": _2, "konyvelo": _2, "lakas": _2, "media": _2, "news": _2, "org": _2, "priv": _2, "reklam": _2, "sex": _2, "shop": _2, "sport": _2, "suli": _2, "szex": _2, "tm": _2, "tozsde": _2, "utazas": _2, "video": _2 }], "id": [1, { "ac": _2, "biz": _2, "co": _2, "desa": _2, "go": _2, "kop": _2, "mil": _2, "my": _2, "net": _2, "or": _2, "ponpes": _2, "sch": _2, "web": _2, "xn--9tfky": _2, "\u1B29\u1B2E\u1B36": _2, "e": _3, "zone": _3 }], "ie": [1, { "gov": _2, "myspreadshop": _3 }], "il": [1, { "ac": _2, "co": [1, { "ravpage": _3, "mytabit": _3, "tabitorder": _3 }], "gov": _2, "idf": _2, "k12": _2, "muni": _2, "net": _2, "org": _2 }], "xn--4dbrk0ce": [1, { "xn--4dbgdty6c": _2, "xn--5dbhl8d": _2, "xn--8dbq2a": _2, "xn--hebda8b": _2 }], "\u05D9\u05E9\u05E8\u05D0\u05DC": [1, { "\u05D0\u05E7\u05D3\u05DE\u05D9\u05D4": _2, "\u05D9\u05E9\u05D5\u05D1": _2, "\u05E6\u05D4\u05DC": _2, "\u05DE\u05DE\u05E9\u05DC": _2 }], "im": [1, { "ac": _2, "co": [1, { "ltd": _2, "plc": _2 }], "com": _2, "net": _2, "org": _2, "tt": _2, "tv": _2 }], "in": [1, { "5g": _2, "6g": _2, "ac": _2, "ai": _2, "am": _2, "bank": _2, "bihar": _2, "biz": _2, "business": _2, "ca": _2, "cn": _2, "co": _2, "com": _2, "coop": _2, "cs": _2, "delhi": _2, "dr": _2, "edu": _2, "er": _2, "fin": _2, "firm": _2, "gen": _2, "gov": _2, "gujarat": _2, "ind": _2, "info": _2, "int": _2, "internet": _2, "io": _2, "me": _2, "mil": _2, "net": _2, "nic": _2, "org": _2, "pg": _2, "post": _2, "pro": _2, "res": _2, "travel": _2, "tv": _2, "uk": _2, "up": _2, "us": _2, "cloudns": _3, "barsy": _3, "web": _3, "indevs": _3, "supabase": _3 }], "info": [1, { "cloudns": _3, "dynamic-dns": _3, "barrel-of-knowledge": _3, "barrell-of-knowledge": _3, "dyndns": _3, "for-our": _3, "groks-the": _3, "groks-this": _3, "here-for-more": _3, "knowsitall": _3, "selfip": _3, "webhop": _3, "barsy": _3, "mayfirst": _3, "mittwald": _3, "mittwaldserver": _3, "typo3server": _3, "dvrcam": _3, "ilovecollege": _3, "no-ip": _3, "forumz": _3, "nsupdate": _3, "dnsupdate": _3, "v-info": _3 }], "int": [1, { "eu": _2 }], "io": [1, { "2038": _3, "co": _2, "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "nom": _2, "org": _2, "on-acorn": _6, "myaddr": _3, "apigee": _3, "b-data": _3, "beagleboard": _3, "bitbucket": _3, "bluebite": _3, "boxfuse": _3, "brave": _7, "browsersafetymark": _3, "bubble": _56, "bubbleapps": _3, "bigv": [0, { "uk0": _3 }], "cleverapps": _3, "cloudbeesusercontent": _3, "dappnode": [0, { "dyndns": _3 }], "darklang": _3, "definima": _3, "dedyn": _3, "icp0": _57, "icp1": _57, "qzz": _3, "fh-muenster": _3, "gitbook": _3, "github": _3, "gitlab": _3, "lolipop": _3, "hasura-app": _3, "hostyhosting": _3, "hypernode": _3, "moonscale": _6, "beebyte": _44, "beebyteapp": [0, { "sekd1": _3 }], "jele": _3, "keenetic": _3, "kiloapps": _3, "webthings": _3, "loginline": _3, "barsy": _3, "azurecontainer": _6, "ngrok": [2, { "ap": _3, "au": _3, "eu": _3, "in": _3, "jp": _3, "sa": _3, "us": _3 }], "nodeart": [0, { "stage": _3 }], "pantheonsite": _3, "forgerock": [0, { "id": _3 }], "pstmn": [2, { "mock": _3 }], "protonet": _3, "qcx": [2, { "sys": _6 }], "qoto": _3, "vaporcloud": _3, "myrdbx": _3, "rb-hosting": _47, "on-k3s": _6, "on-rio": _6, "readthedocs": _3, "resindevice": _3, "resinstaging": [0, { "devices": _3 }], "hzc": _3, "sandcats": _3, "scrypted": [0, { "client": _3 }], "mo-siemens": _3, "lair": _43, "stolos": _6, "musician": _3, "utwente": _3, "edugit": _3, "telebit": _3, "thingdust": [0, { "dev": _58, "disrec": _58, "prod": _59, "testing": _58 }], "tickets": _3, "webflow": _3, "webflowtest": _3, "drive-platform": _3, "editorx": _3, "wixstudio": _3, "basicserver": _3, "virtualserver": _3 }], "iq": _5, "ir": [1, { "ac": _2, "co": _2, "gov": _2, "id": _2, "net": _2, "org": _2, "sch": _2, "xn--mgba3a4f16a": _2, "\u0627\u06CC\u0631\u0627\u0646": _2, "xn--mgba3a4fra": _2, "\u0627\u064A\u0631\u0627\u0646": _2, "arvanedge": _3, "vistablog": _3 }], "is": _2, "it": [1, { "edu": _2, "gov": _2, "abr": _2, "abruzzo": _2, "aosta-valley": _2, "aostavalley": _2, "bas": _2, "basilicata": _2, "cal": _2, "calabria": _2, "cam": _2, "campania": _2, "emilia-romagna": _2, "emiliaromagna": _2, "emr": _2, "friuli-v-giulia": _2, "friuli-ve-giulia": _2, "friuli-vegiulia": _2, "friuli-venezia-giulia": _2, "friuli-veneziagiulia": _2, "friuli-vgiulia": _2, "friuliv-giulia": _2, "friulive-giulia": _2, "friulivegiulia": _2, "friulivenezia-giulia": _2, "friuliveneziagiulia": _2, "friulivgiulia": _2, "fvg": _2, "laz": _2, "lazio": _2, "lig": _2, "liguria": _2, "lom": _2, "lombardia": _2, "lombardy": _2, "lucania": _2, "mar": _2, "marche": _2, "mol": _2, "molise": _2, "piedmont": _2, "piemonte": _2, "pmn": _2, "pug": _2, "puglia": _2, "sar": _2, "sardegna": _2, "sardinia": _2, "sic": _2, "sicilia": _2, "sicily": _2, "taa": _2, "tos": _2, "toscana": _2, "trentin-sud-tirol": _2, "xn--trentin-sd-tirol-rzb": _2, "trentin-s\xFCd-tirol": _2, "trentin-sudtirol": _2, "xn--trentin-sdtirol-7vb": _2, "trentin-s\xFCdtirol": _2, "trentin-sued-tirol": _2, "trentin-suedtirol": _2, "trentino": _2, "trentino-a-adige": _2, "trentino-aadige": _2, "trentino-alto-adige": _2, "trentino-altoadige": _2, "trentino-s-tirol": _2, "trentino-stirol": _2, "trentino-sud-tirol": _2, "xn--trentino-sd-tirol-c3b": _2, "trentino-s\xFCd-tirol": _2, "trentino-sudtirol": _2, "xn--trentino-sdtirol-szb": _2, "trentino-s\xFCdtirol": _2, "trentino-sued-tirol": _2, "trentino-suedtirol": _2, "trentinoa-adige": _2, "trentinoaadige": _2, "trentinoalto-adige": _2, "trentinoaltoadige": _2, "trentinos-tirol": _2, "trentinostirol": _2, "trentinosud-tirol": _2, "xn--trentinosd-tirol-rzb": _2, "trentinos\xFCd-tirol": _2, "trentinosudtirol": _2, "xn--trentinosdtirol-7vb": _2, "trentinos\xFCdtirol": _2, "trentinosued-tirol": _2, "trentinosuedtirol": _2, "trentinsud-tirol": _2, "xn--trentinsd-tirol-6vb": _2, "trentins\xFCd-tirol": _2, "trentinsudtirol": _2, "xn--trentinsdtirol-nsb": _2, "trentins\xFCdtirol": _2, "trentinsued-tirol": _2, "trentinsuedtirol": _2, "tuscany": _2, "umb": _2, "umbria": _2, "val-d-aosta": _2, "val-daosta": _2, "vald-aosta": _2, "valdaosta": _2, "valle-aosta": _2, "valle-d-aosta": _2, "valle-daosta": _2, "valleaosta": _2, "valled-aosta": _2, "valledaosta": _2, "vallee-aoste": _2, "xn--valle-aoste-ebb": _2, "vall\xE9e-aoste": _2, "vallee-d-aoste": _2, "xn--valle-d-aoste-ehb": _2, "vall\xE9e-d-aoste": _2, "valleeaoste": _2, "xn--valleaoste-e7a": _2, "vall\xE9eaoste": _2, "valleedaoste": _2, "xn--valledaoste-ebb": _2, "vall\xE9edaoste": _2, "vao": _2, "vda": _2, "ven": _2, "veneto": _2, "ag": _2, "agrigento": _2, "al": _2, "alessandria": _2, "alto-adige": _2, "altoadige": _2, "an": _2, "ancona": _2, "andria-barletta-trani": _2, "andria-trani-barletta": _2, "andriabarlettatrani": _2, "andriatranibarletta": _2, "ao": _2, "aosta": _2, "aoste": _2, "ap": _2, "aq": _2, "aquila": _2, "ar": _2, "arezzo": _2, "ascoli-piceno": _2, "ascolipiceno": _2, "asti": _2, "at": _2, "av": _2, "avellino": _2, "ba": _2, "balsan": _2, "balsan-sudtirol": _2, "xn--balsan-sdtirol-nsb": _2, "balsan-s\xFCdtirol": _2, "balsan-suedtirol": _2, "bari": _2, "barletta-trani-andria": _2, "barlettatraniandria": _2, "belluno": _2, "benevento": _2, "bergamo": _2, "bg": _2, "bi": _2, "biella": _2, "bl": _2, "bn": _2, "bo": _2, "bologna": _2, "bolzano": _2, "bolzano-altoadige": _2, "bozen": _2, "bozen-sudtirol": _2, "xn--bozen-sdtirol-2ob": _2, "bozen-s\xFCdtirol": _2, "bozen-suedtirol": _2, "br": _2, "brescia": _2, "brindisi": _2, "bs": _2, "bt": _2, "bulsan": _2, "bulsan-sudtirol": _2, "xn--bulsan-sdtirol-nsb": _2, "bulsan-s\xFCdtirol": _2, "bulsan-suedtirol": _2, "bz": _2, "ca": _2, "cagliari": _2, "caltanissetta": _2, "campidano-medio": _2, "campidanomedio": _2, "campobasso": _2, "carbonia-iglesias": _2, "carboniaiglesias": _2, "carrara-massa": _2, "carraramassa": _2, "caserta": _2, "catania": _2, "catanzaro": _2, "cb": _2, "ce": _2, "cesena-forli": _2, "xn--cesena-forl-mcb": _2, "cesena-forl\xEC": _2, "cesenaforli": _2, "xn--cesenaforl-i8a": _2, "cesenaforl\xEC": _2, "ch": _2, "chieti": _2, "ci": _2, "cl": _2, "cn": _2, "co": _2, "como": _2, "cosenza": _2, "cr": _2, "cremona": _2, "crotone": _2, "cs": _2, "ct": _2, "cuneo": _2, "cz": _2, "dell-ogliastra": _2, "dellogliastra": _2, "en": _2, "enna": _2, "fc": _2, "fe": _2, "fermo": _2, "ferrara": _2, "fg": _2, "fi": _2, "firenze": _2, "florence": _2, "fm": _2, "foggia": _2, "forli-cesena": _2, "xn--forl-cesena-fcb": _2, "forl\xEC-cesena": _2, "forlicesena": _2, "xn--forlcesena-c8a": _2, "forl\xECcesena": _2, "fr": _2, "frosinone": _2, "ge": _2, "genoa": _2, "genova": _2, "go": _2, "gorizia": _2, "gr": _2, "grosseto": _2, "iglesias-carbonia": _2, "iglesiascarbonia": _2, "im": _2, "imperia": _2, "is": _2, "isernia": _2, "kr": _2, "la-spezia": _2, "laquila": _2, "laspezia": _2, "latina": _2, "lc": _2, "le": _2, "lecce": _2, "lecco": _2, "li": _2, "livorno": _2, "lo": _2, "lodi": _2, "lt": _2, "lu": _2, "lucca": _2, "macerata": _2, "mantova": _2, "massa-carrara": _2, "massacarrara": _2, "matera": _2, "mb": _2, "mc": _2, "me": _2, "medio-campidano": _2, "mediocampidano": _2, "messina": _2, "mi": _2, "milan": _2, "milano": _2, "mn": _2, "mo": _2, "modena": _2, "monza": _2, "monza-brianza": _2, "monza-e-della-brianza": _2, "monzabrianza": _2, "monzaebrianza": _2, "monzaedellabrianza": _2, "ms": _2, "mt": _2, "na": _2, "naples": _2, "napoli": _2, "no": _2, "novara": _2, "nu": _2, "nuoro": _2, "og": _2, "ogliastra": _2, "olbia-tempio": _2, "olbiatempio": _2, "or": _2, "oristano": _2, "ot": _2, "pa": _2, "padova": _2, "padua": _2, "palermo": _2, "parma": _2, "pavia": _2, "pc": _2, "pd": _2, "pe": _2, "perugia": _2, "pesaro-urbino": _2, "pesarourbino": _2, "pescara": _2, "pg": _2, "pi": _2, "piacenza": _2, "pisa": _2, "pistoia": _2, "pn": _2, "po": _2, "pordenone": _2, "potenza": _2, "pr": _2, "prato": _2, "pt": _2, "pu": _2, "pv": _2, "pz": _2, "ra": _2, "ragusa": _2, "ravenna": _2, "rc": _2, "re": _2, "reggio-calabria": _2, "reggio-emilia": _2, "reggiocalabria": _2, "reggioemilia": _2, "rg": _2, "ri": _2, "rieti": _2, "rimini": _2, "rm": _2, "rn": _2, "ro": _2, "roma": _2, "rome": _2, "rovigo": _2, "sa": _2, "salerno": _2, "sassari": _2, "savona": _2, "si": _2, "siena": _2, "siracusa": _2, "so": _2, "sondrio": _2, "sp": _2, "sr": _2, "ss": _2, "xn--sdtirol-n2a": _2, "s\xFCdtirol": _2, "suedtirol": _2, "sv": _2, "ta": _2, "taranto": _2, "te": _2, "tempio-olbia": _2, "tempioolbia": _2, "teramo": _2, "terni": _2, "tn": _2, "to": _2, "torino": _2, "tp": _2, "tr": _2, "trani-andria-barletta": _2, "trani-barletta-andria": _2, "traniandriabarletta": _2, "tranibarlettaandria": _2, "trapani": _2, "trento": _2, "treviso": _2, "trieste": _2, "ts": _2, "turin": _2, "tv": _2, "ud": _2, "udine": _2, "urbino-pesaro": _2, "urbinopesaro": _2, "va": _2, "varese": _2, "vb": _2, "vc": _2, "ve": _2, "venezia": _2, "venice": _2, "verbania": _2, "vercelli": _2, "verona": _2, "vi": _2, "vibo-valentia": _2, "vibovalentia": _2, "vicenza": _2, "viterbo": _2, "vr": _2, "vs": _2, "vt": _2, "vv": _2, "ibxos": _3, "iliadboxos": _3, "neen": [0, { "jc": _3 }], "123homepage": _3, "16-b": _3, "32-b": _3, "64-b": _3, "myspreadshop": _3, "syncloud": _3 }], "je": [1, { "co": _2, "net": _2, "org": _2, "of": _3 }], "jm": _21, "jo": [1, { "agri": _2, "ai": _2, "com": _2, "edu": _2, "eng": _2, "fm": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "per": _2, "phd": _2, "sch": _2, "tv": _2 }], "jobs": _2, "jp": [1, { "ac": _2, "ad": _2, "co": _2, "ed": _2, "go": _2, "gr": _2, "lg": _2, "ne": [1, { "aseinet": _54, "gehirn": _3, "ivory": _3, "mail-box": _3, "mints": _3, "mokuren": _3, "opal": _3, "sakura": _3, "sumomo": _3, "topaz": _3 }], "or": _2, "aichi": [1, { "aisai": _2, "ama": _2, "anjo": _2, "asuke": _2, "chiryu": _2, "chita": _2, "fuso": _2, "gamagori": _2, "handa": _2, "hazu": _2, "hekinan": _2, "higashiura": _2, "ichinomiya": _2, "inazawa": _2, "inuyama": _2, "isshiki": _2, "iwakura": _2, "kanie": _2, "kariya": _2, "kasugai": _2, "kira": _2, "kiyosu": _2, "komaki": _2, "konan": _2, "kota": _2, "mihama": _2, "miyoshi": _2, "nishio": _2, "nisshin": _2, "obu": _2, "oguchi": _2, "oharu": _2, "okazaki": _2, "owariasahi": _2, "seto": _2, "shikatsu": _2, "shinshiro": _2, "shitara": _2, "tahara": _2, "takahama": _2, "tobishima": _2, "toei": _2, "togo": _2, "tokai": _2, "tokoname": _2, "toyoake": _2, "toyohashi": _2, "toyokawa": _2, "toyone": _2, "toyota": _2, "tsushima": _2, "yatomi": _2 }], "akita": [1, { "akita": _2, "daisen": _2, "fujisato": _2, "gojome": _2, "hachirogata": _2, "happou": _2, "higashinaruse": _2, "honjo": _2, "honjyo": _2, "ikawa": _2, "kamikoani": _2, "kamioka": _2, "katagami": _2, "kazuno": _2, "kitaakita": _2, "kosaka": _2, "kyowa": _2, "misato": _2, "mitane": _2, "moriyoshi": _2, "nikaho": _2, "noshiro": _2, "odate": _2, "oga": _2, "ogata": _2, "semboku": _2, "yokote": _2, "yurihonjo": _2 }], "aomori": [1, { "aomori": _2, "gonohe": _2, "hachinohe": _2, "hashikami": _2, "hiranai": _2, "hirosaki": _2, "itayanagi": _2, "kuroishi": _2, "misawa": _2, "mutsu": _2, "nakadomari": _2, "noheji": _2, "oirase": _2, "owani": _2, "rokunohe": _2, "sannohe": _2, "shichinohe": _2, "shingo": _2, "takko": _2, "towada": _2, "tsugaru": _2, "tsuruta": _2 }], "chiba": [1, { "abiko": _2, "asahi": _2, "chonan": _2, "chosei": _2, "choshi": _2, "chuo": _2, "funabashi": _2, "futtsu": _2, "hanamigawa": _2, "ichihara": _2, "ichikawa": _2, "ichinomiya": _2, "inzai": _2, "isumi": _2, "kamagaya": _2, "kamogawa": _2, "kashiwa": _2, "katori": _2, "katsuura": _2, "kimitsu": _2, "kisarazu": _2, "kozaki": _2, "kujukuri": _2, "kyonan": _2, "matsudo": _2, "midori": _2, "mihama": _2, "minamiboso": _2, "mobara": _2, "mutsuzawa": _2, "nagara": _2, "nagareyama": _2, "narashino": _2, "narita": _2, "noda": _2, "oamishirasato": _2, "omigawa": _2, "onjuku": _2, "otaki": _2, "sakae": _2, "sakura": _2, "shimofusa": _2, "shirako": _2, "shiroi": _2, "shisui": _2, "sodegaura": _2, "sosa": _2, "tako": _2, "tateyama": _2, "togane": _2, "tohnosho": _2, "tomisato": _2, "urayasu": _2, "yachimata": _2, "yachiyo": _2, "yokaichiba": _2, "yokoshibahikari": _2, "yotsukaido": _2 }], "ehime": [1, { "ainan": _2, "honai": _2, "ikata": _2, "imabari": _2, "iyo": _2, "kamijima": _2, "kihoku": _2, "kumakogen": _2, "masaki": _2, "matsuno": _2, "matsuyama": _2, "namikata": _2, "niihama": _2, "ozu": _2, "saijo": _2, "seiyo": _2, "shikokuchuo": _2, "tobe": _2, "toon": _2, "uchiko": _2, "uwajima": _2, "yawatahama": _2 }], "fukui": [1, { "echizen": _2, "eiheiji": _2, "fukui": _2, "ikeda": _2, "katsuyama": _2, "mihama": _2, "minamiechizen": _2, "obama": _2, "ohi": _2, "ono": _2, "sabae": _2, "sakai": _2, "takahama": _2, "tsuruga": _2, "wakasa": _2 }], "fukuoka": [1, { "ashiya": _2, "buzen": _2, "chikugo": _2, "chikuho": _2, "chikujo": _2, "chikushino": _2, "chikuzen": _2, "chuo": _2, "dazaifu": _2, "fukuchi": _2, "hakata": _2, "higashi": _2, "hirokawa": _2, "hisayama": _2, "iizuka": _2, "inatsuki": _2, "kaho": _2, "kasuga": _2, "kasuya": _2, "kawara": _2, "keisen": _2, "koga": _2, "kurate": _2, "kurogi": _2, "kurume": _2, "minami": _2, "miyako": _2, "miyama": _2, "miyawaka": _2, "mizumaki": _2, "munakata": _2, "nakagawa": _2, "nakama": _2, "nishi": _2, "nogata": _2, "ogori": _2, "okagaki": _2, "okawa": _2, "oki": _2, "omuta": _2, "onga": _2, "onojo": _2, "oto": _2, "saigawa": _2, "sasaguri": _2, "shingu": _2, "shinyoshitomi": _2, "shonai": _2, "soeda": _2, "sue": _2, "tachiarai": _2, "tagawa": _2, "takata": _2, "toho": _2, "toyotsu": _2, "tsuiki": _2, "ukiha": _2, "umi": _2, "usui": _2, "yamada": _2, "yame": _2, "yanagawa": _2, "yukuhashi": _2 }], "fukushima": [1, { "aizubange": _2, "aizumisato": _2, "aizuwakamatsu": _2, "asakawa": _2, "bandai": _2, "date": _2, "fukushima": _2, "furudono": _2, "futaba": _2, "hanawa": _2, "higashi": _2, "hirata": _2, "hirono": _2, "iitate": _2, "inawashiro": _2, "ishikawa": _2, "iwaki": _2, "izumizaki": _2, "kagamiishi": _2, "kaneyama": _2, "kawamata": _2, "kitakata": _2, "kitashiobara": _2, "koori": _2, "koriyama": _2, "kunimi": _2, "miharu": _2, "mishima": _2, "namie": _2, "nango": _2, "nishiaizu": _2, "nishigo": _2, "okuma": _2, "omotego": _2, "ono": _2, "otama": _2, "samegawa": _2, "shimogo": _2, "shirakawa": _2, "showa": _2, "soma": _2, "sukagawa": _2, "taishin": _2, "tamakawa": _2, "tanagura": _2, "tenei": _2, "yabuki": _2, "yamato": _2, "yamatsuri": _2, "yanaizu": _2, "yugawa": _2 }], "gifu": [1, { "anpachi": _2, "ena": _2, "gifu": _2, "ginan": _2, "godo": _2, "gujo": _2, "hashima": _2, "hichiso": _2, "hida": _2, "higashishirakawa": _2, "ibigawa": _2, "ikeda": _2, "kakamigahara": _2, "kani": _2, "kasahara": _2, "kasamatsu": _2, "kawaue": _2, "kitagata": _2, "mino": _2, "minokamo": _2, "mitake": _2, "mizunami": _2, "motosu": _2, "nakatsugawa": _2, "ogaki": _2, "sakahogi": _2, "seki": _2, "sekigahara": _2, "shirakawa": _2, "tajimi": _2, "takayama": _2, "tarui": _2, "toki": _2, "tomika": _2, "wanouchi": _2, "yamagata": _2, "yaotsu": _2, "yoro": _2 }], "gunma": [1, { "annaka": _2, "chiyoda": _2, "fujioka": _2, "higashiagatsuma": _2, "isesaki": _2, "itakura": _2, "kanna": _2, "kanra": _2, "katashina": _2, "kawaba": _2, "kiryu": _2, "kusatsu": _2, "maebashi": _2, "meiwa": _2, "midori": _2, "minakami": _2, "naganohara": _2, "nakanojo": _2, "nanmoku": _2, "numata": _2, "oizumi": _2, "ora": _2, "ota": _2, "shibukawa": _2, "shimonita": _2, "shinto": _2, "showa": _2, "takasaki": _2, "takayama": _2, "tamamura": _2, "tatebayashi": _2, "tomioka": _2, "tsukiyono": _2, "tsumagoi": _2, "ueno": _2, "yoshioka": _2 }], "hiroshima": [1, { "asaminami": _2, "daiwa": _2, "etajima": _2, "fuchu": _2, "fukuyama": _2, "hatsukaichi": _2, "higashihiroshima": _2, "hongo": _2, "jinsekikogen": _2, "kaita": _2, "kui": _2, "kumano": _2, "kure": _2, "mihara": _2, "miyoshi": _2, "naka": _2, "onomichi": _2, "osakikamijima": _2, "otake": _2, "saka": _2, "sera": _2, "seranishi": _2, "shinichi": _2, "shobara": _2, "takehara": _2 }], "hokkaido": [1, { "abashiri": _2, "abira": _2, "aibetsu": _2, "akabira": _2, "akkeshi": _2, "asahikawa": _2, "ashibetsu": _2, "ashoro": _2, "assabu": _2, "atsuma": _2, "bibai": _2, "biei": _2, "bifuka": _2, "bihoro": _2, "biratori": _2, "chippubetsu": _2, "chitose": _2, "date": _2, "ebetsu": _2, "embetsu": _2, "eniwa": _2, "erimo": _2, "esan": _2, "esashi": _2, "fukagawa": _2, "fukushima": _2, "furano": _2, "furubira": _2, "haboro": _2, "hakodate": _2, "hamatonbetsu": _2, "hidaka": _2, "higashikagura": _2, "higashikawa": _2, "hiroo": _2, "hokuryu": _2, "hokuto": _2, "honbetsu": _2, "horokanai": _2, "horonobe": _2, "ikeda": _2, "imakane": _2, "ishikari": _2, "iwamizawa": _2, "iwanai": _2, "kamifurano": _2, "kamikawa": _2, "kamishihoro": _2, "kamisunagawa": _2, "kamoenai": _2, "kayabe": _2, "kembuchi": _2, "kikonai": _2, "kimobetsu": _2, "kitahiroshima": _2, "kitami": _2, "kiyosato": _2, "koshimizu": _2, "kunneppu": _2, "kuriyama": _2, "kuromatsunai": _2, "kushiro": _2, "kutchan": _2, "kyowa": _2, "mashike": _2, "matsumae": _2, "mikasa": _2, "minamifurano": _2, "mombetsu": _2, "moseushi": _2, "mukawa": _2, "muroran": _2, "naie": _2, "nakagawa": _2, "nakasatsunai": _2, "nakatombetsu": _2, "nanae": _2, "nanporo": _2, "nayoro": _2, "nemuro": _2, "niikappu": _2, "niki": _2, "nishiokoppe": _2, "noboribetsu": _2, "numata": _2, "obihiro": _2, "obira": _2, "oketo": _2, "okoppe": _2, "otaru": _2, "otobe": _2, "otofuke": _2, "otoineppu": _2, "oumu": _2, "ozora": _2, "pippu": _2, "rankoshi": _2, "rebun": _2, "rikubetsu": _2, "rishiri": _2, "rishirifuji": _2, "saroma": _2, "sarufutsu": _2, "shakotan": _2, "shari": _2, "shibecha": _2, "shibetsu": _2, "shikabe": _2, "shikaoi": _2, "shimamaki": _2, "shimizu": _2, "shimokawa": _2, "shinshinotsu": _2, "shintoku": _2, "shiranuka": _2, "shiraoi": _2, "shiriuchi": _2, "sobetsu": _2, "sunagawa": _2, "taiki": _2, "takasu": _2, "takikawa": _2, "takinoue": _2, "teshikaga": _2, "tobetsu": _2, "tohma": _2, "tomakomai": _2, "tomari": _2, "toya": _2, "toyako": _2, "toyotomi": _2, "toyoura": _2, "tsubetsu": _2, "tsukigata": _2, "urakawa": _2, "urausu": _2, "uryu": _2, "utashinai": _2, "wakkanai": _2, "wassamu": _2, "yakumo": _2, "yoichi": _2 }], "hyogo": [1, { "aioi": _2, "akashi": _2, "ako": _2, "amagasaki": _2, "aogaki": _2, "asago": _2, "ashiya": _2, "awaji": _2, "fukusaki": _2, "goshiki": _2, "harima": _2, "himeji": _2, "ichikawa": _2, "inagawa": _2, "itami": _2, "kakogawa": _2, "kamigori": _2, "kamikawa": _2, "kasai": _2, "kasuga": _2, "kawanishi": _2, "miki": _2, "minamiawaji": _2, "nishinomiya": _2, "nishiwaki": _2, "ono": _2, "sanda": _2, "sannan": _2, "sasayama": _2, "sayo": _2, "shingu": _2, "shinonsen": _2, "shiso": _2, "sumoto": _2, "taishi": _2, "taka": _2, "takarazuka": _2, "takasago": _2, "takino": _2, "tamba": _2, "tatsuno": _2, "toyooka": _2, "yabu": _2, "yashiro": _2, "yoka": _2, "yokawa": _2 }], "ibaraki": [1, { "ami": _2, "asahi": _2, "bando": _2, "chikusei": _2, "daigo": _2, "fujishiro": _2, "hitachi": _2, "hitachinaka": _2, "hitachiomiya": _2, "hitachiota": _2, "ibaraki": _2, "ina": _2, "inashiki": _2, "itako": _2, "iwama": _2, "joso": _2, "kamisu": _2, "kasama": _2, "kashima": _2, "kasumigaura": _2, "koga": _2, "miho": _2, "mito": _2, "moriya": _2, "naka": _2, "namegata": _2, "oarai": _2, "ogawa": _2, "omitama": _2, "ryugasaki": _2, "sakai": _2, "sakuragawa": _2, "shimodate": _2, "shimotsuma": _2, "shirosato": _2, "sowa": _2, "suifu": _2, "takahagi": _2, "tamatsukuri": _2, "tokai": _2, "tomobe": _2, "tone": _2, "toride": _2, "tsuchiura": _2, "tsukuba": _2, "uchihara": _2, "ushiku": _2, "yachiyo": _2, "yamagata": _2, "yawara": _2, "yuki": _2 }], "ishikawa": [1, { "anamizu": _2, "hakui": _2, "hakusan": _2, "kaga": _2, "kahoku": _2, "kanazawa": _2, "kawakita": _2, "komatsu": _2, "nakanoto": _2, "nanao": _2, "nomi": _2, "nonoichi": _2, "noto": _2, "shika": _2, "suzu": _2, "tsubata": _2, "tsurugi": _2, "uchinada": _2, "wajima": _2 }], "iwate": [1, { "fudai": _2, "fujisawa": _2, "hanamaki": _2, "hiraizumi": _2, "hirono": _2, "ichinohe": _2, "ichinoseki": _2, "iwaizumi": _2, "iwate": _2, "joboji": _2, "kamaishi": _2, "kanegasaki": _2, "karumai": _2, "kawai": _2, "kitakami": _2, "kuji": _2, "kunohe": _2, "kuzumaki": _2, "miyako": _2, "mizusawa": _2, "morioka": _2, "ninohe": _2, "noda": _2, "ofunato": _2, "oshu": _2, "otsuchi": _2, "rikuzentakata": _2, "shiwa": _2, "shizukuishi": _2, "sumita": _2, "tanohata": _2, "tono": _2, "yahaba": _2, "yamada": _2 }], "kagawa": [1, { "ayagawa": _2, "higashikagawa": _2, "kanonji": _2, "kotohira": _2, "manno": _2, "marugame": _2, "mitoyo": _2, "naoshima": _2, "sanuki": _2, "tadotsu": _2, "takamatsu": _2, "tonosho": _2, "uchinomi": _2, "utazu": _2, "zentsuji": _2 }], "kagoshima": [1, { "akune": _2, "amami": _2, "hioki": _2, "isa": _2, "isen": _2, "izumi": _2, "kagoshima": _2, "kanoya": _2, "kawanabe": _2, "kinko": _2, "kouyama": _2, "makurazaki": _2, "matsumoto": _2, "minamitane": _2, "nakatane": _2, "nishinoomote": _2, "satsumasendai": _2, "soo": _2, "tarumizu": _2, "yusui": _2 }], "kanagawa": [1, { "aikawa": _2, "atsugi": _2, "ayase": _2, "chigasaki": _2, "ebina": _2, "fujisawa": _2, "hadano": _2, "hakone": _2, "hiratsuka": _2, "isehara": _2, "kaisei": _2, "kamakura": _2, "kiyokawa": _2, "matsuda": _2, "minamiashigara": _2, "miura": _2, "nakai": _2, "ninomiya": _2, "odawara": _2, "oi": _2, "oiso": _2, "sagamihara": _2, "samukawa": _2, "tsukui": _2, "yamakita": _2, "yamato": _2, "yokosuka": _2, "yugawara": _2, "zama": _2, "zushi": _2 }], "kochi": [1, { "aki": _2, "geisei": _2, "hidaka": _2, "higashitsuno": _2, "ino": _2, "kagami": _2, "kami": _2, "kitagawa": _2, "kochi": _2, "mihara": _2, "motoyama": _2, "muroto": _2, "nahari": _2, "nakamura": _2, "nankoku": _2, "nishitosa": _2, "niyodogawa": _2, "ochi": _2, "okawa": _2, "otoyo": _2, "otsuki": _2, "sakawa": _2, "sukumo": _2, "susaki": _2, "tosa": _2, "tosashimizu": _2, "toyo": _2, "tsuno": _2, "umaji": _2, "yasuda": _2, "yusuhara": _2 }], "kumamoto": [1, { "amakusa": _2, "arao": _2, "aso": _2, "choyo": _2, "gyokuto": _2, "kamiamakusa": _2, "kikuchi": _2, "kumamoto": _2, "mashiki": _2, "mifune": _2, "minamata": _2, "minamioguni": _2, "nagasu": _2, "nishihara": _2, "oguni": _2, "ozu": _2, "sumoto": _2, "takamori": _2, "uki": _2, "uto": _2, "yamaga": _2, "yamato": _2, "yatsushiro": _2 }], "kyoto": [1, { "ayabe": _2, "fukuchiyama": _2, "higashiyama": _2, "ide": _2, "ine": _2, "joyo": _2, "kameoka": _2, "kamo": _2, "kita": _2, "kizu": _2, "kumiyama": _2, "kyotamba": _2, "kyotanabe": _2, "kyotango": _2, "maizuru": _2, "minami": _2, "minamiyamashiro": _2, "miyazu": _2, "muko": _2, "nagaokakyo": _2, "nakagyo": _2, "nantan": _2, "oyamazaki": _2, "sakyo": _2, "seika": _2, "tanabe": _2, "uji": _2, "ujitawara": _2, "wazuka": _2, "yamashina": _2, "yawata": _2 }], "mie": [1, { "asahi": _2, "inabe": _2, "ise": _2, "kameyama": _2, "kawagoe": _2, "kiho": _2, "kisosaki": _2, "kiwa": _2, "komono": _2, "kumano": _2, "kuwana": _2, "matsusaka": _2, "meiwa": _2, "mihama": _2, "minamiise": _2, "misugi": _2, "miyama": _2, "nabari": _2, "shima": _2, "suzuka": _2, "tado": _2, "taiki": _2, "taki": _2, "tamaki": _2, "toba": _2, "tsu": _2, "udono": _2, "ureshino": _2, "watarai": _2, "yokkaichi": _2 }], "miyagi": [1, { "furukawa": _2, "higashimatsushima": _2, "ishinomaki": _2, "iwanuma": _2, "kakuda": _2, "kami": _2, "kawasaki": _2, "marumori": _2, "matsushima": _2, "minamisanriku": _2, "misato": _2, "murata": _2, "natori": _2, "ogawara": _2, "ohira": _2, "onagawa": _2, "osaki": _2, "rifu": _2, "semine": _2, "shibata": _2, "shichikashuku": _2, "shikama": _2, "shiogama": _2, "shiroishi": _2, "tagajo": _2, "taiwa": _2, "tome": _2, "tomiya": _2, "wakuya": _2, "watari": _2, "yamamoto": _2, "zao": _2 }], "miyazaki": [1, { "aya": _2, "ebino": _2, "gokase": _2, "hyuga": _2, "kadogawa": _2, "kawaminami": _2, "kijo": _2, "kitagawa": _2, "kitakata": _2, "kitaura": _2, "kobayashi": _2, "kunitomi": _2, "kushima": _2, "mimata": _2, "miyakonojo": _2, "miyazaki": _2, "morotsuka": _2, "nichinan": _2, "nishimera": _2, "nobeoka": _2, "saito": _2, "shiiba": _2, "shintomi": _2, "takaharu": _2, "takanabe": _2, "takazaki": _2, "tsuno": _2 }], "nagano": [1, { "achi": _2, "agematsu": _2, "anan": _2, "aoki": _2, "asahi": _2, "azumino": _2, "chikuhoku": _2, "chikuma": _2, "chino": _2, "fujimi": _2, "hakuba": _2, "hara": _2, "hiraya": _2, "iida": _2, "iijima": _2, "iiyama": _2, "iizuna": _2, "ikeda": _2, "ikusaka": _2, "ina": _2, "karuizawa": _2, "kawakami": _2, "kiso": _2, "kisofukushima": _2, "kitaaiki": _2, "komagane": _2, "komoro": _2, "matsukawa": _2, "matsumoto": _2, "miasa": _2, "minamiaiki": _2, "minamimaki": _2, "minamiminowa": _2, "minowa": _2, "miyada": _2, "miyota": _2, "mochizuki": _2, "nagano": _2, "nagawa": _2, "nagiso": _2, "nakagawa": _2, "nakano": _2, "nozawaonsen": _2, "obuse": _2, "ogawa": _2, "okaya": _2, "omachi": _2, "omi": _2, "ookuwa": _2, "ooshika": _2, "otaki": _2, "otari": _2, "sakae": _2, "sakaki": _2, "saku": _2, "sakuho": _2, "shimosuwa": _2, "shinanomachi": _2, "shiojiri": _2, "suwa": _2, "suzaka": _2, "takagi": _2, "takamori": _2, "takayama": _2, "tateshina": _2, "tatsuno": _2, "togakushi": _2, "togura": _2, "tomi": _2, "ueda": _2, "wada": _2, "yamagata": _2, "yamanouchi": _2, "yasaka": _2, "yasuoka": _2 }], "nagasaki": [1, { "chijiwa": _2, "futsu": _2, "goto": _2, "hasami": _2, "hirado": _2, "iki": _2, "isahaya": _2, "kawatana": _2, "kuchinotsu": _2, "matsuura": _2, "nagasaki": _2, "obama": _2, "omura": _2, "oseto": _2, "saikai": _2, "sasebo": _2, "seihi": _2, "shimabara": _2, "shinkamigoto": _2, "togitsu": _2, "tsushima": _2, "unzen": _2 }], "nara": [1, { "ando": _2, "gose": _2, "heguri": _2, "higashiyoshino": _2, "ikaruga": _2, "ikoma": _2, "kamikitayama": _2, "kanmaki": _2, "kashiba": _2, "kashihara": _2, "katsuragi": _2, "kawai": _2, "kawakami": _2, "kawanishi": _2, "koryo": _2, "kurotaki": _2, "mitsue": _2, "miyake": _2, "nara": _2, "nosegawa": _2, "oji": _2, "ouda": _2, "oyodo": _2, "sakurai": _2, "sango": _2, "shimoichi": _2, "shimokitayama": _2, "shinjo": _2, "soni": _2, "takatori": _2, "tawaramoto": _2, "tenkawa": _2, "tenri": _2, "uda": _2, "yamatokoriyama": _2, "yamatotakada": _2, "yamazoe": _2, "yoshino": _2 }], "niigata": [1, { "aga": _2, "agano": _2, "gosen": _2, "itoigawa": _2, "izumozaki": _2, "joetsu": _2, "kamo": _2, "kariwa": _2, "kashiwazaki": _2, "minamiuonuma": _2, "mitsuke": _2, "muika": _2, "murakami": _2, "myoko": _2, "nagaoka": _2, "niigata": _2, "ojiya": _2, "omi": _2, "sado": _2, "sanjo": _2, "seiro": _2, "seirou": _2, "sekikawa": _2, "shibata": _2, "tagami": _2, "tainai": _2, "tochio": _2, "tokamachi": _2, "tsubame": _2, "tsunan": _2, "uonuma": _2, "yahiko": _2, "yoita": _2, "yuzawa": _2 }], "oita": [1, { "beppu": _2, "bungoono": _2, "bungotakada": _2, "hasama": _2, "hiji": _2, "himeshima": _2, "hita": _2, "kamitsue": _2, "kokonoe": _2, "kuju": _2, "kunisaki": _2, "kusu": _2, "oita": _2, "saiki": _2, "taketa": _2, "tsukumi": _2, "usa": _2, "usuki": _2, "yufu": _2 }], "okayama": [1, { "akaiwa": _2, "asakuchi": _2, "bizen": _2, "hayashima": _2, "ibara": _2, "kagamino": _2, "kasaoka": _2, "kibichuo": _2, "kumenan": _2, "kurashiki": _2, "maniwa": _2, "misaki": _2, "nagi": _2, "niimi": _2, "nishiawakura": _2, "okayama": _2, "satosho": _2, "setouchi": _2, "shinjo": _2, "shoo": _2, "soja": _2, "takahashi": _2, "tamano": _2, "tsuyama": _2, "wake": _2, "yakage": _2 }], "okinawa": [1, { "aguni": _2, "ginowan": _2, "ginoza": _2, "gushikami": _2, "haebaru": _2, "higashi": _2, "hirara": _2, "iheya": _2, "ishigaki": _2, "ishikawa": _2, "itoman": _2, "izena": _2, "kadena": _2, "kin": _2, "kitadaito": _2, "kitanakagusuku": _2, "kumejima": _2, "kunigami": _2, "minamidaito": _2, "motobu": _2, "nago": _2, "naha": _2, "nakagusuku": _2, "nakijin": _2, "nanjo": _2, "nishihara": _2, "ogimi": _2, "okinawa": _2, "onna": _2, "shimoji": _2, "taketomi": _2, "tarama": _2, "tokashiki": _2, "tomigusuku": _2, "tonaki": _2, "urasoe": _2, "uruma": _2, "yaese": _2, "yomitan": _2, "yonabaru": _2, "yonaguni": _2, "zamami": _2 }], "osaka": [1, { "abeno": _2, "chihayaakasaka": _2, "chuo": _2, "daito": _2, "fujiidera": _2, "habikino": _2, "hannan": _2, "higashiosaka": _2, "higashisumiyoshi": _2, "higashiyodogawa": _2, "hirakata": _2, "ibaraki": _2, "ikeda": _2, "izumi": _2, "izumiotsu": _2, "izumisano": _2, "kadoma": _2, "kaizuka": _2, "kanan": _2, "kashiwara": _2, "katano": _2, "kawachinagano": _2, "kishiwada": _2, "kita": _2, "kumatori": _2, "matsubara": _2, "minato": _2, "minoh": _2, "misaki": _2, "moriguchi": _2, "neyagawa": _2, "nishi": _2, "nose": _2, "osakasayama": _2, "sakai": _2, "sayama": _2, "sennan": _2, "settsu": _2, "shijonawate": _2, "shimamoto": _2, "suita": _2, "tadaoka": _2, "taishi": _2, "tajiri": _2, "takaishi": _2, "takatsuki": _2, "tondabayashi": _2, "toyonaka": _2, "toyono": _2, "yao": _2 }], "saga": [1, { "ariake": _2, "arita": _2, "fukudomi": _2, "genkai": _2, "hamatama": _2, "hizen": _2, "imari": _2, "kamimine": _2, "kanzaki": _2, "karatsu": _2, "kashima": _2, "kitagata": _2, "kitahata": _2, "kiyama": _2, "kouhoku": _2, "kyuragi": _2, "nishiarita": _2, "ogi": _2, "omachi": _2, "ouchi": _2, "saga": _2, "shiroishi": _2, "taku": _2, "tara": _2, "tosu": _2, "yoshinogari": _2 }], "saitama": [1, { "arakawa": _2, "asaka": _2, "chichibu": _2, "fujimi": _2, "fujimino": _2, "fukaya": _2, "hanno": _2, "hanyu": _2, "hasuda": _2, "hatogaya": _2, "hatoyama": _2, "hidaka": _2, "higashichichibu": _2, "higashimatsuyama": _2, "honjo": _2, "ina": _2, "iruma": _2, "iwatsuki": _2, "kamiizumi": _2, "kamikawa": _2, "kamisato": _2, "kasukabe": _2, "kawagoe": _2, "kawaguchi": _2, "kawajima": _2, "kazo": _2, "kitamoto": _2, "koshigaya": _2, "kounosu": _2, "kuki": _2, "kumagaya": _2, "matsubushi": _2, "minano": _2, "misato": _2, "miyashiro": _2, "miyoshi": _2, "moroyama": _2, "nagatoro": _2, "namegawa": _2, "niiza": _2, "ogano": _2, "ogawa": _2, "ogose": _2, "okegawa": _2, "omiya": _2, "otaki": _2, "ranzan": _2, "ryokami": _2, "saitama": _2, "sakado": _2, "satte": _2, "sayama": _2, "shiki": _2, "shiraoka": _2, "soka": _2, "sugito": _2, "toda": _2, "tokigawa": _2, "tokorozawa": _2, "tsurugashima": _2, "urawa": _2, "warabi": _2, "yashio": _2, "yokoze": _2, "yono": _2, "yorii": _2, "yoshida": _2, "yoshikawa": _2, "yoshimi": _2 }], "shiga": [1, { "aisho": _2, "gamo": _2, "higashiomi": _2, "hikone": _2, "koka": _2, "konan": _2, "kosei": _2, "koto": _2, "kusatsu": _2, "maibara": _2, "moriyama": _2, "nagahama": _2, "nishiazai": _2, "notogawa": _2, "omihachiman": _2, "otsu": _2, "ritto": _2, "ryuoh": _2, "takashima": _2, "takatsuki": _2, "torahime": _2, "toyosato": _2, "yasu": _2 }], "shimane": [1, { "akagi": _2, "ama": _2, "gotsu": _2, "hamada": _2, "higashiizumo": _2, "hikawa": _2, "hikimi": _2, "izumo": _2, "kakinoki": _2, "masuda": _2, "matsue": _2, "misato": _2, "nishinoshima": _2, "ohda": _2, "okinoshima": _2, "okuizumo": _2, "shimane": _2, "tamayu": _2, "tsuwano": _2, "unnan": _2, "yakumo": _2, "yasugi": _2, "yatsuka": _2 }], "shizuoka": [1, { "arai": _2, "atami": _2, "fuji": _2, "fujieda": _2, "fujikawa": _2, "fujinomiya": _2, "fukuroi": _2, "gotemba": _2, "haibara": _2, "hamamatsu": _2, "higashiizu": _2, "ito": _2, "iwata": _2, "izu": _2, "izunokuni": _2, "kakegawa": _2, "kannami": _2, "kawanehon": _2, "kawazu": _2, "kikugawa": _2, "kosai": _2, "makinohara": _2, "matsuzaki": _2, "minamiizu": _2, "mishima": _2, "morimachi": _2, "nishiizu": _2, "numazu": _2, "omaezaki": _2, "shimada": _2, "shimizu": _2, "shimoda": _2, "shizuoka": _2, "susono": _2, "yaizu": _2, "yoshida": _2 }], "tochigi": [1, { "ashikaga": _2, "bato": _2, "haga": _2, "ichikai": _2, "iwafune": _2, "kaminokawa": _2, "kanuma": _2, "karasuyama": _2, "kuroiso": _2, "mashiko": _2, "mibu": _2, "moka": _2, "motegi": _2, "nasu": _2, "nasushiobara": _2, "nikko": _2, "nishikata": _2, "nogi": _2, "ohira": _2, "ohtawara": _2, "oyama": _2, "sakura": _2, "sano": _2, "shimotsuke": _2, "shioya": _2, "takanezawa": _2, "tochigi": _2, "tsuga": _2, "ujiie": _2, "utsunomiya": _2, "yaita": _2 }], "tokushima": [1, { "aizumi": _2, "anan": _2, "ichiba": _2, "itano": _2, "kainan": _2, "komatsushima": _2, "matsushige": _2, "mima": _2, "minami": _2, "miyoshi": _2, "mugi": _2, "nakagawa": _2, "naruto": _2, "sanagochi": _2, "shishikui": _2, "tokushima": _2, "wajiki": _2 }], "tokyo": [1, { "adachi": _2, "akiruno": _2, "akishima": _2, "aogashima": _2, "arakawa": _2, "bunkyo": _2, "chiyoda": _2, "chofu": _2, "chuo": _2, "edogawa": _2, "fuchu": _2, "fussa": _2, "hachijo": _2, "hachioji": _2, "hamura": _2, "higashikurume": _2, "higashimurayama": _2, "higashiyamato": _2, "hino": _2, "hinode": _2, "hinohara": _2, "inagi": _2, "itabashi": _2, "katsushika": _2, "kita": _2, "kiyose": _2, "kodaira": _2, "koganei": _2, "kokubunji": _2, "komae": _2, "koto": _2, "kouzushima": _2, "kunitachi": _2, "machida": _2, "meguro": _2, "minato": _2, "mitaka": _2, "mizuho": _2, "musashimurayama": _2, "musashino": _2, "nakano": _2, "nerima": _2, "ogasawara": _2, "okutama": _2, "ome": _2, "oshima": _2, "ota": _2, "setagaya": _2, "shibuya": _2, "shinagawa": _2, "shinjuku": _2, "suginami": _2, "sumida": _2, "tachikawa": _2, "taito": _2, "tama": _2, "toshima": _2 }], "tottori": [1, { "chizu": _2, "hino": _2, "kawahara": _2, "koge": _2, "kotoura": _2, "misasa": _2, "nanbu": _2, "nichinan": _2, "sakaiminato": _2, "tottori": _2, "wakasa": _2, "yazu": _2, "yonago": _2 }], "toyama": [1, { "asahi": _2, "fuchu": _2, "fukumitsu": _2, "funahashi": _2, "himi": _2, "imizu": _2, "inami": _2, "johana": _2, "kamiichi": _2, "kurobe": _2, "nakaniikawa": _2, "namerikawa": _2, "nanto": _2, "nyuzen": _2, "oyabe": _2, "taira": _2, "takaoka": _2, "tateyama": _2, "toga": _2, "tonami": _2, "toyama": _2, "unazuki": _2, "uozu": _2, "yamada": _2 }], "wakayama": [1, { "arida": _2, "aridagawa": _2, "gobo": _2, "hashimoto": _2, "hidaka": _2, "hirogawa": _2, "inami": _2, "iwade": _2, "kainan": _2, "kamitonda": _2, "katsuragi": _2, "kimino": _2, "kinokawa": _2, "kitayama": _2, "koya": _2, "koza": _2, "kozagawa": _2, "kudoyama": _2, "kushimoto": _2, "mihama": _2, "misato": _2, "nachikatsuura": _2, "shingu": _2, "shirahama": _2, "taiji": _2, "tanabe": _2, "wakayama": _2, "yuasa": _2, "yura": _2 }], "yamagata": [1, { "asahi": _2, "funagata": _2, "higashine": _2, "iide": _2, "kahoku": _2, "kaminoyama": _2, "kaneyama": _2, "kawanishi": _2, "mamurogawa": _2, "mikawa": _2, "murayama": _2, "nagai": _2, "nakayama": _2, "nanyo": _2, "nishikawa": _2, "obanazawa": _2, "oe": _2, "oguni": _2, "ohkura": _2, "oishida": _2, "sagae": _2, "sakata": _2, "sakegawa": _2, "shinjo": _2, "shirataka": _2, "shonai": _2, "takahata": _2, "tendo": _2, "tozawa": _2, "tsuruoka": _2, "yamagata": _2, "yamanobe": _2, "yonezawa": _2, "yuza": _2 }], "yamaguchi": [1, { "abu": _2, "hagi": _2, "hikari": _2, "hofu": _2, "iwakuni": _2, "kudamatsu": _2, "mitou": _2, "nagato": _2, "oshima": _2, "shimonoseki": _2, "shunan": _2, "tabuse": _2, "tokuyama": _2, "toyota": _2, "ube": _2, "yuu": _2 }], "yamanashi": [1, { "chuo": _2, "doshi": _2, "fuefuki": _2, "fujikawa": _2, "fujikawaguchiko": _2, "fujiyoshida": _2, "hayakawa": _2, "hokuto": _2, "ichikawamisato": _2, "kai": _2, "kofu": _2, "koshu": _2, "kosuge": _2, "minami-alps": _2, "minobu": _2, "nakamichi": _2, "nanbu": _2, "narusawa": _2, "nirasaki": _2, "nishikatsura": _2, "oshino": _2, "otsuki": _2, "showa": _2, "tabayama": _2, "tsuru": _2, "uenohara": _2, "yamanakako": _2, "yamanashi": _2 }], "xn--ehqz56n": _2, "\u4E09\u91CD": _2, "xn--1lqs03n": _2, "\u4EAC\u90FD": _2, "xn--qqqt11m": _2, "\u4F50\u8CC0": _2, "xn--f6qx53a": _2, "\u5175\u5EAB": _2, "xn--djrs72d6uy": _2, "\u5317\u6D77\u9053": _2, "xn--mkru45i": _2, "\u5343\u8449": _2, "xn--0trq7p7nn": _2, "\u548C\u6B4C\u5C71": _2, "xn--5js045d": _2, "\u57FC\u7389": _2, "xn--kbrq7o": _2, "\u5927\u5206": _2, "xn--pssu33l": _2, "\u5927\u962A": _2, "xn--ntsq17g": _2, "\u5948\u826F": _2, "xn--uisz3g": _2, "\u5BAE\u57CE": _2, "xn--6btw5a": _2, "\u5BAE\u5D0E": _2, "xn--1ctwo": _2, "\u5BCC\u5C71": _2, "xn--6orx2r": _2, "\u5C71\u53E3": _2, "xn--rht61e": _2, "\u5C71\u5F62": _2, "xn--rht27z": _2, "\u5C71\u68A8": _2, "xn--nit225k": _2, "\u5C90\u961C": _2, "xn--rht3d": _2, "\u5CA1\u5C71": _2, "xn--djty4k": _2, "\u5CA9\u624B": _2, "xn--klty5x": _2, "\u5CF6\u6839": _2, "xn--kltx9a": _2, "\u5E83\u5CF6": _2, "xn--kltp7d": _2, "\u5FB3\u5CF6": _2, "xn--c3s14m": _2, "\u611B\u5A9B": _2, "xn--vgu402c": _2, "\u611B\u77E5": _2, "xn--efvn9s": _2, "\u65B0\u6F5F": _2, "xn--1lqs71d": _2, "\u6771\u4EAC": _2, "xn--4pvxs": _2, "\u6803\u6728": _2, "xn--uuwu58a": _2, "\u6C96\u7E04": _2, "xn--zbx025d": _2, "\u6ECB\u8CC0": _2, "xn--8pvr4u": _2, "\u718A\u672C": _2, "xn--5rtp49c": _2, "\u77F3\u5DDD": _2, "xn--ntso0iqx3a": _2, "\u795E\u5948\u5DDD": _2, "xn--elqq16h": _2, "\u798F\u4E95": _2, "xn--4it168d": _2, "\u798F\u5CA1": _2, "xn--klt787d": _2, "\u798F\u5CF6": _2, "xn--rny31h": _2, "\u79CB\u7530": _2, "xn--7t0a264c": _2, "\u7FA4\u99AC": _2, "xn--uist22h": _2, "\u8328\u57CE": _2, "xn--8ltr62k": _2, "\u9577\u5D0E": _2, "xn--2m4a15e": _2, "\u9577\u91CE": _2, "xn--32vp30h": _2, "\u9752\u68EE": _2, "xn--4it797k": _2, "\u9759\u5CA1": _2, "xn--5rtq34k": _2, "\u9999\u5DDD": _2, "xn--k7yn95e": _2, "\u9AD8\u77E5": _2, "xn--tor131o": _2, "\u9CE5\u53D6": _2, "xn--d5qv7z876c": _2, "\u9E7F\u5150\u5CF6": _2, "kawasaki": _21, "kitakyushu": _21, "kobe": _21, "nagoya": _21, "sapporo": _21, "sendai": _21, "yokohama": _21, "buyshop": _3, "fashionstore": _3, "handcrafted": _3, "kawaiishop": _3, "supersale": _3, "theshop": _3, "0am": _3, "0g0": _3, "0j0": _3, "0t0": _3, "mydns": _3, "pgw": _3, "wjg": _3, "usercontent": _3, "angry": _3, "babyblue": _3, "babymilk": _3, "backdrop": _3, "bambina": _3, "bitter": _3, "blush": _3, "boo": _3, "boy": _3, "boyfriend": _3, "but": _3, "candypop": _3, "capoo": _3, "catfood": _3, "cheap": _3, "chicappa": _3, "chillout": _3, "chips": _3, "chowder": _3, "chu": _3, "ciao": _3, "cocotte": _3, "coolblog": _3, "cranky": _3, "cutegirl": _3, "daa": _3, "deca": _3, "deci": _3, "digick": _3, "egoism": _3, "fakefur": _3, "fem": _3, "flier": _3, "floppy": _3, "fool": _3, "frenchkiss": _3, "girlfriend": _3, "girly": _3, "gloomy": _3, "gonna": _3, "greater": _3, "hacca": _3, "heavy": _3, "her": _3, "hiho": _3, "hippy": _3, "holy": _3, "hungry": _3, "icurus": _3, "itigo": _3, "jellybean": _3, "kikirara": _3, "kill": _3, "kilo": _3, "kuron": _3, "littlestar": _3, "lolipopmc": _3, "lolitapunk": _3, "lomo": _3, "lovepop": _3, "lovesick": _3, "main": _3, "mods": _3, "mond": _3, "mongolian": _3, "moo": _3, "namaste": _3, "nikita": _3, "nobushi": _3, "noor": _3, "oops": _3, "parallel": _3, "parasite": _3, "pecori": _3, "peewee": _3, "penne": _3, "pepper": _3, "perma": _3, "pigboat": _3, "pinoko": _3, "punyu": _3, "pupu": _3, "pussycat": _3, "pya": _3, "raindrop": _3, "readymade": _3, "sadist": _3, "schoolbus": _3, "secret": _3, "staba": _3, "stripper": _3, "sub": _3, "sunnyday": _3, "thick": _3, "tonkotsu": _3, "under": _3, "upper": _3, "velvet": _3, "verse": _3, "versus": _3, "vivian": _3, "watson": _3, "weblike": _3, "whitesnow": _3, "zombie": _3, "hateblo": _3, "hatenablog": _3, "hatenadiary": _3, "2-d": _3, "bona": _3, "crap": _3, "daynight": _3, "eek": _3, "flop": _3, "halfmoon": _3, "jeez": _3, "matrix": _3, "mimoza": _3, "netgamers": _3, "nyanta": _3, "o0o0": _3, "rdy": _3, "rgr": _3, "rulez": _3, "sakurastorage": [0, { "isk01": _60, "isk02": _60 }], "saloon": _3, "sblo": _3, "skr": _3, "tank": _3, "uh-oh": _3, "undo": _3, "webaccel": [0, { "rs": _3, "user": _3 }], "websozai": _3, "xii": _3 }], "ke": [1, { "ac": _2, "co": _2, "go": _2, "info": _2, "me": _2, "mobi": _2, "ne": _2, "or": _2, "sc": _2 }], "kg": [1, { "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "us": _3, "xx": _3, "ae": _3 }], "kh": _4, "ki": _61, "km": [1, { "ass": _2, "com": _2, "edu": _2, "gov": _2, "mil": _2, "nom": _2, "org": _2, "prd": _2, "tm": _2, "asso": _2, "coop": _2, "gouv": _2, "medecin": _2, "notaires": _2, "pharmaciens": _2, "presse": _2, "veterinaire": _2 }], "kn": [1, { "edu": _2, "gov": _2, "net": _2, "org": _2 }], "kp": [1, { "com": _2, "edu": _2, "gov": _2, "org": _2, "rep": _2, "tra": _2 }], "kr": [1, { "ac": _2, "ai": _2, "co": _2, "es": _2, "go": _2, "hs": _2, "io": _2, "it": _2, "kg": _2, "me": _2, "mil": _2, "ms": _2, "ne": _2, "or": _2, "pe": _2, "re": _2, "sc": _2, "busan": _2, "chungbuk": _2, "chungnam": _2, "daegu": _2, "daejeon": _2, "gangwon": _2, "gwangju": _2, "gyeongbuk": _2, "gyeonggi": _2, "gyeongnam": _2, "incheon": _2, "jeju": _2, "jeonbuk": _2, "jeonnam": _2, "seoul": _2, "ulsan": _2, "c01": _3, "eliv-api": _3, "eliv-cdn": _3, "eliv-dns": _3, "mmv": _3, "vki": _3 }], "kw": [1, { "com": _2, "edu": _2, "emb": _2, "gov": _2, "ind": _2, "net": _2, "org": _2 }], "ky": _48, "kz": [1, { "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "jcloud": _3 }], "la": [1, { "com": _2, "edu": _2, "gov": _2, "info": _2, "int": _2, "net": _2, "org": _2, "per": _2, "bnr": _3 }], "lb": _4, "lc": [1, { "co": _2, "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "oy": _3 }], "li": _2, "lk": [1, { "ac": _2, "assn": _2, "com": _2, "edu": _2, "gov": _2, "grp": _2, "hotel": _2, "int": _2, "ltd": _2, "net": _2, "ngo": _2, "org": _2, "sch": _2, "soc": _2, "web": _2 }], "lr": _4, "ls": [1, { "ac": _2, "biz": _2, "co": _2, "edu": _2, "gov": _2, "info": _2, "net": _2, "org": _2, "sc": _2 }], "lt": _10, "lu": [1, { "123website": _3 }], "lv": [1, { "asn": _2, "com": _2, "conf": _2, "edu": _2, "gov": _2, "id": _2, "mil": _2, "net": _2, "org": _2 }], "ly": [1, { "com": _2, "edu": _2, "gov": _2, "id": _2, "med": _2, "net": _2, "org": _2, "plc": _2, "sch": _2 }], "ma": [1, { "ac": _2, "co": _2, "gov": _2, "net": _2, "org": _2, "press": _2 }], "mc": [1, { "asso": _2, "tm": _2 }], "md": [1, { "ir": _3 }], "me": [1, { "ac": _2, "co": _2, "edu": _2, "gov": _2, "its": _2, "net": _2, "org": _2, "priv": _2, "c66": _3, "craft": _3, "edgestack": _3, "mybox": _3, "filegear": _3, "filegear-sg": _3, "lohmus": _3, "barsy": _3, "mcdir": _3, "brasilia": _3, "ddns": _3, "dnsfor": _3, "hopto": _3, "loginto": _3, "noip": _3, "webhop": _3, "soundcast": _3, "tcp4": _3, "vp4": _3, "diskstation": _3, "dscloud": _3, "i234": _3, "myds": _3, "synology": _3, "transip": _47, "nohost": _3 }], "mg": [1, { "co": _2, "com": _2, "edu": _2, "gov": _2, "mil": _2, "nom": _2, "org": _2, "prd": _2 }], "mh": _2, "mil": _2, "mk": [1, { "com": _2, "edu": _2, "gov": _2, "inf": _2, "name": _2, "net": _2, "org": _2 }], "ml": [1, { "ac": _2, "art": _2, "asso": _2, "com": _2, "edu": _2, "gouv": _2, "gov": _2, "info": _2, "inst": _2, "net": _2, "org": _2, "pr": _2, "presse": _2 }], "mm": _21, "mn": [1, { "edu": _2, "gov": _2, "org": _2, "nyc": _3 }], "mo": _4, "mobi": [1, { "barsy": _3, "dscloud": _3 }], "mp": [1, { "ju": _3 }], "mq": _2, "mr": _10, "ms": [1, { "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "minisite": _3 }], "mt": _48, "mu": [1, { "ac": _2, "co": _2, "com": _2, "gov": _2, "net": _2, "or": _2, "org": _2 }], "museum": _2, "mv": [1, { "aero": _2, "biz": _2, "com": _2, "coop": _2, "edu": _2, "gov": _2, "info": _2, "int": _2, "mil": _2, "museum": _2, "name": _2, "net": _2, "org": _2, "pro": _2 }], "mw": [1, { "ac": _2, "biz": _2, "co": _2, "com": _2, "coop": _2, "edu": _2, "gov": _2, "int": _2, "net": _2, "org": _2 }], "mx": [1, { "com": _2, "edu": _2, "gob": _2, "net": _2, "org": _2 }], "my": [1, { "biz": _2, "com": _2, "edu": _2, "gov": _2, "mil": _2, "name": _2, "net": _2, "org": _2 }], "mz": [1, { "ac": _2, "adv": _2, "co": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2 }], "na": [1, { "alt": _2, "co": _2, "com": _2, "gov": _2, "net": _2, "org": _2 }], "name": [1, { "her": _64, "his": _64, "ispmanager": _3, "keenetic": _3 }], "nc": [1, { "asso": _2, "nom": _2 }], "ne": _2, "net": [1, { "adobeaemcloud": _3, "adobeio-static": _3, "adobeioruntime": _3, "akadns": _3, "akamai": _3, "akamai-staging": _3, "akamaiedge": _3, "akamaiedge-staging": _3, "akamaihd": _3, "akamaihd-staging": _3, "akamaiorigin": _3, "akamaiorigin-staging": _3, "akamaized": _3, "akamaized-staging": _3, "edgekey": _3, "edgekey-staging": _3, "edgesuite": _3, "edgesuite-staging": _3, "alwaysdata": _3, "myamaze": _3, "cloudfront": _3, "appudo": _3, "atlassian-dev": [0, { "prod": _56 }], "myfritz": _3, "shopselect": _3, "blackbaudcdn": _3, "boomla": _3, "bplaced": _3, "square7": _3, "cdn77": [0, { "r": _3 }], "cdn77-ssl": _3, "gb": _3, "hu": _3, "jp": _3, "se": _3, "uk": _3, "clickrising": _3, "ddns-ip": _3, "dns-cloud": _3, "dns-dynamic": _3, "cloudaccess": _3, "cloudflare": [2, { "cdn": _3 }], "cloudflareanycast": _56, "cloudflarecn": _56, "cloudflareglobal": _56, "ctfcloud": _3, "feste-ip": _3, "knx-server": _3, "static-access": _3, "cryptonomic": _6, "dattolocal": _3, "mydatto": _3, "debian": _3, "definima": _3, "deno": [2, { "sandbox": _3 }], "icp": _6, "de5": _3, "at-band-camp": _3, "blogdns": _3, "broke-it": _3, "buyshouses": _3, "dnsalias": _3, "dnsdojo": _3, "does-it": _3, "dontexist": _3, "dynalias": _3, "dynathome": _3, "endofinternet": _3, "from-az": _3, "from-co": _3, "from-la": _3, "from-ny": _3, "gets-it": _3, "ham-radio-op": _3, "homeftp": _3, "homeip": _3, "homelinux": _3, "homeunix": _3, "in-the-band": _3, "is-a-chef": _3, "is-a-geek": _3, "isa-geek": _3, "kicks-ass": _3, "office-on-the": _3, "podzone": _3, "scrapper-site": _3, "selfip": _3, "sells-it": _3, "servebbs": _3, "serveftp": _3, "thruhere": _3, "webhop": _3, "casacam": _3, "dynu": _3, "dynuddns": _3, "mysynology": _3, "opik": _3, "spryt": _3, "dynv6": _3, "twmail": _3, "ru": _3, "channelsdvr": [2, { "u": _3 }], "fastly": [0, { "freetls": _3, "map": _3, "prod": [0, { "a": _3, "global": _3 }], "ssl": [0, { "a": _3, "b": _3, "global": _3 }] }], "fastlylb": [2, { "map": _3 }], "keyword-on": _3, "live-on": _3, "server-on": _3, "cdn-edges": _3, "heteml": _3, "cloudfunctions": _3, "grafana-dev": _3, "iobb": _3, "moonscale": _3, "in-dsl": _3, "in-vpn": _3, "oninferno": _3, "botdash": _3, "apps-1and1": _3, "ipifony": _3, "cloudjiffy": [2, { "fra1-de": _3, "west1-us": _3 }], "elastx": [0, { "jls-sto1": _3, "jls-sto2": _3, "jls-sto3": _3 }], "massivegrid": [0, { "paas": [0, { "fr-1": _3, "lon-1": _3, "lon-2": _3, "ny-1": _3, "ny-2": _3, "sg-1": _3 }] }], "saveincloud": [0, { "jelastic": _3, "nordeste-idc": _3 }], "scaleforce": _49, "kinghost": _3, "uni5": _3, "krellian": _3, "ggff": _3, "localto": _6, "barsy": _3, "luyani": _3, "memset": _3, "azure-api": _3, "azure-mobile": _3, "azureedge": _3, "azurefd": _3, "azurestaticapps": [2, { "1": _3, "2": _3, "3": _3, "4": _3, "5": _3, "6": _3, "7": _3, "centralus": _3, "eastasia": _3, "eastus2": _3, "westeurope": _3, "westus2": _3 }], "azurewebsites": _3, "cloudapp": _3, "trafficmanager": _3, "usgovcloudapi": _66, "usgovcloudapp": _3, "usgovtrafficmanager": _3, "windows": _66, "mynetname": [0, { "sn": _3 }], "routingthecloud": _3, "bounceme": _3, "ddns": _3, "eating-organic": _3, "mydissent": _3, "myeffect": _3, "mymediapc": _3, "mypsx": _3, "mysecuritycamera": _3, "nhlfan": _3, "no-ip": _3, "pgafan": _3, "privatizehealthinsurance": _3, "redirectme": _3, "serveblog": _3, "serveminecraft": _3, "sytes": _3, "dnsup": _3, "hicam": _3, "now-dns": _3, "ownip": _3, "vpndns": _3, "cloudycluster": _3, "ovh": [0, { "hosting": _6, "webpaas": _6 }], "rackmaze": _3, "myradweb": _3, "in": _3, "subsc-pay": _3, "squares": _3, "schokokeks": _3, "firewall-gateway": _3, "seidat": _3, "senseering": _3, "siteleaf": _3, "mafelo": _3, "myspreadshop": _3, "vps-host": [2, { "jelastic": [0, { "atl": _3, "njs": _3, "ric": _3 }] }], "srcf": [0, { "soc": _3, "user": _3 }], "supabase": _3, "dsmynas": _3, "familyds": _3, "ts": [2, { "c": _6 }], "torproject": [2, { "pages": _3 }], "tunnelmole": _3, "vusercontent": _3, "reserve-online": _3, "localcert": _3, "community-pro": _3, "meinforum": _3, "yandexcloud": [2, { "storage": _3, "website": _3 }], "za": _3, "zabc": _3 }], "nf": [1, { "arts": _2, "com": _2, "firm": _2, "info": _2, "net": _2, "other": _2, "per": _2, "rec": _2, "store": _2, "web": _2 }], "ng": [1, { "com": _2, "edu": _2, "gov": _2, "i": _2, "mil": _2, "mobi": _2, "name": _2, "net": _2, "org": _2, "sch": _2, "biz": [2, { "co": _3, "dl": _3, "go": _3, "lg": _3, "on": _3 }], "col": _3, "firm": _3, "gen": _3, "ltd": _3, "ngo": _3, "plc": _3 }], "ni": [1, { "ac": _2, "biz": _2, "co": _2, "com": _2, "edu": _2, "gob": _2, "in": _2, "info": _2, "int": _2, "mil": _2, "net": _2, "nom": _2, "org": _2, "web": _2 }], "nl": [1, { "co": _3, "hosting-cluster": _3, "gov": _3, "khplay": _3, "123website": _3, "myspreadshop": _3, "transurl": _6, "cistron": _3, "demon": _3 }], "no": [1, { "fhs": _2, "folkebibl": _2, "fylkesbibl": _2, "idrett": _2, "museum": _2, "priv": _2, "vgs": _2, "dep": _2, "herad": _2, "kommune": _2, "mil": _2, "stat": _2, "aa": _67, "ah": _67, "bu": _67, "fm": _67, "hl": _67, "hm": _67, "jan-mayen": _67, "mr": _67, "nl": _67, "nt": _67, "of": _67, "ol": _67, "oslo": _67, "rl": _67, "sf": _67, "st": _67, "svalbard": _67, "tm": _67, "tr": _67, "va": _67, "vf": _67, "akrehamn": _2, "xn--krehamn-dxa": _2, "\xE5krehamn": _2, "algard": _2, "xn--lgrd-poac": _2, "\xE5lg\xE5rd": _2, "arna": _2, "bronnoysund": _2, "xn--brnnysund-m8ac": _2, "br\xF8nn\xF8ysund": _2, "brumunddal": _2, "bryne": _2, "drobak": _2, "xn--drbak-wua": _2, "dr\xF8bak": _2, "egersund": _2, "fetsund": _2, "floro": _2, "xn--flor-jra": _2, "flor\xF8": _2, "fredrikstad": _2, "hokksund": _2, "honefoss": _2, "xn--hnefoss-q1a": _2, "h\xF8nefoss": _2, "jessheim": _2, "jorpeland": _2, "xn--jrpeland-54a": _2, "j\xF8rpeland": _2, "kirkenes": _2, "kopervik": _2, "krokstadelva": _2, "langevag": _2, "xn--langevg-jxa": _2, "langev\xE5g": _2, "leirvik": _2, "mjondalen": _2, "xn--mjndalen-64a": _2, "mj\xF8ndalen": _2, "mo-i-rana": _2, "mosjoen": _2, "xn--mosjen-eya": _2, "mosj\xF8en": _2, "nesoddtangen": _2, "orkanger": _2, "osoyro": _2, "xn--osyro-wua": _2, "os\xF8yro": _2, "raholt": _2, "xn--rholt-mra": _2, "r\xE5holt": _2, "sandnessjoen": _2, "xn--sandnessjen-ogb": _2, "sandnessj\xF8en": _2, "skedsmokorset": _2, "slattum": _2, "spjelkavik": _2, "stathelle": _2, "stavern": _2, "stjordalshalsen": _2, "xn--stjrdalshalsen-sqb": _2, "stj\xF8rdalshalsen": _2, "tananger": _2, "tranby": _2, "vossevangen": _2, "aarborte": _2, "aejrie": _2, "afjord": _2, "xn--fjord-lra": _2, "\xE5fjord": _2, "agdenes": _2, "akershus": _68, "aknoluokta": _2, "xn--koluokta-7ya57h": _2, "\xE1k\u014Boluokta": _2, "al": _2, "xn--l-1fa": _2, "\xE5l": _2, "alaheadju": _2, "xn--laheadju-7ya": _2, "\xE1laheadju": _2, "alesund": _2, "xn--lesund-hua": _2, "\xE5lesund": _2, "alstahaug": _2, "alta": _2, "xn--lt-liac": _2, "\xE1lt\xE1": _2, "alvdal": _2, "amli": _2, "xn--mli-tla": _2, "\xE5mli": _2, "amot": _2, "xn--mot-tla": _2, "\xE5mot": _2, "andasuolo": _2, "andebu": _2, "andoy": _2, "xn--andy-ira": _2, "and\xF8y": _2, "ardal": _2, "xn--rdal-poa": _2, "\xE5rdal": _2, "aremark": _2, "arendal": _2, "xn--s-1fa": _2, "\xE5s": _2, "aseral": _2, "xn--seral-lra": _2, "\xE5seral": _2, "asker": _2, "askim": _2, "askoy": _2, "xn--asky-ira": _2, "ask\xF8y": _2, "askvoll": _2, "asnes": _2, "xn--snes-poa": _2, "\xE5snes": _2, "audnedaln": _2, "aukra": _2, "aure": _2, "aurland": _2, "aurskog-holand": _2, "xn--aurskog-hland-jnb": _2, "aurskog-h\xF8land": _2, "austevoll": _2, "austrheim": _2, "averoy": _2, "xn--avery-yua": _2, "aver\xF8y": _2, "badaddja": _2, "xn--bdddj-mrabd": _2, "b\xE5d\xE5ddj\xE5": _2, "xn--brum-voa": _2, "b\xE6rum": _2, "bahcavuotna": _2, "xn--bhcavuotna-s4a": _2, "b\xE1hcavuotna": _2, "bahccavuotna": _2, "xn--bhccavuotna-k7a": _2, "b\xE1hccavuotna": _2, "baidar": _2, "xn--bidr-5nac": _2, "b\xE1id\xE1r": _2, "bajddar": _2, "xn--bjddar-pta": _2, "b\xE1jddar": _2, "balat": _2, "xn--blt-elab": _2, "b\xE1l\xE1t": _2, "balestrand": _2, "ballangen": _2, "balsfjord": _2, "bamble": _2, "bardu": _2, "barum": _2, "batsfjord": _2, "xn--btsfjord-9za": _2, "b\xE5tsfjord": _2, "bearalvahki": _2, "xn--bearalvhki-y4a": _2, "bearalv\xE1hki": _2, "beardu": _2, "beiarn": _2, "berg": _2, "bergen": _2, "berlevag": _2, "xn--berlevg-jxa": _2, "berlev\xE5g": _2, "bievat": _2, "xn--bievt-0qa": _2, "biev\xE1t": _2, "bindal": _2, "birkenes": _2, "bjerkreim": _2, "bjugn": _2, "bodo": _2, "xn--bod-2na": _2, "bod\xF8": _2, "bokn": _2, "bomlo": _2, "xn--bmlo-gra": _2, "b\xF8mlo": _2, "bremanger": _2, "bronnoy": _2, "xn--brnny-wuac": _2, "br\xF8nn\xF8y": _2, "budejju": _2, "buskerud": _68, "bygland": _2, "bykle": _2, "cahcesuolo": _2, "xn--hcesuolo-7ya35b": _2, "\u010D\xE1hcesuolo": _2, "davvenjarga": _2, "xn--davvenjrga-y4a": _2, "davvenj\xE1rga": _2, "davvesiida": _2, "deatnu": _2, "dielddanuorri": _2, "divtasvuodna": _2, "divttasvuotna": _2, "donna": _2, "xn--dnna-gra": _2, "d\xF8nna": _2, "dovre": _2, "drammen": _2, "drangedal": _2, "dyroy": _2, "xn--dyry-ira": _2, "dyr\xF8y": _2, "eid": _2, "eidfjord": _2, "eidsberg": _2, "eidskog": _2, "eidsvoll": _2, "eigersund": _2, "elverum": _2, "enebakk": _2, "engerdal": _2, "etne": _2, "etnedal": _2, "evenassi": _2, "xn--eveni-0qa01ga": _2, "even\xE1\u0161\u0161i": _2, "evenes": _2, "evje-og-hornnes": _2, "farsund": _2, "fauske": _2, "fedje": _2, "fet": _2, "finnoy": _2, "xn--finny-yua": _2, "finn\xF8y": _2, "fitjar": _2, "fjaler": _2, "fjell": _2, "fla": _2, "xn--fl-zia": _2, "fl\xE5": _2, "flakstad": _2, "flatanger": _2, "flekkefjord": _2, "flesberg": _2, "flora": _2, "folldal": _2, "forde": _2, "xn--frde-gra": _2, "f\xF8rde": _2, "forsand": _2, "fosnes": _2, "xn--frna-woa": _2, "fr\xE6na": _2, "frana": _2, "frei": _2, "frogn": _2, "froland": _2, "frosta": _2, "froya": _2, "xn--frya-hra": _2, "fr\xF8ya": _2, "fuoisku": _2, "fuossko": _2, "fusa": _2, "fyresdal": _2, "gaivuotna": _2, "xn--givuotna-8ya": _2, "g\xE1ivuotna": _2, "galsa": _2, "xn--gls-elac": _2, "g\xE1ls\xE1": _2, "gamvik": _2, "gangaviika": _2, "xn--ggaviika-8ya47h": _2, "g\xE1\u014Bgaviika": _2, "gaular": _2, "gausdal": _2, "giehtavuoatna": _2, "gildeskal": _2, "xn--gildeskl-g0a": _2, "gildesk\xE5l": _2, "giske": _2, "gjemnes": _2, "gjerdrum": _2, "gjerstad": _2, "gjesdal": _2, "gjovik": _2, "xn--gjvik-wua": _2, "gj\xF8vik": _2, "gloppen": _2, "gol": _2, "gran": _2, "grane": _2, "granvin": _2, "gratangen": _2, "grimstad": _2, "grong": _2, "grue": _2, "gulen": _2, "guovdageaidnu": _2, "ha": _2, "xn--h-2fa": _2, "h\xE5": _2, "habmer": _2, "xn--hbmer-xqa": _2, "h\xE1bmer": _2, "hadsel": _2, "xn--hgebostad-g3a": _2, "h\xE6gebostad": _2, "hagebostad": _2, "halden": _2, "halsa": _2, "hamar": _2, "hamaroy": _2, "hammarfeasta": _2, "xn--hmmrfeasta-s4ac": _2, "h\xE1mm\xE1rfeasta": _2, "hammerfest": _2, "hapmir": _2, "xn--hpmir-xqa": _2, "h\xE1pmir": _2, "haram": _2, "hareid": _2, "harstad": _2, "hasvik": _2, "hattfjelldal": _2, "haugesund": _2, "hedmark": [0, { "os": _2, "valer": _2, "xn--vler-qoa": _2, "v\xE5ler": _2 }], "hemne": _2, "hemnes": _2, "hemsedal": _2, "hitra": _2, "hjartdal": _2, "hjelmeland": _2, "hobol": _2, "xn--hobl-ira": _2, "hob\xF8l": _2, "hof": _2, "hol": _2, "hole": _2, "holmestrand": _2, "holtalen": _2, "xn--holtlen-hxa": _2, "holt\xE5len": _2, "hordaland": [0, { "os": _2 }], "hornindal": _2, "horten": _2, "hoyanger": _2, "xn--hyanger-q1a": _2, "h\xF8yanger": _2, "hoylandet": _2, "xn--hylandet-54a": _2, "h\xF8ylandet": _2, "hurdal": _2, "hurum": _2, "hvaler": _2, "hyllestad": _2, "ibestad": _2, "inderoy": _2, "xn--indery-fya": _2, "inder\xF8y": _2, "iveland": _2, "ivgu": _2, "jevnaker": _2, "jolster": _2, "xn--jlster-bya": _2, "j\xF8lster": _2, "jondal": _2, "kafjord": _2, "xn--kfjord-iua": _2, "k\xE5fjord": _2, "karasjohka": _2, "xn--krjohka-hwab49j": _2, "k\xE1r\xE1\u0161johka": _2, "karasjok": _2, "karlsoy": _2, "karmoy": _2, "xn--karmy-yua": _2, "karm\xF8y": _2, "kautokeino": _2, "klabu": _2, "xn--klbu-woa": _2, "kl\xE6bu": _2, "klepp": _2, "kongsberg": _2, "kongsvinger": _2, "kraanghke": _2, "xn--kranghke-b0a": _2, "kr\xE5anghke": _2, "kragero": _2, "xn--krager-gya": _2, "krager\xF8": _2, "kristiansand": _2, "kristiansund": _2, "krodsherad": _2, "xn--krdsherad-m8a": _2, "kr\xF8dsherad": _2, "xn--kvfjord-nxa": _2, "kv\xE6fjord": _2, "xn--kvnangen-k0a": _2, "kv\xE6nangen": _2, "kvafjord": _2, "kvalsund": _2, "kvam": _2, "kvanangen": _2, "kvinesdal": _2, "kvinnherad": _2, "kviteseid": _2, "kvitsoy": _2, "xn--kvitsy-fya": _2, "kvits\xF8y": _2, "laakesvuemie": _2, "xn--lrdal-sra": _2, "l\xE6rdal": _2, "lahppi": _2, "xn--lhppi-xqa": _2, "l\xE1hppi": _2, "lardal": _2, "larvik": _2, "lavagis": _2, "lavangen": _2, "leangaviika": _2, "xn--leagaviika-52b": _2, "lea\u014Bgaviika": _2, "lebesby": _2, "leikanger": _2, "leirfjord": _2, "leka": _2, "leksvik": _2, "lenvik": _2, "lerdal": _2, "lesja": _2, "levanger": _2, "lier": _2, "lierne": _2, "lillehammer": _2, "lillesand": _2, "lindas": _2, "xn--linds-pra": _2, "lind\xE5s": _2, "lindesnes": _2, "loabat": _2, "xn--loabt-0qa": _2, "loab\xE1t": _2, "lodingen": _2, "xn--ldingen-q1a": _2, "l\xF8dingen": _2, "lom": _2, "loppa": _2, "lorenskog": _2, "xn--lrenskog-54a": _2, "l\xF8renskog": _2, "loten": _2, "xn--lten-gra": _2, "l\xF8ten": _2, "lund": _2, "lunner": _2, "luroy": _2, "xn--lury-ira": _2, "lur\xF8y": _2, "luster": _2, "lyngdal": _2, "lyngen": _2, "malatvuopmi": _2, "xn--mlatvuopmi-s4a": _2, "m\xE1latvuopmi": _2, "malselv": _2, "xn--mlselv-iua": _2, "m\xE5lselv": _2, "malvik": _2, "mandal": _2, "marker": _2, "marnardal": _2, "masfjorden": _2, "masoy": _2, "xn--msy-ula0h": _2, "m\xE5s\xF8y": _2, "matta-varjjat": _2, "xn--mtta-vrjjat-k7af": _2, "m\xE1tta-v\xE1rjjat": _2, "meland": _2, "meldal": _2, "melhus": _2, "meloy": _2, "xn--mely-ira": _2, "mel\xF8y": _2, "meraker": _2, "xn--merker-kua": _2, "mer\xE5ker": _2, "midsund": _2, "midtre-gauldal": _2, "moareke": _2, "xn--moreke-jua": _2, "mo\xE5reke": _2, "modalen": _2, "modum": _2, "molde": _2, "more-og-romsdal": [0, { "heroy": _2, "sande": _2 }], "xn--mre-og-romsdal-qqb": [0, { "xn--hery-ira": _2, "sande": _2 }], "m\xF8re-og-romsdal": [0, { "her\xF8y": _2, "sande": _2 }], "moskenes": _2, "moss": _2, "muosat": _2, "xn--muost-0qa": _2, "muos\xE1t": _2, "naamesjevuemie": _2, "xn--nmesjevuemie-tcba": _2, "n\xE5\xE5mesjevuemie": _2, "xn--nry-yla5g": _2, "n\xE6r\xF8y": _2, "namdalseid": _2, "namsos": _2, "namsskogan": _2, "nannestad": _2, "naroy": _2, "narviika": _2, "narvik": _2, "naustdal": _2, "navuotna": _2, "xn--nvuotna-hwa": _2, "n\xE1vuotna": _2, "nedre-eiker": _2, "nesna": _2, "nesodden": _2, "nesseby": _2, "nesset": _2, "nissedal": _2, "nittedal": _2, "nord-aurdal": _2, "nord-fron": _2, "nord-odal": _2, "norddal": _2, "nordkapp": _2, "nordland": [0, { "bo": _2, "xn--b-5ga": _2, "b\xF8": _2, "heroy": _2, "xn--hery-ira": _2, "her\xF8y": _2 }], "nordre-land": _2, "nordreisa": _2, "nore-og-uvdal": _2, "notodden": _2, "notteroy": _2, "xn--nttery-byae": _2, "n\xF8tter\xF8y": _2, "odda": _2, "oksnes": _2, "xn--ksnes-uua": _2, "\xF8ksnes": _2, "omasvuotna": _2, "oppdal": _2, "oppegard": _2, "xn--oppegrd-ixa": _2, "oppeg\xE5rd": _2, "orkdal": _2, "orland": _2, "xn--rland-uua": _2, "\xF8rland": _2, "orskog": _2, "xn--rskog-uua": _2, "\xF8rskog": _2, "orsta": _2, "xn--rsta-fra": _2, "\xF8rsta": _2, "osen": _2, "osteroy": _2, "xn--ostery-fya": _2, "oster\xF8y": _2, "ostfold": [0, { "valer": _2 }], "xn--stfold-9xa": [0, { "xn--vler-qoa": _2 }], "\xF8stfold": [0, { "v\xE5ler": _2 }], "ostre-toten": _2, "xn--stre-toten-zcb": _2, "\xF8stre-toten": _2, "overhalla": _2, "ovre-eiker": _2, "xn--vre-eiker-k8a": _2, "\xF8vre-eiker": _2, "oyer": _2, "xn--yer-zna": _2, "\xF8yer": _2, "oygarden": _2, "xn--ygarden-p1a": _2, "\xF8ygarden": _2, "oystre-slidre": _2, "xn--ystre-slidre-ujb": _2, "\xF8ystre-slidre": _2, "porsanger": _2, "porsangu": _2, "xn--porsgu-sta26f": _2, "pors\xE1\u014Bgu": _2, "porsgrunn": _2, "rade": _2, "xn--rde-ula": _2, "r\xE5de": _2, "radoy": _2, "xn--rady-ira": _2, "rad\xF8y": _2, "xn--rlingen-mxa": _2, "r\xE6lingen": _2, "rahkkeravju": _2, "xn--rhkkervju-01af": _2, "r\xE1hkker\xE1vju": _2, "raisa": _2, "xn--risa-5na": _2, "r\xE1isa": _2, "rakkestad": _2, "ralingen": _2, "rana": _2, "randaberg": _2, "rauma": _2, "rendalen": _2, "rennebu": _2, "rennesoy": _2, "xn--rennesy-v1a": _2, "rennes\xF8y": _2, "rindal": _2, "ringebu": _2, "ringerike": _2, "ringsaker": _2, "risor": _2, "xn--risr-ira": _2, "ris\xF8r": _2, "rissa": _2, "roan": _2, "rodoy": _2, "xn--rdy-0nab": _2, "r\xF8d\xF8y": _2, "rollag": _2, "romsa": _2, "romskog": _2, "xn--rmskog-bya": _2, "r\xF8mskog": _2, "roros": _2, "xn--rros-gra": _2, "r\xF8ros": _2, "rost": _2, "xn--rst-0na": _2, "r\xF8st": _2, "royken": _2, "xn--ryken-vua": _2, "r\xF8yken": _2, "royrvik": _2, "xn--ryrvik-bya": _2, "r\xF8yrvik": _2, "ruovat": _2, "rygge": _2, "salangen": _2, "salat": _2, "xn--slat-5na": _2, "s\xE1lat": _2, "xn--slt-elab": _2, "s\xE1l\xE1t": _2, "saltdal": _2, "samnanger": _2, "sandefjord": _2, "sandnes": _2, "sandoy": _2, "xn--sandy-yua": _2, "sand\xF8y": _2, "sarpsborg": _2, "sauda": _2, "sauherad": _2, "sel": _2, "selbu": _2, "selje": _2, "seljord": _2, "siellak": _2, "sigdal": _2, "siljan": _2, "sirdal": _2, "skanit": _2, "xn--sknit-yqa": _2, "sk\xE1nit": _2, "skanland": _2, "xn--sknland-fxa": _2, "sk\xE5nland": _2, "skaun": _2, "skedsmo": _2, "ski": _2, "skien": _2, "skierva": _2, "xn--skierv-uta": _2, "skierv\xE1": _2, "skiptvet": _2, "skjak": _2, "xn--skjk-soa": _2, "skj\xE5k": _2, "skjervoy": _2, "xn--skjervy-v1a": _2, "skjerv\xF8y": _2, "skodje": _2, "smola": _2, "xn--smla-hra": _2, "sm\xF8la": _2, "snaase": _2, "xn--snase-nra": _2, "sn\xE5ase": _2, "snasa": _2, "xn--snsa-roa": _2, "sn\xE5sa": _2, "snillfjord": _2, "snoasa": _2, "sogndal": _2, "sogne": _2, "xn--sgne-gra": _2, "s\xF8gne": _2, "sokndal": _2, "sola": _2, "solund": _2, "somna": _2, "xn--smna-gra": _2, "s\xF8mna": _2, "sondre-land": _2, "xn--sndre-land-0cb": _2, "s\xF8ndre-land": _2, "songdalen": _2, "sor-aurdal": _2, "xn--sr-aurdal-l8a": _2, "s\xF8r-aurdal": _2, "sor-fron": _2, "xn--sr-fron-q1a": _2, "s\xF8r-fron": _2, "sor-odal": _2, "xn--sr-odal-q1a": _2, "s\xF8r-odal": _2, "sor-varanger": _2, "xn--sr-varanger-ggb": _2, "s\xF8r-varanger": _2, "sorfold": _2, "xn--srfold-bya": _2, "s\xF8rfold": _2, "sorreisa": _2, "xn--srreisa-q1a": _2, "s\xF8rreisa": _2, "sortland": _2, "sorum": _2, "xn--srum-gra": _2, "s\xF8rum": _2, "spydeberg": _2, "stange": _2, "stavanger": _2, "steigen": _2, "steinkjer": _2, "stjordal": _2, "xn--stjrdal-s1a": _2, "stj\xF8rdal": _2, "stokke": _2, "stor-elvdal": _2, "stord": _2, "stordal": _2, "storfjord": _2, "strand": _2, "stranda": _2, "stryn": _2, "sula": _2, "suldal": _2, "sund": _2, "sunndal": _2, "surnadal": _2, "sveio": _2, "svelvik": _2, "sykkylven": _2, "tana": _2, "telemark": [0, { "bo": _2, "xn--b-5ga": _2, "b\xF8": _2 }], "time": _2, "tingvoll": _2, "tinn": _2, "tjeldsund": _2, "tjome": _2, "xn--tjme-hra": _2, "tj\xF8me": _2, "tokke": _2, "tolga": _2, "tonsberg": _2, "xn--tnsberg-q1a": _2, "t\xF8nsberg": _2, "torsken": _2, "xn--trna-woa": _2, "tr\xE6na": _2, "trana": _2, "tranoy": _2, "xn--trany-yua": _2, "tran\xF8y": _2, "troandin": _2, "trogstad": _2, "xn--trgstad-r1a": _2, "tr\xF8gstad": _2, "tromsa": _2, "tromso": _2, "xn--troms-zua": _2, "troms\xF8": _2, "trondheim": _2, "trysil": _2, "tvedestrand": _2, "tydal": _2, "tynset": _2, "tysfjord": _2, "tysnes": _2, "xn--tysvr-vra": _2, "tysv\xE6r": _2, "tysvar": _2, "ullensaker": _2, "ullensvang": _2, "ulvik": _2, "unjarga": _2, "xn--unjrga-rta": _2, "unj\xE1rga": _2, "utsira": _2, "vaapste": _2, "vadso": _2, "xn--vads-jra": _2, "vads\xF8": _2, "xn--vry-yla5g": _2, "v\xE6r\xF8y": _2, "vaga": _2, "xn--vg-yiab": _2, "v\xE5g\xE5": _2, "vagan": _2, "xn--vgan-qoa": _2, "v\xE5gan": _2, "vagsoy": _2, "xn--vgsy-qoa0j": _2, "v\xE5gs\xF8y": _2, "vaksdal": _2, "valle": _2, "vang": _2, "vanylven": _2, "vardo": _2, "xn--vard-jra": _2, "vard\xF8": _2, "varggat": _2, "xn--vrggt-xqad": _2, "v\xE1rgg\xE1t": _2, "varoy": _2, "vefsn": _2, "vega": _2, "vegarshei": _2, "xn--vegrshei-c0a": _2, "veg\xE5rshei": _2, "vennesla": _2, "verdal": _2, "verran": _2, "vestby": _2, "vestfold": [0, { "sande": _2 }], "vestnes": _2, "vestre-slidre": _2, "vestre-toten": _2, "vestvagoy": _2, "xn--vestvgy-ixa6o": _2, "vestv\xE5g\xF8y": _2, "vevelstad": _2, "vik": _2, "vikna": _2, "vindafjord": _2, "voagat": _2, "volda": _2, "voss": _2, "co": _3, "123hjemmeside": _3, "myspreadshop": _3 }], "np": _21, "nr": _61, "nu": [1, { "merseine": _3, "mine": _3, "shacknet": _3, "enterprisecloud": _3 }], "nz": [1, { "ac": _2, "co": _2, "cri": _2, "geek": _2, "gen": _2, "govt": _2, "health": _2, "iwi": _2, "kiwi": _2, "maori": _2, "xn--mori-qsa": _2, "m\u0101ori": _2, "mil": _2, "net": _2, "org": _2, "parliament": _2, "school": _2, "cloudns": _3 }], "om": [1, { "co": _2, "com": _2, "edu": _2, "gov": _2, "med": _2, "museum": _2, "net": _2, "org": _2, "pro": _2 }], "onion": _2, "org": [1, { "altervista": _3, "pimienta": _3, "poivron": _3, "potager": _3, "sweetpepper": _3, "cdn77": [0, { "c": _3, "rsc": _3 }], "cdn77-secure": [0, { "origin": [0, { "ssl": _3 }] }], "ae": _3, "cloudns": _3, "ip-dynamic": _3, "ddnss": _3, "dpdns": _3, "duckdns": _3, "tunk": _3, "blogdns": _3, "blogsite": _3, "boldlygoingnowhere": _3, "dnsalias": _3, "dnsdojo": _3, "doesntexist": _3, "dontexist": _3, "doomdns": _3, "dvrdns": _3, "dynalias": _3, "dyndns": [2, { "go": _3, "home": _3 }], "endofinternet": _3, "endoftheinternet": _3, "from-me": _3, "game-host": _3, "gotdns": _3, "hobby-site": _3, "homedns": _3, "homeftp": _3, "homelinux": _3, "homeunix": _3, "is-a-bruinsfan": _3, "is-a-candidate": _3, "is-a-celticsfan": _3, "is-a-chef": _3, "is-a-geek": _3, "is-a-knight": _3, "is-a-linux-user": _3, "is-a-patsfan": _3, "is-a-soxfan": _3, "is-found": _3, "is-lost": _3, "is-saved": _3, "is-very-bad": _3, "is-very-evil": _3, "is-very-good": _3, "is-very-nice": _3, "is-very-sweet": _3, "isa-geek": _3, "kicks-ass": _3, "misconfused": _3, "podzone": _3, "readmyblog": _3, "selfip": _3, "sellsyourhome": _3, "servebbs": _3, "serveftp": _3, "servegame": _3, "stuff-4-sale": _3, "webhop": _3, "accesscam": _3, "camdvr": _3, "freeddns": _3, "mywire": _3, "roxa": _3, "webredirect": _3, "twmail": _3, "eu": [2, { "al": _3, "asso": _3, "at": _3, "au": _3, "be": _3, "bg": _3, "ca": _3, "cd": _3, "ch": _3, "cn": _3, "cy": _3, "cz": _3, "de": _3, "dk": _3, "edu": _3, "ee": _3, "es": _3, "fi": _3, "fr": _3, "gr": _3, "hr": _3, "hu": _3, "ie": _3, "il": _3, "in": _3, "int": _3, "is": _3, "it": _3, "jp": _3, "kr": _3, "lt": _3, "lu": _3, "lv": _3, "me": _3, "mk": _3, "mt": _3, "my": _3, "net": _3, "ng": _3, "nl": _3, "no": _3, "nz": _3, "pl": _3, "pt": _3, "ro": _3, "ru": _3, "se": _3, "si": _3, "sk": _3, "tr": _3, "uk": _3, "us": _3 }], "fedorainfracloud": _3, "fedorapeople": _3, "fedoraproject": [0, { "cloud": _3, "os": _46, "stg": [0, { "os": _46 }] }], "freedesktop": _3, "hatenadiary": _3, "hepforge": _3, "in-dsl": _3, "in-vpn": _3, "js": _3, "barsy": _3, "mayfirst": _3, "routingthecloud": _3, "bmoattachments": _3, "cable-modem": _3, "collegefan": _3, "couchpotatofries": _3, "hopto": _3, "mlbfan": _3, "myftp": _3, "mysecuritycamera": _3, "nflfan": _3, "no-ip": _3, "read-books": _3, "ufcfan": _3, "zapto": _3, "dynserv": _3, "now-dns": _3, "is-local": _3, "httpbin": _3, "pubtls": _3, "jpn": _3, "my-firewall": _3, "myfirewall": _3, "spdns": _3, "small-web": _3, "dsmynas": _3, "familyds": _3, "teckids": _60, "tuxfamily": _3, "hk": _3, "us": _3, "toolforge": _3, "wmcloud": [2, { "beta": _3 }], "wmflabs": _3, "za": _3 }], "pa": [1, { "abo": _2, "ac": _2, "com": _2, "edu": _2, "gob": _2, "ing": _2, "med": _2, "net": _2, "nom": _2, "org": _2, "sld": _2 }], "pe": [1, { "com": _2, "edu": _2, "gob": _2, "mil": _2, "net": _2, "nom": _2, "org": _2 }], "pf": [1, { "com": _2, "edu": _2, "org": _2 }], "pg": _21, "ph": [1, { "com": _2, "edu": _2, "gov": _2, "i": _2, "mil": _2, "net": _2, "ngo": _2, "org": _2, "cloudns": _3 }], "pk": [1, { "ac": _2, "biz": _2, "com": _2, "edu": _2, "fam": _2, "gkp": _2, "gob": _2, "gog": _2, "gok": _2, "gop": _2, "gos": _2, "gov": _2, "net": _2, "org": _2, "web": _2 }], "pl": [1, { "com": _2, "net": _2, "org": _2, "agro": _2, "aid": _2, "atm": _2, "auto": _2, "biz": _2, "edu": _2, "gmina": _2, "gsm": _2, "info": _2, "mail": _2, "media": _2, "miasta": _2, "mil": _2, "nieruchomosci": _2, "nom": _2, "pc": _2, "powiat": _2, "priv": _2, "realestate": _2, "rel": _2, "sex": _2, "shop": _2, "sklep": _2, "sos": _2, "szkola": _2, "targi": _2, "tm": _2, "tourism": _2, "travel": _2, "turystyka": _2, "gov": [1, { "ap": _2, "griw": _2, "ic": _2, "is": _2, "kmpsp": _2, "konsulat": _2, "kppsp": _2, "kwp": _2, "kwpsp": _2, "mup": _2, "mw": _2, "oia": _2, "oirm": _2, "oke": _2, "oow": _2, "oschr": _2, "oum": _2, "pa": _2, "pinb": _2, "piw": _2, "po": _2, "pr": _2, "psp": _2, "psse": _2, "pup": _2, "rzgw": _2, "sa": _2, "sdn": _2, "sko": _2, "so": _2, "sr": _2, "starostwo": _2, "ug": _2, "ugim": _2, "um": _2, "umig": _2, "upow": _2, "uppo": _2, "us": _2, "uw": _2, "uzs": _2, "wif": _2, "wiih": _2, "winb": _2, "wios": _2, "witd": _2, "wiw": _2, "wkz": _2, "wsa": _2, "wskr": _2, "wsse": _2, "wuoz": _2, "wzmiuw": _2, "zp": _2, "zpisdn": _2 }], "augustow": _2, "babia-gora": _2, "bedzin": _2, "beskidy": _2, "bialowieza": _2, "bialystok": _2, "bielawa": _2, "bieszczady": _2, "boleslawiec": _2, "bydgoszcz": _2, "bytom": _2, "cieszyn": _2, "czeladz": _2, "czest": _2, "dlugoleka": _2, "elblag": _2, "elk": _2, "glogow": _2, "gniezno": _2, "gorlice": _2, "grajewo": _2, "ilawa": _2, "jaworzno": _2, "jelenia-gora": _2, "jgora": _2, "kalisz": _2, "karpacz": _2, "kartuzy": _2, "kaszuby": _2, "katowice": _2, "kazimierz-dolny": _2, "kepno": _2, "ketrzyn": _2, "klodzko": _2, "kobierzyce": _2, "kolobrzeg": _2, "konin": _2, "konskowola": _2, "kutno": _2, "lapy": _2, "lebork": _2, "legnica": _2, "lezajsk": _2, "limanowa": _2, "lomza": _2, "lowicz": _2, "lubin": _2, "lukow": _2, "malbork": _2, "malopolska": _2, "mazowsze": _2, "mazury": _2, "mielec": _2, "mielno": _2, "mragowo": _2, "naklo": _2, "nowaruda": _2, "nysa": _2, "olawa": _2, "olecko": _2, "olkusz": _2, "olsztyn": _2, "opoczno": _2, "opole": _2, "ostroda": _2, "ostroleka": _2, "ostrowiec": _2, "ostrowwlkp": _2, "pila": _2, "pisz": _2, "podhale": _2, "podlasie": _2, "polkowice": _2, "pomorskie": _2, "pomorze": _2, "prochowice": _2, "pruszkow": _2, "przeworsk": _2, "pulawy": _2, "radom": _2, "rawa-maz": _2, "rybnik": _2, "rzeszow": _2, "sanok": _2, "sejny": _2, "skoczow": _2, "slask": _2, "slupsk": _2, "sosnowiec": _2, "stalowa-wola": _2, "starachowice": _2, "stargard": _2, "suwalki": _2, "swidnica": _2, "swiebodzin": _2, "swinoujscie": _2, "szczecin": _2, "szczytno": _2, "tarnobrzeg": _2, "tgory": _2, "turek": _2, "tychy": _2, "ustka": _2, "walbrzych": _2, "warmia": _2, "warszawa": _2, "waw": _2, "wegrow": _2, "wielun": _2, "wlocl": _2, "wloclawek": _2, "wodzislaw": _2, "wolomin": _2, "wroclaw": _2, "zachpomor": _2, "zagan": _2, "zarow": _2, "zgora": _2, "zgorzelec": _2, "art": _3, "gliwice": _3, "krakow": _3, "poznan": _3, "wroc": _3, "zakopane": _3, "beep": _3, "ecommerce-shop": _3, "cfolks": _3, "dfirma": _3, "dkonto": _3, "you2": _3, "shoparena": _3, "homesklep": _3, "sdscloud": _3, "unicloud": _3, "lodz": _3, "pabianice": _3, "plock": _3, "sieradz": _3, "skierniewice": _3, "zgierz": _3, "krasnik": _3, "leczna": _3, "lubartow": _3, "lublin": _3, "poniatowa": _3, "swidnik": _3, "co": _3, "torun": _3, "simplesite": _3, "myspreadshop": _3, "gda": _3, "gdansk": _3, "gdynia": _3, "med": _3, "sopot": _3, "bielsko": _3 }], "pm": [1, { "own": _3, "name": _3 }], "pn": [1, { "co": _2, "edu": _2, "gov": _2, "net": _2, "org": _2 }], "post": _2, "pr": [1, { "biz": _2, "com": _2, "edu": _2, "gov": _2, "info": _2, "isla": _2, "name": _2, "net": _2, "org": _2, "pro": _2, "ac": _2, "est": _2, "prof": _2 }], "pro": [1, { "aaa": _2, "aca": _2, "acct": _2, "avocat": _2, "bar": _2, "cpa": _2, "eng": _2, "jur": _2, "law": _2, "med": _2, "recht": _2, "cloudns": _3, "keenetic": _3, "barsy": _3, "ngrok": _3 }], "ps": [1, { "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "plo": _2, "sec": _2 }], "pt": [1, { "com": _2, "edu": _2, "gov": _2, "int": _2, "net": _2, "nome": _2, "org": _2, "publ": _2, "123paginaweb": _3 }], "pw": [1, { "gov": _2, "cloudns": _3, "x443": _3 }], "py": [1, { "com": _2, "coop": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2 }], "qa": [1, { "com": _2, "edu": _2, "gov": _2, "mil": _2, "name": _2, "net": _2, "org": _2, "sch": _2 }], "re": [1, { "asso": _2, "com": _2, "netlib": _3, "can": _3 }], "ro": [1, { "arts": _2, "com": _2, "firm": _2, "info": _2, "nom": _2, "nt": _2, "org": _2, "rec": _2, "store": _2, "tm": _2, "www": _2, "co": _3, "shop": _3, "barsy": _3 }], "rs": [1, { "ac": _2, "co": _2, "edu": _2, "gov": _2, "in": _2, "org": _2, "brendly": _20, "barsy": _3, "ox": _3 }], "ru": [1, { "ac": _3, "edu": _3, "gov": _3, "int": _3, "mil": _3, "eurodir": _3, "adygeya": _3, "bashkiria": _3, "bir": _3, "cbg": _3, "com": _3, "dagestan": _3, "grozny": _3, "kalmykia": _3, "kustanai": _3, "marine": _3, "mordovia": _3, "msk": _3, "mytis": _3, "nalchik": _3, "nov": _3, "pyatigorsk": _3, "spb": _3, "vladikavkaz": _3, "vladimir": _3, "na4u": _3, "mircloud": _3, "myjino": [2, { "hosting": _6, "landing": _6, "spectrum": _6, "vps": _6 }], "cldmail": [0, { "hb": _3 }], "mcdir": [2, { "vps": _3 }], "mcpre": _3, "net": _3, "org": _3, "pp": _3, "ras": _3 }], "rw": [1, { "ac": _2, "co": _2, "coop": _2, "gov": _2, "mil": _2, "net": _2, "org": _2 }], "sa": [1, { "com": _2, "edu": _2, "gov": _2, "med": _2, "net": _2, "org": _2, "pub": _2, "sch": _2 }], "sb": _4, "sc": _4, "sd": [1, { "com": _2, "edu": _2, "gov": _2, "info": _2, "med": _2, "net": _2, "org": _2, "tv": _2 }], "se": [1, { "a": _2, "ac": _2, "b": _2, "bd": _2, "brand": _2, "c": _2, "d": _2, "e": _2, "f": _2, "fh": _2, "fhsk": _2, "fhv": _2, "g": _2, "h": _2, "i": _2, "k": _2, "komforb": _2, "kommunalforbund": _2, "komvux": _2, "l": _2, "lanbib": _2, "m": _2, "n": _2, "naturbruksgymn": _2, "o": _2, "org": _2, "p": _2, "parti": _2, "pp": _2, "press": _2, "r": _2, "s": _2, "t": _2, "tm": _2, "u": _2, "w": _2, "x": _2, "y": _2, "z": _2, "com": _3, "iopsys": _3, "123minsida": _3, "itcouldbewor": _3, "myspreadshop": _3 }], "sg": [1, { "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "enscaled": _3 }], "sh": [1, { "com": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "hashbang": _3, "botda": _3, "lovable": _3, "platform": [0, { "ent": _3, "eu": _3, "us": _3 }], "teleport": _3, "now": _3 }], "si": [1, { "f5": _3, "gitapp": _3, "gitpage": _3 }], "sj": _2, "sk": [1, { "org": _2 }], "sl": _4, "sm": _2, "sn": [1, { "art": _2, "com": _2, "edu": _2, "gouv": _2, "org": _2, "univ": _2 }], "so": [1, { "com": _2, "edu": _2, "gov": _2, "me": _2, "net": _2, "org": _2, "surveys": _3 }], "sr": _2, "ss": [1, { "biz": _2, "co": _2, "com": _2, "edu": _2, "gov": _2, "me": _2, "net": _2, "org": _2, "sch": _2 }], "st": [1, { "co": _2, "com": _2, "consulado": _2, "edu": _2, "embaixada": _2, "mil": _2, "net": _2, "org": _2, "principe": _2, "saotome": _2, "store": _2, "helioho": _3, "cn": _6, "kirara": _3, "noho": _3 }], "su": [1, { "abkhazia": _3, "adygeya": _3, "aktyubinsk": _3, "arkhangelsk": _3, "armenia": _3, "ashgabad": _3, "azerbaijan": _3, "balashov": _3, "bashkiria": _3, "bryansk": _3, "bukhara": _3, "chimkent": _3, "dagestan": _3, "east-kazakhstan": _3, "exnet": _3, "georgia": _3, "grozny": _3, "ivanovo": _3, "jambyl": _3, "kalmykia": _3, "kaluga": _3, "karacol": _3, "karaganda": _3, "karelia": _3, "khakassia": _3, "krasnodar": _3, "kurgan": _3, "kustanai": _3, "lenug": _3, "mangyshlak": _3, "mordovia": _3, "msk": _3, "murmansk": _3, "nalchik": _3, "navoi": _3, "north-kazakhstan": _3, "nov": _3, "obninsk": _3, "penza": _3, "pokrovsk": _3, "sochi": _3, "spb": _3, "tashkent": _3, "termez": _3, "togliatti": _3, "troitsk": _3, "tselinograd": _3, "tula": _3, "tuva": _3, "vladikavkaz": _3, "vladimir": _3, "vologda": _3 }], "sv": [1, { "com": _2, "edu": _2, "gob": _2, "org": _2, "red": _2 }], "sx": _10, "sy": _5, "sz": [1, { "ac": _2, "co": _2, "org": _2 }], "tc": _2, "td": _2, "tel": _2, "tf": [1, { "sch": _3 }], "tg": _2, "th": [1, { "ac": _2, "co": _2, "go": _2, "in": _2, "mi": _2, "net": _2, "or": _2, "online": _3, "shop": _3 }], "tj": [1, { "ac": _2, "biz": _2, "co": _2, "com": _2, "edu": _2, "go": _2, "gov": _2, "int": _2, "mil": _2, "name": _2, "net": _2, "nic": _2, "org": _2, "test": _2, "web": _2 }], "tk": _2, "tl": _10, "tm": [1, { "co": _2, "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "nom": _2, "org": _2 }], "tn": [1, { "com": _2, "ens": _2, "fin": _2, "gov": _2, "ind": _2, "info": _2, "intl": _2, "mincom": _2, "nat": _2, "net": _2, "org": _2, "perso": _2, "tourism": _2, "orangecloud": _3 }], "to": [1, { "611": _3, "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "oya": _3, "x0": _3, "quickconnect": _29, "vpnplus": _3, "nett": _3 }], "tr": [1, { "av": _2, "bbs": _2, "bel": _2, "biz": _2, "com": _2, "dr": _2, "edu": _2, "gen": _2, "gov": _2, "info": _2, "k12": _2, "kep": _2, "mil": _2, "name": _2, "net": _2, "org": _2, "pol": _2, "tel": _2, "tsk": _2, "tv": _2, "web": _2, "nc": _10 }], "tt": [1, { "biz": _2, "co": _2, "com": _2, "edu": _2, "gov": _2, "info": _2, "mil": _2, "name": _2, "net": _2, "org": _2, "pro": _2 }], "tv": [1, { "better-than": _3, "dyndns": _3, "on-the-web": _3, "worse-than": _3, "from": _3, "sakura": _3 }], "tw": [1, { "club": _2, "com": [1, { "mymailer": _3 }], "ebiz": _2, "edu": _2, "game": _2, "gov": _2, "idv": _2, "mil": _2, "net": _2, "org": _2, "url": _3, "mydns": _3 }], "tz": [1, { "ac": _2, "co": _2, "go": _2, "hotel": _2, "info": _2, "me": _2, "mil": _2, "mobi": _2, "ne": _2, "or": _2, "sc": _2, "tv": _2 }], "ua": [1, { "com": _2, "edu": _2, "gov": _2, "in": _2, "net": _2, "org": _2, "cherkassy": _2, "cherkasy": _2, "chernigov": _2, "chernihiv": _2, "chernivtsi": _2, "chernovtsy": _2, "ck": _2, "cn": _2, "cr": _2, "crimea": _2, "cv": _2, "dn": _2, "dnepropetrovsk": _2, "dnipropetrovsk": _2, "donetsk": _2, "dp": _2, "if": _2, "ivano-frankivsk": _2, "kh": _2, "kharkiv": _2, "kharkov": _2, "kherson": _2, "khmelnitskiy": _2, "khmelnytskyi": _2, "kiev": _2, "kirovograd": _2, "km": _2, "kr": _2, "kropyvnytskyi": _2, "krym": _2, "ks": _2, "kv": _2, "kyiv": _2, "lg": _2, "lt": _2, "lugansk": _2, "luhansk": _2, "lutsk": _2, "lv": _2, "lviv": _2, "mk": _2, "mykolaiv": _2, "nikolaev": _2, "od": _2, "odesa": _2, "odessa": _2, "pl": _2, "poltava": _2, "rivne": _2, "rovno": _2, "rv": _2, "sb": _2, "sebastopol": _2, "sevastopol": _2, "sm": _2, "sumy": _2, "te": _2, "ternopil": _2, "uz": _2, "uzhgorod": _2, "uzhhorod": _2, "vinnica": _2, "vinnytsia": _2, "vn": _2, "volyn": _2, "yalta": _2, "zakarpattia": _2, "zaporizhzhe": _2, "zaporizhzhia": _2, "zhitomir": _2, "zhytomyr": _2, "zp": _2, "zt": _2, "cc": _3, "inf": _3, "ltd": _3, "cx": _3, "biz": _3, "co": _3, "pp": _3, "v": _3 }], "ug": [1, { "ac": _2, "co": _2, "com": _2, "edu": _2, "go": _2, "gov": _2, "mil": _2, "ne": _2, "or": _2, "org": _2, "sc": _2, "us": _2 }], "uk": [1, { "ac": _2, "co": [1, { "bytemark": [0, { "dh": _3, "vm": _3 }], "layershift": _49, "barsy": _3, "barsyonline": _3, "retrosnub": _59, "nh-serv": _3, "no-ip": _3, "adimo": _3, "myspreadshop": _3 }], "gov": [1, { "api": _3, "campaign": _3, "service": _3 }], "ltd": _2, "me": _2, "net": _2, "nhs": _2, "org": [1, { "glug": _3, "lug": _3, "lugs": _3, "affinitylottery": _3, "raffleentry": _3, "weeklylottery": _3 }], "plc": _2, "police": _2, "sch": _21, "conn": _3, "copro": _3, "hosp": _3, "independent-commission": _3, "independent-inquest": _3, "independent-inquiry": _3, "independent-panel": _3, "independent-review": _3, "public-inquiry": _3, "royal-commission": _3, "pymnt": _3, "barsy": _3, "nimsite": _3, "oraclegovcloudapps": _6 }], "us": [1, { "dni": _2, "isa": _2, "nsn": _2, "ak": _69, "al": _69, "ar": _69, "as": _69, "az": _69, "ca": _69, "co": _69, "ct": _69, "dc": _69, "de": _70, "fl": _69, "ga": _69, "gu": _69, "hi": _71, "ia": _69, "id": _69, "il": _69, "in": _69, "ks": _69, "ky": _69, "la": _69, "ma": [1, { "k12": [1, { "chtr": _2, "paroch": _2, "pvt": _2 }], "cc": _2, "lib": _2 }], "md": _69, "me": _69, "mi": [1, { "k12": _2, "cc": _2, "lib": _2, "ann-arbor": _2, "cog": _2, "dst": _2, "eaton": _2, "gen": _2, "mus": _2, "tec": _2, "washtenaw": _2 }], "mn": _69, "mo": _69, "ms": [1, { "k12": _2, "cc": _2 }], "mt": _69, "nc": _69, "nd": _71, "ne": _69, "nh": _69, "nj": _69, "nm": _69, "nv": _69, "ny": _69, "oh": _69, "ok": _69, "or": _69, "pa": _69, "pr": _69, "ri": _71, "sc": _69, "sd": _71, "tn": _69, "tx": _69, "ut": _69, "va": _69, "vi": _69, "vt": _69, "wa": _69, "wi": _69, "wv": _70, "wy": _69, "cloudns": _3, "is-by": _3, "land-4-sale": _3, "stuff-4-sale": _3, "heliohost": _3, "enscaled": [0, { "phx": _3 }], "mircloud": _3, "azure-api": _3, "azurewebsites": _3, "ngo": _3, "golffan": _3, "noip": _3, "pointto": _3, "freeddns": _3, "srv": [2, { "gh": _3, "gl": _3 }], "servername": _3 }], "uy": [1, { "com": _2, "edu": _2, "gub": _2, "mil": _2, "net": _2, "org": _2, "gv": _3 }], "uz": [1, { "co": _2, "com": _2, "net": _2, "org": _2 }], "va": _2, "vc": [1, { "com": _2, "edu": _2, "gov": _2, "mil": _2, "net": _2, "org": _2, "gv": [2, { "d": _3 }], "0e": _6, "mydns": _3 }], "ve": [1, { "arts": _2, "bib": _2, "co": _2, "com": _2, "e12": _2, "edu": _2, "emprende": _2, "firm": _2, "gob": _2, "gov": _2, "ia": _2, "info": _2, "int": _2, "mil": _2, "net": _2, "nom": _2, "org": _2, "rar": _2, "rec": _2, "store": _2, "tec": _2, "web": _2 }], "vg": [1, { "edu": _2 }], "vi": [1, { "co": _2, "com": _2, "k12": _2, "net": _2, "org": _2 }], "vn": [1, { "ac": _2, "ai": _2, "biz": _2, "com": _2, "edu": _2, "gov": _2, "health": _2, "id": _2, "info": _2, "int": _2, "io": _2, "name": _2, "net": _2, "org": _2, "pro": _2, "angiang": _2, "bacgiang": _2, "backan": _2, "baclieu": _2, "bacninh": _2, "baria-vungtau": _2, "bentre": _2, "binhdinh": _2, "binhduong": _2, "binhphuoc": _2, "binhthuan": _2, "camau": _2, "cantho": _2, "caobang": _2, "daklak": _2, "daknong": _2, "danang": _2, "dienbien": _2, "dongnai": _2, "dongthap": _2, "gialai": _2, "hagiang": _2, "haiduong": _2, "haiphong": _2, "hanam": _2, "hanoi": _2, "hatinh": _2, "haugiang": _2, "hoabinh": _2, "hue": _2, "hungyen": _2, "khanhhoa": _2, "kiengiang": _2, "kontum": _2, "laichau": _2, "lamdong": _2, "langson": _2, "laocai": _2, "longan": _2, "namdinh": _2, "nghean": _2, "ninhbinh": _2, "ninhthuan": _2, "phutho": _2, "phuyen": _2, "quangbinh": _2, "quangnam": _2, "quangngai": _2, "quangninh": _2, "quangtri": _2, "soctrang": _2, "sonla": _2, "tayninh": _2, "thaibinh": _2, "thainguyen": _2, "thanhhoa": _2, "thanhphohochiminh": _2, "thuathienhue": _2, "tiengiang": _2, "travinh": _2, "tuyenquang": _2, "vinhlong": _2, "vinhphuc": _2, "yenbai": _2 }], "vu": _48, "wf": [1, { "biz": _3, "sch": _3 }], "ws": [1, { "com": _2, "edu": _2, "gov": _2, "net": _2, "org": _2, "advisor": _6, "cloud66": _3, "dyndns": _3, "mypets": _3 }], "yt": [1, { "org": _3 }], "xn--mgbaam7a8h": _2, "\u0627\u0645\u0627\u0631\u0627\u062A": _2, "xn--y9a3aq": _2, "\u0570\u0561\u0575": _2, "xn--54b7fta0cc": _2, "\u09AC\u09BE\u0982\u09B2\u09BE": _2, "xn--90ae": _2, "\u0431\u0433": _2, "xn--mgbcpq6gpa1a": _2, "\u0627\u0644\u0628\u062D\u0631\u064A\u0646": _2, "xn--90ais": _2, "\u0431\u0435\u043B": _2, "xn--fiqs8s": _2, "\u4E2D\u56FD": _2, "xn--fiqz9s": _2, "\u4E2D\u570B": _2, "xn--lgbbat1ad8j": _2, "\u0627\u0644\u062C\u0632\u0627\u0626\u0631": _2, "xn--wgbh1c": _2, "\u0645\u0635\u0631": _2, "xn--e1a4c": _2, "\u0435\u044E": _2, "xn--qxa6a": _2, "\u03B5\u03C5": _2, "xn--mgbah1a3hjkrd": _2, "\u0645\u0648\u0631\u064A\u062A\u0627\u0646\u064A\u0627": _2, "xn--node": _2, "\u10D2\u10D4": _2, "xn--qxam": _2, "\u03B5\u03BB": _2, "xn--j6w193g": [1, { "xn--gmqw5a": _2, "xn--55qx5d": _2, "xn--mxtq1m": _2, "xn--wcvs22d": _2, "xn--uc0atv": _2, "xn--od0alg": _2 }], "\u9999\u6E2F": [1, { "\u500B\u4EBA": _2, "\u516C\u53F8": _2, "\u653F\u5E9C": _2, "\u6559\u80B2": _2, "\u7D44\u7E54": _2, "\u7DB2\u7D61": _2 }], "xn--2scrj9c": _2, "\u0CAD\u0CBE\u0CB0\u0CA4": _2, "xn--3hcrj9c": _2, "\u0B2D\u0B3E\u0B30\u0B24": _2, "xn--45br5cyl": _2, "\u09AD\u09BE\u09F0\u09A4": _2, "xn--h2breg3eve": _2, "\u092D\u093E\u0930\u0924\u092E\u094D": _2, "xn--h2brj9c8c": _2, "\u092D\u093E\u0930\u094B\u0924": _2, "xn--mgbgu82a": _2, "\u0680\u0627\u0631\u062A": _2, "xn--rvc1e0am3e": _2, "\u0D2D\u0D3E\u0D30\u0D24\u0D02": _2, "xn--h2brj9c": _2, "\u092D\u093E\u0930\u0924": _2, "xn--mgbbh1a": _2, "\u0628\u0627\u0631\u062A": _2, "xn--mgbbh1a71e": _2, "\u0628\u06BE\u0627\u0631\u062A": _2, "xn--fpcrj9c3d": _2, "\u0C2D\u0C3E\u0C30\u0C24\u0C4D": _2, "xn--gecrj9c": _2, "\u0AAD\u0ABE\u0AB0\u0AA4": _2, "xn--s9brj9c": _2, "\u0A2D\u0A3E\u0A30\u0A24": _2, "xn--45brj9c": _2, "\u09AD\u09BE\u09B0\u09A4": _2, "xn--xkc2dl3a5ee0h": _2, "\u0B87\u0BA8\u0BCD\u0BA4\u0BBF\u0BAF\u0BBE": _2, "xn--mgba3a4f16a": _2, "\u0627\u06CC\u0631\u0627\u0646": _2, "xn--mgba3a4fra": _2, "\u0627\u064A\u0631\u0627\u0646": _2, "xn--mgbtx2b": _2, "\u0639\u0631\u0627\u0642": _2, "xn--mgbayh7gpa": _2, "\u0627\u0644\u0627\u0631\u062F\u0646": _2, "xn--3e0b707e": _2, "\uD55C\uAD6D": _2, "xn--80ao21a": _2, "\u049B\u0430\u0437": _2, "xn--q7ce6a": _2, "\u0EA5\u0EB2\u0EA7": _2, "xn--fzc2c9e2c": _2, "\u0DBD\u0D82\u0D9A\u0DCF": _2, "xn--xkc2al3hye2a": _2, "\u0B87\u0BB2\u0B99\u0BCD\u0B95\u0BC8": _2, "xn--mgbc0a9azcg": _2, "\u0627\u0644\u0645\u063A\u0631\u0628": _2, "xn--d1alf": _2, "\u043C\u043A\u0434": _2, "xn--l1acc": _2, "\u043C\u043E\u043D": _2, "xn--mix891f": _2, "\u6FB3\u9580": _2, "xn--mix082f": _2, "\u6FB3\u95E8": _2, "xn--mgbx4cd0ab": _2, "\u0645\u0644\u064A\u0633\u064A\u0627": _2, "xn--mgb9awbf": _2, "\u0639\u0645\u0627\u0646": _2, "xn--mgbai9azgqp6j": _2, "\u067E\u0627\u06A9\u0633\u062A\u0627\u0646": _2, "xn--mgbai9a5eva00b": _2, "\u067E\u0627\u0643\u0633\u062A\u0627\u0646": _2, "xn--ygbi2ammx": _2, "\u0641\u0644\u0633\u0637\u064A\u0646": _2, "xn--90a3ac": [1, { "xn--80au": _2, "xn--90azh": _2, "xn--d1at": _2, "xn--c1avg": _2, "xn--o1ac": _2, "xn--o1ach": _2 }], "\u0441\u0440\u0431": [1, { "\u0430\u043A": _2, "\u043E\u0431\u0440": _2, "\u043E\u0434": _2, "\u043E\u0440\u0433": _2, "\u043F\u0440": _2, "\u0443\u043F\u0440": _2 }], "xn--p1ai": _2, "\u0440\u0444": _2, "xn--wgbl6a": _2, "\u0642\u0637\u0631": _2, "xn--mgberp4a5d4ar": _2, "\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629": _2, "xn--mgberp4a5d4a87g": _2, "\u0627\u0644\u0633\u0639\u0648\u062F\u06CC\u0629": _2, "xn--mgbqly7c0a67fbc": _2, "\u0627\u0644\u0633\u0639\u0648\u062F\u06CC\u06C3": _2, "xn--mgbqly7cvafr": _2, "\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0647": _2, "xn--mgbpl2fh": _2, "\u0633\u0648\u062F\u0627\u0646": _2, "xn--yfro4i67o": _2, "\u65B0\u52A0\u5761": _2, "xn--clchc0ea0b2g2a9gcd": _2, "\u0B9A\u0BBF\u0B99\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0BC2\u0BB0\u0BCD": _2, "xn--ogbpf8fl": _2, "\u0633\u0648\u0631\u064A\u0629": _2, "xn--mgbtf8fl": _2, "\u0633\u0648\u0631\u064A\u0627": _2, "xn--o3cw4h": [1, { "xn--o3cyx2a": _2, "xn--12co0c3b4eva": _2, "xn--m3ch0j3a": _2, "xn--h3cuzk1di": _2, "xn--12c1fe0br": _2, "xn--12cfi8ixb8l": _2 }], "\u0E44\u0E17\u0E22": [1, { "\u0E17\u0E2B\u0E32\u0E23": _2, "\u0E18\u0E38\u0E23\u0E01\u0E34\u0E08": _2, "\u0E40\u0E19\u0E47\u0E15": _2, "\u0E23\u0E31\u0E10\u0E1A\u0E32\u0E25": _2, "\u0E28\u0E36\u0E01\u0E29\u0E32": _2, "\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23": _2 }], "xn--pgbs0dh": _2, "\u062A\u0648\u0646\u0633": _2, "xn--kpry57d": _2, "\u53F0\u7063": _2, "xn--kprw13d": _2, "\u53F0\u6E7E": _2, "xn--nnx388a": _2, "\u81FA\u7063": _2, "xn--j1amh": _2, "\u0443\u043A\u0440": _2, "xn--mgb2ddes": _2, "\u0627\u0644\u064A\u0645\u0646": _2, "xxx": _2, "ye": _5, "za": [0, { "ac": _2, "agric": _2, "alt": _2, "co": _2, "edu": _2, "gov": _2, "grondar": _2, "law": _2, "mil": _2, "net": _2, "ngo": _2, "nic": _2, "nis": _2, "nom": _2, "org": _2, "school": _2, "tm": _2, "web": _2 }], "zm": [1, { "ac": _2, "biz": _2, "co": _2, "com": _2, "edu": _2, "gov": _2, "info": _2, "mil": _2, "net": _2, "org": _2, "sch": _2 }], "zw": [1, { "ac": _2, "co": _2, "gov": _2, "mil": _2, "org": _2 }], "aaa": _2, "aarp": _2, "abb": _2, "abbott": _2, "abbvie": _2, "abc": _2, "able": _2, "abogado": _2, "abudhabi": _2, "academy": [1, { "official": _3 }], "accenture": _2, "accountant": _2, "accountants": _2, "aco": _2, "actor": _2, "ads": _2, "adult": _2, "aeg": _2, "aetna": _2, "afl": _2, "africa": _2, "agakhan": _2, "agency": _2, "aig": _2, "airbus": _2, "airforce": _2, "airtel": _2, "akdn": _2, "alibaba": _2, "alipay": _2, "allfinanz": _2, "allstate": _2, "ally": _2, "alsace": _2, "alstom": _2, "amazon": _2, "americanexpress": _2, "americanfamily": _2, "amex": _2, "amfam": _2, "amica": _2, "amsterdam": _2, "analytics": _2, "android": _2, "anquan": _2, "anz": _2, "aol": _2, "apartments": _2, "app": [1, { "adaptable": _3, "aiven": _3, "beget": _6, "brave": _7, "clerk": _3, "clerkstage": _3, "cloudflare": _3, "wnext": _3, "csb": [2, { "preview": _3 }], "convex": _3, "corespeed": _3, "deta": _3, "ondigitalocean": _3, "easypanel": _3, "encr": [2, { "frontend": _3 }], "evervault": _8, "expo": [2, { "on": _3, "staging": [2, { "on": _3 }] }], "edgecompute": _3, "on-fleek": _3, "flutterflow": _3, "sprites": _3, "e2b": _3, "framer": _3, "gadget": _3, "github": _3, "hosted": _6, "run": [0, { "*": _3, "mtls": _6 }], "web": _3, "hackclub": _3, "hasura": _3, "onhercules": _3, "botdash": _3, "shiptoday": _3, "leapcell": _3, "loginline": _3, "lovable": _3, "luyani": _3, "magicpatterns": _3, "medusajs": _3, "messerli": _3, "miren": _3, "mocha": _3, "netlify": _3, "ngrok": _3, "ngrok-free": _3, "developer": _6, "noop": _3, "northflank": _6, "pplx": _3, "upsun": _6, "railway": [0, { "up": _3 }], "replit": _9, "nyat": _3, "snowflake": [0, { "*": _3, "privatelink": _6 }], "streamlit": _3, "spawnbase": _3, "telebit": _3, "typedream": _3, "vercel": _3, "wal": _3, "wasmer": _3, "bookonline": _3, "windsurf": _3, "base44": _3, "zeabur": _3, "zerops": _6 }], "apple": [1, { "int": [2, { "cloud": [0, { "*": _3, "r": [0, { "*": _3, "ap-north-1": _6, "ap-south-1": _6, "ap-south-2": _6, "eu-central-1": _6, "eu-north-1": _6, "us-central-1": _6, "us-central-2": _6, "us-east-1": _6, "us-east-2": _6, "us-west-1": _6, "us-west-2": _6, "us-west-3": _6 }] }] }] }], "aquarelle": _2, "arab": _2, "aramco": _2, "archi": _2, "army": _2, "art": _2, "arte": _2, "asda": _2, "associates": _2, "athleta": _2, "attorney": _2, "auction": _2, "audi": _2, "audible": _2, "audio": _2, "auspost": _2, "author": _2, "auto": _2, "autos": _2, "aws": [1, { "on": [0, { "af-south-1": _11, "ap-east-1": _11, "ap-northeast-1": _11, "ap-northeast-2": _11, "ap-northeast-3": _11, "ap-south-1": _11, "ap-south-2": _12, "ap-southeast-1": _11, "ap-southeast-2": _11, "ap-southeast-3": _11, "ap-southeast-4": _12, "ap-southeast-5": _12, "ca-central-1": _11, "ca-west-1": _12, "eu-central-1": _11, "eu-central-2": _12, "eu-north-1": _11, "eu-south-1": _11, "eu-south-2": _12, "eu-west-1": _11, "eu-west-2": _11, "eu-west-3": _11, "il-central-1": _12, "me-central-1": _12, "me-south-1": _11, "sa-east-1": _11, "us-east-1": _11, "us-east-2": _11, "us-west-1": _11, "us-west-2": _11, "ap-southeast-7": _13, "mx-central-1": _13, "us-gov-east-1": _14, "us-gov-west-1": _14 }], "sagemaker": [0, { "ap-northeast-1": _16, "ap-northeast-2": _16, "ap-south-1": _16, "ap-southeast-1": _16, "ap-southeast-2": _16, "ca-central-1": _18, "eu-central-1": _16, "eu-west-1": _16, "eu-west-2": _16, "us-east-1": _18, "us-east-2": _18, "us-west-2": _18, "af-south-1": _15, "ap-east-1": _15, "ap-northeast-3": _15, "ap-south-2": _17, "ap-southeast-3": _15, "ap-southeast-4": _17, "ca-west-1": [0, { "notebook": _3, "notebook-fips": _3 }], "eu-central-2": _15, "eu-north-1": _15, "eu-south-1": _15, "eu-south-2": _15, "eu-west-3": _15, "il-central-1": _15, "me-central-1": _15, "me-south-1": _15, "sa-east-1": _15, "us-gov-east-1": _19, "us-gov-west-1": _19, "us-west-1": [0, { "notebook": _3, "notebook-fips": _3, "studio": _3 }], "experiments": _6 }], "repost": [0, { "private": _6 }] }], "axa": _2, "azure": _2, "baby": _2, "baidu": _2, "banamex": _2, "band": _2, "bank": _2, "bar": _2, "barcelona": _2, "barclaycard": _2, "barclays": _2, "barefoot": _2, "bargains": _2, "baseball": _2, "basketball": [1, { "aus": _3, "nz": _3 }], "bauhaus": _2, "bayern": _2, "bbc": _2, "bbt": _2, "bbva": _2, "bcg": _2, "bcn": _2, "beats": _2, "beauty": _2, "beer": _2, "berlin": _2, "best": _2, "bestbuy": _2, "bet": _2, "bharti": _2, "bible": _2, "bid": _2, "bike": _2, "bing": _2, "bingo": _2, "bio": _2, "black": _2, "blackfriday": _2, "blockbuster": _2, "blog": _2, "bloomberg": _2, "blue": _2, "bms": _2, "bmw": _2, "bnpparibas": _2, "boats": _2, "boehringer": _2, "bofa": _2, "bom": _2, "bond": _2, "boo": _2, "book": _2, "booking": _2, "bosch": _2, "bostik": _2, "boston": _2, "bot": _2, "boutique": _2, "box": _2, "bradesco": _2, "bridgestone": _2, "broadway": _2, "broker": _2, "brother": _2, "brussels": _2, "build": [1, { "shiptoday": _3, "v0": _3, "windsurf": _3 }], "builders": [1, { "cloudsite": _3 }], "business": _22, "buy": _2, "buzz": _2, "bzh": _2, "cab": _2, "cafe": _2, "cal": _2, "call": _2, "calvinklein": _2, "cam": _2, "camera": _2, "camp": [1, { "emf": [0, { "at": _3 }] }], "canon": _2, "capetown": _2, "capital": _2, "capitalone": _2, "car": _2, "caravan": _2, "cards": _2, "care": _2, "career": _2, "careers": _2, "cars": _2, "casa": [1, { "nabu": [0, { "ui": _3 }] }], "case": [1, { "sav": _3 }], "cash": _2, "casino": _2, "catering": _2, "catholic": _2, "cba": _2, "cbn": _2, "cbre": _2, "center": _2, "ceo": _2, "cern": _2, "cfa": _2, "cfd": _2, "chanel": _2, "channel": _2, "charity": _2, "chase": _2, "chat": _2, "cheap": _2, "chintai": _2, "christmas": _2, "chrome": _2, "church": _2, "cipriani": _2, "circle": _2, "cisco": _2, "citadel": _2, "citi": _2, "citic": _2, "city": _2, "claims": _2, "cleaning": _2, "click": _2, "clinic": _2, "clinique": _2, "clothing": _2, "cloud": [1, { "antagonist": _3, "begetcdn": _6, "convex": _24, "elementor": _3, "emergent": _3, "encoway": [0, { "eu": _3 }], "statics": _6, "ravendb": _3, "axarnet": [0, { "es-1": _3 }], "diadem": _3, "jelastic": [0, { "vip": _3 }], "jele": _3, "jenv-aruba": [0, { "aruba": [0, { "eur": [0, { "it1": _3 }] }], "it1": _3 }], "keliweb": [2, { "cs": _3 }], "oxa": [2, { "tn": _3, "uk": _3 }], "primetel": [2, { "uk": _3 }], "reclaim": [0, { "ca": _3, "uk": _3, "us": _3 }], "trendhosting": [0, { "ch": _3, "de": _3 }], "jote": _3, "jotelulu": _3, "kuleuven": _3, "laravel": _3, "linkyard": _3, "magentosite": _6, "matlab": _3, "observablehq": _3, "perspecta": _3, "vapor": _3, "on-rancher": _6, "scw": [0, { "baremetal": [0, { "fr-par-1": _3, "fr-par-2": _3, "nl-ams-1": _3 }], "fr-par": [0, { "cockpit": _3, "ddl": _3, "dtwh": _3, "fnc": [2, { "functions": _3 }], "ifr": _3, "k8s": _25, "kafk": _3, "mgdb": _3, "rdb": _3, "s3": _3, "s3-website": _3, "scbl": _3, "whm": _3 }], "instances": [0, { "priv": _3, "pub": _3 }], "k8s": _3, "nl-ams": [0, { "cockpit": _3, "ddl": _3, "dtwh": _3, "ifr": _3, "k8s": _25, "kafk": _3, "mgdb": _3, "rdb": _3, "s3": _3, "s3-website": _3, "scbl": _3, "whm": _3 }], "pl-waw": [0, { "cockpit": _3, "ddl": _3, "dtwh": _3, "ifr": _3, "k8s": _25, "kafk": _3, "mgdb": _3, "rdb": _3, "s3": _3, "s3-website": _3, "scbl": _3 }], "scalebook": _3, "smartlabeling": _3 }], "servebolt": _3, "onstackit": [0, { "runs": _3 }], "trafficplex": _3, "unison-services": _3, "urown": _3, "voorloper": _3, "zap": _3 }], "club": [1, { "cloudns": _3, "jele": _3, "barsy": _3 }], "clubmed": _2, "coach": _2, "codes": [1, { "owo": _6 }], "coffee": _2, "college": _2, "cologne": _2, "commbank": _2, "community": [1, { "nog": _3, "ravendb": _3, "myforum": _3 }], "company": [1, { "mybox": _3 }], "compare": _2, "computer": _2, "comsec": _2, "condos": _2, "construction": _2, "consulting": _2, "contact": _2, "contractors": _2, "cooking": _2, "cool": [1, { "elementor": _3, "de": _3 }], "corsica": _2, "country": _2, "coupon": _2, "coupons": _2, "courses": _2, "cpa": _2, "credit": _2, "creditcard": _2, "creditunion": _2, "cricket": _2, "crown": _2, "crs": _2, "cruise": _2, "cruises": _2, "cuisinella": _2, "cymru": _2, "cyou": _2, "dad": _2, "dance": _2, "data": _2, "date": _2, "dating": _2, "datsun": _2, "day": _2, "dclk": _2, "dds": _2, "deal": _2, "dealer": _2, "deals": _2, "degree": _2, "delivery": _2, "dell": _2, "deloitte": _2, "delta": _2, "democrat": _2, "dental": _2, "dentist": _2, "desi": _2, "design": [1, { "graphic": _3, "bss": _3 }], "dev": [1, { "myaddr": _3, "panel": _3, "bearblog": _3, "brave": _7, "lcl": _6, "lclstage": _6, "stg": _6, "stgstage": _6, "pages": _3, "r2": _3, "workers": _3, "deno": _3, "deno-staging": _3, "deta": _3, "lp": [2, { "api": _3, "objects": _3 }], "evervault": _8, "payload": _3, "fly": _3, "githubpreview": _3, "gateway": _6, "grebedoc": _3, "botdash": _3, "inbrowser": _6, "is-a-good": _3, "iserv": _3, "leapcell": _3, "runcontainers": _3, "localcert": [0, { "user": _6 }], "loginline": _3, "barsy": _3, "mediatech": _3, "mocha-sandbox": _3, "modx": _3, "ngrok": _3, "ngrok-free": _3, "is-a-fullstack": _3, "is-cool": _3, "is-not-a": _3, "localplayer": _3, "xmit": _3, "platter-app": _3, "replit": [2, { "archer": _3, "bones": _3, "canary": _3, "global": _3, "hacker": _3, "id": _3, "janeway": _3, "kim": _3, "kira": _3, "kirk": _3, "odo": _3, "paris": _3, "picard": _3, "pike": _3, "prerelease": _3, "reed": _3, "riker": _3, "sisko": _3, "spock": _3, "staging": _3, "sulu": _3, "tarpit": _3, "teams": _3, "tucker": _3, "wesley": _3, "worf": _3 }], "crm": [0, { "aa": _6, "ab": _6, "ac": _6, "ad": _6, "ae": _6, "af": _6, "ci": _6, "d": _6, "pa": _6, "pb": _6, "pc": _6, "pd": _6, "pe": _6, "pf": _6, "w": _6, "wa": _6, "wb": _6, "wc": _6, "wd": _6, "we": _6, "wf": _6 }], "erp": _51, "vercel": _3, "webhare": _6, "hrsn": _3, "is-a": _3 }], "dhl": _2, "diamonds": _2, "diet": _2, "digital": [1, { "cloudapps": [2, { "london": _3 }] }], "direct": [1, { "libp2p": _3 }], "directory": _2, "discount": _2, "discover": _2, "dish": _2, "diy": [1, { "discourse": _3, "imagine": _3 }], "dnp": _2, "docs": _2, "doctor": _2, "dog": _2, "domains": _2, "dot": _2, "download": _2, "drive": _2, "dtv": _2, "dubai": _2, "dupont": _2, "durban": _2, "dvag": _2, "dvr": _2, "earth": _2, "eat": _2, "eco": _2, "edeka": _2, "education": _22, "email": [1, { "crisp": [0, { "on": _3 }], "intouch": _3, "tawk": _53, "tawkto": _53 }], "emerck": _2, "energy": _2, "engineer": _2, "engineering": _2, "enterprises": _2, "epson": _2, "equipment": _2, "ericsson": _2, "erni": _2, "esq": _2, "estate": [1, { "compute": _6 }], "eurovision": _2, "eus": [1, { "party": _54 }], "events": [1, { "koobin": _3, "co": _3 }], "exchange": _2, "expert": _2, "exposed": _2, "express": _2, "extraspace": _2, "fage": _2, "fail": _2, "fairwinds": _2, "faith": _2, "family": _2, "fan": _2, "fans": _2, "farm": [1, { "storj": _3 }], "farmers": _2, "fashion": _2, "fast": _2, "fedex": _2, "feedback": _2, "ferrari": _2, "ferrero": _2, "fidelity": _2, "fido": _2, "film": _2, "final": _2, "finance": _2, "financial": _22, "fire": _2, "firestone": _2, "firmdale": _2, "fish": _2, "fishing": _2, "fit": _2, "fitness": _2, "flickr": _2, "flights": _2, "flir": _2, "florist": _2, "flowers": _2, "fly": _2, "foo": _2, "food": _2, "football": _2, "ford": _2, "forex": _2, "forsale": _2, "forum": _2, "foundation": _2, "fox": _2, "free": _2, "fresenius": _2, "frl": _2, "frogans": _2, "frontier": _2, "ftr": _2, "fujitsu": _2, "fun": _55, "fund": _2, "furniture": _2, "futbol": _2, "fyi": _2, "gal": _2, "gallery": _2, "gallo": _2, "gallup": _2, "game": _2, "games": [1, { "pley": _3, "sheezy": _3 }], "gap": _2, "garden": _2, "gay": [1, { "pages": _3 }], "gbiz": _2, "gdn": [1, { "cnpy": _3 }], "gea": _2, "gent": _2, "genting": _2, "george": _2, "ggee": _2, "gift": _2, "gifts": _2, "gives": _2, "giving": _2, "glass": _2, "gle": _2, "global": [1, { "appwrite": _3 }], "globo": _2, "gmail": _2, "gmbh": _2, "gmo": _2, "gmx": _2, "godaddy": _2, "gold": _2, "goldpoint": _2, "golf": _2, "goodyear": _2, "goog": [1, { "cloud": _3, "translate": _3, "usercontent": _6 }], "google": _2, "gop": _2, "got": _2, "grainger": _2, "graphics": _2, "gratis": _2, "green": _2, "gripe": _2, "grocery": _2, "group": [1, { "discourse": _3 }], "gucci": _2, "guge": _2, "guide": _2, "guitars": _2, "guru": _2, "hair": _2, "hamburg": _2, "hangout": _2, "haus": _2, "hbo": _2, "hdfc": _2, "hdfcbank": _2, "health": [1, { "hra": _3 }], "healthcare": _2, "help": _2, "helsinki": _2, "here": _2, "hermes": _2, "hiphop": _2, "hisamitsu": _2, "hitachi": _2, "hiv": _2, "hkt": _2, "hockey": _2, "holdings": _2, "holiday": _2, "homedepot": _2, "homegoods": _2, "homes": _2, "homesense": _2, "honda": _2, "horse": _2, "hospital": _2, "host": [1, { "cloudaccess": _3, "freesite": _3, "easypanel": _3, "emergent": _3, "fastvps": _3, "myfast": _3, "gadget": _3, "tempurl": _3, "wpmudev": _3, "iserv": _3, "jele": _3, "mircloud": _3, "bolt": _3, "wp2": _3, "half": _3 }], "hosting": [1, { "opencraft": _3 }], "hot": _2, "hotel": _2, "hotels": _2, "hotmail": _2, "house": _2, "how": _2, "hsbc": _2, "hughes": _2, "hyatt": _2, "hyundai": _2, "ibm": _2, "icbc": _2, "ice": _2, "icu": _2, "ieee": _2, "ifm": _2, "ikano": _2, "imamat": _2, "imdb": _2, "immo": _2, "immobilien": _2, "inc": _2, "industries": _2, "infiniti": _2, "ing": _2, "ink": _2, "institute": _2, "insurance": _2, "insure": _2, "international": _2, "intuit": _2, "investments": _2, "ipiranga": _2, "irish": _2, "ismaili": _2, "ist": _2, "istanbul": _2, "itau": _2, "itv": _2, "jaguar": _2, "java": _2, "jcb": _2, "jeep": _2, "jetzt": _2, "jewelry": _2, "jio": _2, "jll": _2, "jmp": _2, "jnj": _2, "joburg": _2, "jot": _2, "joy": _2, "jpmorgan": _2, "jprs": _2, "juegos": _2, "juniper": _2, "kaufen": _2, "kddi": _2, "kerryhotels": _2, "kerryproperties": _2, "kfh": _2, "kia": _2, "kids": _2, "kim": _2, "kindle": _2, "kitchen": _2, "kiwi": _2, "koeln": _2, "komatsu": _2, "kosher": _2, "kpmg": _2, "kpn": _2, "krd": [1, { "co": _3, "edu": _3 }], "kred": _2, "kuokgroup": _2, "kyoto": _2, "lacaixa": _2, "lamborghini": _2, "lamer": _2, "land": _2, "landrover": _2, "lanxess": _2, "lasalle": _2, "lat": _2, "latino": _2, "latrobe": _2, "law": _2, "lawyer": _2, "lds": _2, "lease": _2, "leclerc": _2, "lefrak": _2, "legal": _2, "lego": _2, "lexus": _2, "lgbt": _2, "lidl": _2, "life": _2, "lifeinsurance": _2, "lifestyle": _2, "lighting": _2, "like": _2, "lilly": _2, "limited": _2, "limo": _2, "lincoln": _2, "link": [1, { "myfritz": _3, "cyon": _3, "joinmc": _3, "dweb": _6, "inbrowser": _6, "keenetic": _3, "nftstorage": _62, "mypep": _3, "storacha": _62, "w3s": _62 }], "live": [1, { "aem": _3, "hlx": _3, "ewp": _6 }], "living": _2, "llc": _2, "llp": _2, "loan": _2, "loans": _2, "locker": _2, "locus": _2, "lol": [1, { "omg": _3 }], "london": _2, "lotte": _2, "lotto": _2, "love": _2, "lpl": _2, "lplfinancial": _2, "ltd": _2, "ltda": _2, "lundbeck": _2, "luxe": _2, "luxury": _2, "madrid": _2, "maif": _2, "maison": _2, "makeup": _2, "man": _2, "management": _2, "mango": _2, "map": _2, "market": _2, "marketing": _2, "markets": _2, "marriott": _2, "marshalls": _2, "mattel": _2, "mba": _2, "mckinsey": _2, "med": _2, "media": _63, "meet": _2, "melbourne": _2, "meme": _2, "memorial": _2, "men": _2, "menu": [1, { "barsy": _3, "barsyonline": _3 }], "merck": _2, "merckmsd": _2, "miami": _2, "microsoft": _2, "mini": _2, "mint": _2, "mit": _2, "mitsubishi": _2, "mlb": _2, "mls": _2, "mma": _2, "mobile": _2, "moda": _2, "moe": _2, "moi": _2, "mom": _2, "monash": _2, "money": _2, "monster": _2, "mormon": _2, "mortgage": _2, "moscow": _2, "moto": _2, "motorcycles": _2, "mov": _2, "movie": _2, "msd": _2, "mtn": _2, "mtr": _2, "music": _2, "nab": _2, "nagoya": _2, "navy": _2, "nba": _2, "nec": _2, "netbank": _2, "netflix": _2, "network": [1, { "aem": _3, "alces": _6, "appwrite": _3, "co": _3, "arvo": _3, "azimuth": _3, "tlon": _3 }], "neustar": _2, "new": _2, "news": [1, { "noticeable": _3 }], "next": _2, "nextdirect": _2, "nexus": _2, "nfl": _2, "ngo": _2, "nhk": _2, "nico": _2, "nike": _2, "nikon": _2, "ninja": _2, "nissan": _2, "nissay": _2, "nokia": _2, "norton": _2, "now": _2, "nowruz": _2, "nowtv": _2, "nra": _2, "nrw": _2, "ntt": _2, "nyc": _2, "obi": _2, "observer": _2, "office": _2, "okinawa": _2, "olayan": _2, "olayangroup": _2, "ollo": _2, "omega": _2, "one": [1, { "kin": _6, "service": _3, "website": _3 }], "ong": _2, "onl": _2, "online": [1, { "eero": _3, "eero-stage": _3, "websitebuilder": _3, "leapcell": _3, "barsy": _3 }], "ooo": _2, "open": _2, "oracle": _2, "orange": [1, { "tech": _3 }], "organic": _2, "origins": _2, "osaka": _2, "otsuka": _2, "ott": _2, "ovh": [1, { "nerdpol": _3 }], "page": [1, { "aem": _3, "hlx": _3, "codeberg": _3, "deuxfleurs": _3, "mybox": _3, "heyflow": _3, "prvcy": _3, "rocky": _3, "statichost": _3, "pdns": _3, "plesk": _3 }], "panasonic": _2, "paris": _2, "pars": _2, "partners": _2, "parts": _2, "party": _2, "pay": _2, "pccw": _2, "pet": _2, "pfizer": _2, "pharmacy": _2, "phd": _2, "philips": _2, "phone": _2, "photo": _2, "photography": _2, "photos": _63, "physio": _2, "pics": _2, "pictet": _2, "pictures": [1, { "1337": _3 }], "pid": _2, "pin": _2, "ping": _2, "pink": _2, "pioneer": _2, "pizza": [1, { "ngrok": _3 }], "place": _22, "play": _2, "playstation": _2, "plumbing": _2, "plus": [1, { "playit": [2, { "at": _6, "with": _3 }] }], "pnc": _2, "pohl": _2, "poker": _2, "politie": _2, "porn": _2, "praxi": _2, "press": _2, "prime": _2, "prod": _2, "productions": _2, "prof": _2, "progressive": _2, "promo": _2, "properties": _2, "property": _2, "protection": _2, "pru": _2, "prudential": _2, "pub": [1, { "id": _6, "kin": _6, "barsy": _3 }], "pwc": _2, "qpon": _2, "quebec": _2, "quest": _2, "racing": _2, "radio": _2, "read": _2, "realestate": _2, "realtor": _2, "realty": _2, "recipes": _2, "red": _2, "redumbrella": _2, "rehab": _2, "reise": _2, "reisen": _2, "reit": _2, "reliance": _2, "ren": _2, "rent": _2, "rentals": _2, "repair": _2, "report": _2, "republican": _2, "rest": _2, "restaurant": _2, "review": _2, "reviews": [1, { "aem": _3 }], "rexroth": _2, "rich": _2, "richardli": _2, "ricoh": _2, "ril": _2, "rio": _2, "rip": [1, { "clan": _3 }], "rocks": [1, { "myddns": _3, "stackit": _3, "lima-city": _3, "webspace": _3 }], "rodeo": _2, "rogers": _2, "room": _2, "rsvp": _2, "rugby": _2, "ruhr": _2, "run": [1, { "appwrite": _6, "canva": _3, "development": _3, "ravendb": _3, "liara": [2, { "iran": _3 }], "lovable": _3, "needle": _3, "build": _6, "code": _6, "database": _6, "migration": _6, "onporter": _3, "repl": _3, "stackit": _3, "val": _51, "vercel": _3, "wix": _3 }], "rwe": _2, "ryukyu": _2, "saarland": _2, "safe": _2, "safety": _2, "sakura": _2, "sale": _2, "salon": _2, "samsclub": _2, "samsung": _2, "sandvik": _2, "sandvikcoromant": _2, "sanofi": _2, "sap": _2, "sarl": _2, "sas": _2, "save": _2, "saxo": _2, "sbi": _2, "sbs": _2, "scb": _2, "schaeffler": _2, "schmidt": _2, "scholarships": _2, "school": _2, "schule": _2, "schwarz": _2, "science": _2, "scot": [1, { "co": _3, "me": _3, "org": _3, "gov": [2, { "service": _3 }] }], "search": _2, "seat": _2, "secure": _2, "security": _2, "seek": _2, "select": _2, "sener": _2, "services": [1, { "loginline": _3 }], "seven": _2, "sew": _2, "sex": _2, "sexy": _2, "sfr": _2, "shangrila": _2, "sharp": _2, "shell": _2, "shia": _2, "shiksha": _2, "shoes": _2, "shop": [1, { "base": _3, "hoplix": _3, "barsy": _3, "barsyonline": _3, "shopware": _3 }], "shopping": _2, "shouji": _2, "show": _55, "silk": _2, "sina": _2, "singles": _2, "site": [1, { "square": _3, "canva": _26, "cloudera": _6, "convex": _24, "cyon": _3, "caffeine": _3, "fastvps": _3, "figma": _3, "figma-gov": _3, "preview": _3, "heyflow": _3, "jele": _3, "jouwweb": _3, "loginline": _3, "barsy": _3, "co": _3, "notion": _3, "omniwe": _3, "opensocial": _3, "madethis": _3, "support": _3, "platformsh": _6, "tst": _6, "byen": _3, "sol": _3, "srht": _3, "novecore": _3, "cpanel": _3, "wpsquared": _3, "sourcecraft": _3 }], "ski": _2, "skin": _2, "sky": _2, "skype": _2, "sling": _2, "smart": _2, "smile": _2, "sncf": _2, "soccer": _2, "social": _2, "softbank": _2, "software": _2, "sohu": _2, "solar": _2, "solutions": _2, "song": _2, "sony": _2, "soy": _2, "spa": _2, "space": [1, { "myfast": _3, "heiyu": _3, "hf": [2, { "static": _3 }], "app-ionos": _3, "project": _3, "uber": _3, "xs4all": _3 }], "sport": _2, "spot": _2, "srl": _2, "stada": _2, "staples": _2, "star": _2, "statebank": _2, "statefarm": _2, "stc": _2, "stcgroup": _2, "stockholm": _2, "storage": _2, "store": [1, { "barsy": _3, "sellfy": _3, "shopware": _3, "storebase": _3 }], "stream": _2, "studio": _2, "study": _2, "style": _2, "sucks": _2, "supplies": _2, "supply": _2, "support": [1, { "barsy": _3 }], "surf": _2, "surgery": _2, "suzuki": _2, "swatch": _2, "swiss": _2, "sydney": _2, "systems": [1, { "knightpoint": _3, "miren": _3 }], "tab": _2, "taipei": _2, "talk": _2, "taobao": _2, "target": _2, "tatamotors": _2, "tatar": _2, "tattoo": _2, "tax": _2, "taxi": _2, "tci": _2, "tdk": _2, "team": [1, { "discourse": _3, "jelastic": _3 }], "tech": [1, { "cleverapps": _3 }], "technology": _22, "temasek": _2, "tennis": _2, "teva": _2, "thd": _2, "theater": _2, "theatre": _2, "tiaa": _2, "tickets": _2, "tienda": _2, "tips": _2, "tires": _2, "tirol": _2, "tjmaxx": _2, "tjx": _2, "tkmaxx": _2, "tmall": _2, "today": [1, { "prequalifyme": _3 }], "tokyo": _2, "tools": [1, { "addr": _50, "myaddr": _3 }], "top": [1, { "ntdll": _3, "wadl": _6 }], "toray": _2, "toshiba": _2, "total": _2, "tours": _2, "town": _2, "toyota": _2, "toys": _2, "trade": _2, "trading": _2, "training": _2, "travel": _2, "travelers": _2, "travelersinsurance": _2, "trust": _2, "trv": _2, "tube": _2, "tui": _2, "tunes": _2, "tushu": _2, "tvs": _2, "ubank": _2, "ubs": _2, "unicom": _2, "university": _2, "uno": _2, "uol": _2, "ups": _2, "vacations": _2, "vana": _2, "vanguard": _2, "vegas": _2, "ventures": _2, "verisign": _2, "versicherung": _2, "vet": _2, "viajes": _2, "video": _2, "vig": _2, "viking": _2, "villas": _2, "vin": _2, "vip": [1, { "hidns": _3 }], "virgin": _2, "visa": _2, "vision": _2, "viva": _2, "vivo": _2, "vlaanderen": _2, "vodka": _2, "volvo": _2, "vote": _2, "voting": _2, "voto": _2, "voyage": _2, "wales": _2, "walmart": _2, "walter": _2, "wang": _2, "wanggou": _2, "watch": _2, "watches": _2, "weather": _2, "weatherchannel": _2, "webcam": _2, "weber": _2, "website": _63, "wed": _2, "wedding": _2, "weibo": _2, "weir": _2, "whoswho": _2, "wien": _2, "wiki": _63, "williamhill": _2, "win": _2, "windows": _2, "wine": _2, "winners": _2, "wme": _2, "woodside": _2, "work": [1, { "imagine-proxy": _3 }], "works": _2, "world": _2, "wow": _2, "wtc": _2, "wtf": _2, "xbox": _2, "xerox": _2, "xihuan": _2, "xin": _2, "xn--11b4c3d": _2, "\u0915\u0949\u092E": _2, "xn--1ck2e1b": _2, "\u30BB\u30FC\u30EB": _2, "xn--1qqw23a": _2, "\u4F5B\u5C71": _2, "xn--30rr7y": _2, "\u6148\u5584": _2, "xn--3bst00m": _2, "\u96C6\u56E2": _2, "xn--3ds443g": _2, "\u5728\u7EBF": _2, "xn--3pxu8k": _2, "\u70B9\u770B": _2, "xn--42c2d9a": _2, "\u0E04\u0E2D\u0E21": _2, "xn--45q11c": _2, "\u516B\u5366": _2, "xn--4gbrim": _2, "\u0645\u0648\u0642\u0639": _2, "xn--55qw42g": _2, "\u516C\u76CA": _2, "xn--55qx5d": _2, "\u516C\u53F8": _2, "xn--5su34j936bgsg": _2, "\u9999\u683C\u91CC\u62C9": _2, "xn--5tzm5g": _2, "\u7F51\u7AD9": _2, "xn--6frz82g": _2, "\u79FB\u52A8": _2, "xn--6qq986b3xl": _2, "\u6211\u7231\u4F60": _2, "xn--80adxhks": _2, "\u043C\u043E\u0441\u043A\u0432\u0430": _2, "xn--80aqecdr1a": _2, "\u043A\u0430\u0442\u043E\u043B\u0438\u043A": _2, "xn--80asehdb": _2, "\u043E\u043D\u043B\u0430\u0439\u043D": _2, "xn--80aswg": _2, "\u0441\u0430\u0439\u0442": _2, "xn--8y0a063a": _2, "\u8054\u901A": _2, "xn--9dbq2a": _2, "\u05E7\u05D5\u05DD": _2, "xn--9et52u": _2, "\u65F6\u5C1A": _2, "xn--9krt00a": _2, "\u5FAE\u535A": _2, "xn--b4w605ferd": _2, "\u6DE1\u9A6C\u9521": _2, "xn--bck1b9a5dre4c": _2, "\u30D5\u30A1\u30C3\u30B7\u30E7\u30F3": _2, "xn--c1avg": _2, "\u043E\u0440\u0433": _2, "xn--c2br7g": _2, "\u0928\u0947\u091F": _2, "xn--cck2b3b": _2, "\u30B9\u30C8\u30A2": _2, "xn--cckwcxetd": _2, "\u30A2\u30DE\u30BE\u30F3": _2, "xn--cg4bki": _2, "\uC0BC\uC131": _2, "xn--czr694b": _2, "\u5546\u6807": _2, "xn--czrs0t": _2, "\u5546\u5E97": _2, "xn--czru2d": _2, "\u5546\u57CE": _2, "xn--d1acj3b": _2, "\u0434\u0435\u0442\u0438": _2, "xn--eckvdtc9d": _2, "\u30DD\u30A4\u30F3\u30C8": _2, "xn--efvy88h": _2, "\u65B0\u95FB": _2, "xn--fct429k": _2, "\u5BB6\u96FB": _2, "xn--fhbei": _2, "\u0643\u0648\u0645": _2, "xn--fiq228c5hs": _2, "\u4E2D\u6587\u7F51": _2, "xn--fiq64b": _2, "\u4E2D\u4FE1": _2, "xn--fjq720a": _2, "\u5A31\u4E50": _2, "xn--flw351e": _2, "\u8C37\u6B4C": _2, "xn--fzys8d69uvgm": _2, "\u96FB\u8A0A\u76C8\u79D1": _2, "xn--g2xx48c": _2, "\u8D2D\u7269": _2, "xn--gckr3f0f": _2, "\u30AF\u30E9\u30A6\u30C9": _2, "xn--gk3at1e": _2, "\u901A\u8CA9": _2, "xn--hxt814e": _2, "\u7F51\u5E97": _2, "xn--i1b6b1a6a2e": _2, "\u0938\u0902\u0917\u0920\u0928": _2, "xn--imr513n": _2, "\u9910\u5385": _2, "xn--io0a7i": _2, "\u7F51\u7EDC": _2, "xn--j1aef": _2, "\u043A\u043E\u043C": _2, "xn--jlq480n2rg": _2, "\u4E9A\u9A6C\u900A": _2, "xn--jvr189m": _2, "\u98DF\u54C1": _2, "xn--kcrx77d1x4a": _2, "\u98DE\u5229\u6D66": _2, "xn--kput3i": _2, "\u624B\u673A": _2, "xn--mgba3a3ejt": _2, "\u0627\u0631\u0627\u0645\u0643\u0648": _2, "xn--mgba7c0bbn0a": _2, "\u0627\u0644\u0639\u0644\u064A\u0627\u0646": _2, "xn--mgbab2bd": _2, "\u0628\u0627\u0632\u0627\u0631": _2, "xn--mgbca7dzdo": _2, "\u0627\u0628\u0648\u0638\u0628\u064A": _2, "xn--mgbi4ecexp": _2, "\u0643\u0627\u062B\u0648\u0644\u064A\u0643": _2, "xn--mgbt3dhd": _2, "\u0647\u0645\u0631\u0627\u0647": _2, "xn--mk1bu44c": _2, "\uB2F7\uCEF4": _2, "xn--mxtq1m": _2, "\u653F\u5E9C": _2, "xn--ngbc5azd": _2, "\u0634\u0628\u0643\u0629": _2, "xn--ngbe9e0a": _2, "\u0628\u064A\u062A\u0643": _2, "xn--ngbrx": _2, "\u0639\u0631\u0628": _2, "xn--nqv7f": _2, "\u673A\u6784": _2, "xn--nqv7fs00ema": _2, "\u7EC4\u7EC7\u673A\u6784": _2, "xn--nyqy26a": _2, "\u5065\u5EB7": _2, "xn--otu796d": _2, "\u62DB\u8058": _2, "xn--p1acf": [1, { "xn--90amc": _3, "xn--j1aef": _3, "xn--j1ael8b": _3, "xn--h1ahn": _3, "xn--j1adp": _3, "xn--c1avg": _3, "xn--80aaa0cvac": _3, "xn--h1aliz": _3, "xn--90a1af": _3, "xn--41a": _3 }], "\u0440\u0443\u0441": [1, { "\u0431\u0438\u0437": _3, "\u043A\u043E\u043C": _3, "\u043A\u0440\u044B\u043C": _3, "\u043C\u0438\u0440": _3, "\u043C\u0441\u043A": _3, "\u043E\u0440\u0433": _3, "\u0441\u0430\u043C\u0430\u0440\u0430": _3, "\u0441\u043E\u0447\u0438": _3, "\u0441\u043F\u0431": _3, "\u044F": _3 }], "xn--pssy2u": _2, "\u5927\u62FF": _2, "xn--q9jyb4c": _2, "\u307F\u3093\u306A": _2, "xn--qcka1pmc": _2, "\u30B0\u30FC\u30B0\u30EB": _2, "xn--rhqv96g": _2, "\u4E16\u754C": _2, "xn--rovu88b": _2, "\u66F8\u7C4D": _2, "xn--ses554g": _2, "\u7F51\u5740": _2, "xn--t60b56a": _2, "\uB2F7\uB137": _2, "xn--tckwe": _2, "\u30B3\u30E0": _2, "xn--tiq49xqyj": _2, "\u5929\u4E3B\u6559": _2, "xn--unup4y": _2, "\u6E38\u620F": _2, "xn--vermgensberater-ctb": _2, "verm\xF6gensberater": _2, "xn--vermgensberatung-pwb": _2, "verm\xF6gensberatung": _2, "xn--vhquv": _2, "\u4F01\u4E1A": _2, "xn--vuq861b": _2, "\u4FE1\u606F": _2, "xn--w4r85el8fhu5dnra": _2, "\u5609\u91CC\u5927\u9152\u5E97": _2, "xn--w4rs40l": _2, "\u5609\u91CC": _2, "xn--xhq521b": _2, "\u5E7F\u4E1C": _2, "xn--zfr164b": _2, "\u653F\u52A1": _2, "xyz": [1, { "caffeine": _3, "exe": _3, "botdash": _3, "telebit": _6 }], "yachts": _2, "yahoo": _2, "yamaxun": _2, "yandex": _2, "yodobashi": _2, "yoga": _2, "yokohama": _2, "you": _2, "youtube": _2, "yun": _2, "zappos": _2, "zara": _2, "zero": _2, "zip": _2, "zone": [1, { "stackit": _3, "lima": _3, "triton": _6 }], "zuerich": _2 }];
      return rules2;
    })();
    function lookupInTrie(parts, trie, index, allowedMask) {
      let result = null;
      let node = trie;
      while (node !== void 0) {
        if ((node[0] & allowedMask) !== 0) {
          result = {
            index: index + 1,
            isIcann: (node[0] & 1) !== 0,
            isPrivate: (node[0] & 2) !== 0
          };
        }
        if (index === -1) {
          break;
        }
        const succ = node[1];
        node = Object.prototype.hasOwnProperty.call(succ, parts[index]) ? succ[parts[index]] : succ["*"];
        index -= 1;
      }
      return result;
    }
    function suffixLookup(hostname, options, out) {
      var _a;
      if (fastPathLookup(hostname, options, out)) {
        return;
      }
      const hostnameParts = hostname.split(".");
      const allowedMask = (options.allowPrivateDomains ? 2 : 0) | (options.allowIcannDomains ? 1 : 0);
      const exceptionMatch = lookupInTrie(hostnameParts, exceptions, hostnameParts.length - 1, allowedMask);
      if (exceptionMatch !== null) {
        out.isIcann = exceptionMatch.isIcann;
        out.isPrivate = exceptionMatch.isPrivate;
        out.publicSuffix = hostnameParts.slice(exceptionMatch.index + 1).join(".");
        return;
      }
      const rulesMatch = lookupInTrie(hostnameParts, rules, hostnameParts.length - 1, allowedMask);
      if (rulesMatch !== null) {
        out.isIcann = rulesMatch.isIcann;
        out.isPrivate = rulesMatch.isPrivate;
        out.publicSuffix = hostnameParts.slice(rulesMatch.index).join(".");
        return;
      }
      out.isIcann = false;
      out.isPrivate = false;
      out.publicSuffix = (_a = hostnameParts[hostnameParts.length - 1]) !== null && _a !== void 0 ? _a : null;
    }
    var RESULT = getEmptyResult();
    function parse2(url, options = {}) {
      return parseImpl(url, 5, suffixLookup, options, getEmptyResult());
    }
    function getHostname(url, options = {}) {
      resetResult(RESULT);
      return parseImpl(url, 0, suffixLookup, options, RESULT).hostname;
    }
    function getPublicSuffix2(url, options = {}) {
      resetResult(RESULT);
      return parseImpl(url, 2, suffixLookup, options, RESULT).publicSuffix;
    }
    function getDomain2(url, options = {}) {
      resetResult(RESULT);
      return parseImpl(url, 3, suffixLookup, options, RESULT).domain;
    }
    function getSubdomain(url, options = {}) {
      resetResult(RESULT);
      return parseImpl(url, 4, suffixLookup, options, RESULT).subdomain;
    }
    function getDomainWithoutSuffix(url, options = {}) {
      resetResult(RESULT);
      return parseImpl(url, 5, suffixLookup, options, RESULT).domainWithoutSuffix;
    }
    exports2.getDomain = getDomain2;
    exports2.getDomainWithoutSuffix = getDomainWithoutSuffix;
    exports2.getHostname = getHostname;
    exports2.getPublicSuffix = getPublicSuffix2;
    exports2.getSubdomain = getSubdomain;
    exports2.parse = parse2;
  }
});

// node_modules/qrcode/lib/can-promise.js
var require_can_promise = __commonJS({
  "node_modules/qrcode/lib/can-promise.js"(exports2, module2) {
    module2.exports = function() {
      return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
    };
  }
});

// node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS({
  "node_modules/qrcode/lib/core/utils.js"(exports2) {
    var toSJISFunction;
    var CODEWORDS_COUNT = [
      0,
      // Not used
      26,
      44,
      70,
      100,
      134,
      172,
      196,
      242,
      292,
      346,
      404,
      466,
      532,
      581,
      655,
      733,
      815,
      901,
      991,
      1085,
      1156,
      1258,
      1364,
      1474,
      1588,
      1706,
      1828,
      1921,
      2051,
      2185,
      2323,
      2465,
      2611,
      2761,
      2876,
      3034,
      3196,
      3362,
      3532,
      3706
    ];
    exports2.getSymbolSize = function getSymbolSize(version2) {
      if (!version2) throw new Error('"version" cannot be null or undefined');
      if (version2 < 1 || version2 > 40) throw new Error('"version" should be in range from 1 to 40');
      return version2 * 4 + 17;
    };
    exports2.getSymbolTotalCodewords = function getSymbolTotalCodewords(version2) {
      return CODEWORDS_COUNT[version2];
    };
    exports2.getBCHDigit = function(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };
    exports2.setToSJISFunction = function setToSJISFunction(f) {
      if (typeof f !== "function") {
        throw new Error('"toSJISFunc" is not a valid function.');
      }
      toSJISFunction = f;
    };
    exports2.isKanjiModeEnabled = function() {
      return typeof toSJISFunction !== "undefined";
    };
    exports2.toSJIS = function toSJIS(kanji) {
      return toSJISFunction(kanji);
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-level.js"(exports2) {
    exports2.L = { bit: 1 };
    exports2.M = { bit: 0 };
    exports2.Q = { bit: 3 };
    exports2.H = { bit: 2 };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "l":
        case "low":
          return exports2.L;
        case "m":
        case "medium":
          return exports2.M;
        case "q":
        case "quartile":
          return exports2.Q;
        case "h":
        case "high":
          return exports2.H;
        default:
          throw new Error("Unknown EC Level: " + string);
      }
    }
    exports2.isValid = function isValid(level) {
      return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
    };
    exports2.from = function from(value, defaultValue) {
      if (exports2.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS({
  "node_modules/qrcode/lib/core/bit-buffer.js"(exports2, module2) {
    function BitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    BitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
      },
      put: function(num, length) {
        for (let i2 = 0; i2 < length; i2++) {
          this.putBit((num >>> length - i2 - 1 & 1) === 1);
        }
      },
      getLengthInBits: function() {
        return this.length;
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= 128 >>> this.length % 8;
        }
        this.length++;
      }
    };
    module2.exports = BitBuffer;
  }
});

// node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS({
  "node_modules/qrcode/lib/core/bit-matrix.js"(exports2, module2) {
    function BitMatrix(size) {
      if (!size || size < 1) {
        throw new Error("BitMatrix size must be defined and greater than 0");
      }
      this.size = size;
      this.data = new Uint8Array(size * size);
      this.reservedBit = new Uint8Array(size * size);
    }
    BitMatrix.prototype.set = function(row, col, value, reserved) {
      const index = row * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };
    BitMatrix.prototype.get = function(row, col) {
      return this.data[row * this.size + col];
    };
    BitMatrix.prototype.xor = function(row, col, value) {
      this.data[row * this.size + col] ^= value;
    };
    BitMatrix.prototype.isReserved = function(row, col) {
      return this.reservedBit[row * this.size + col];
    };
    module2.exports = BitMatrix;
  }
});

// node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS({
  "node_modules/qrcode/lib/core/alignment-pattern.js"(exports2) {
    var getSymbolSize = require_utils().getSymbolSize;
    exports2.getRowColCoords = function getRowColCoords(version2) {
      if (version2 === 1) return [];
      const posCount = Math.floor(version2 / 7) + 2;
      const size = getSymbolSize(version2);
      const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
      const positions = [size - 7];
      for (let i2 = 1; i2 < posCount - 1; i2++) {
        positions[i2] = positions[i2 - 1] - intervals;
      }
      positions.push(6);
      return positions.reverse();
    };
    exports2.getPositions = function getPositions(version2) {
      const coords = [];
      const pos = exports2.getRowColCoords(version2);
      const posLength = pos.length;
      for (let i2 = 0; i2 < posLength; i2++) {
        for (let j = 0; j < posLength; j++) {
          if (i2 === 0 && j === 0 || // top-left
          i2 === 0 && j === posLength - 1 || // bottom-left
          i2 === posLength - 1 && j === 0) {
            continue;
          }
          coords.push([pos[i2], pos[j]]);
        }
      }
      return coords;
    };
  }
});

// node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS({
  "node_modules/qrcode/lib/core/finder-pattern.js"(exports2) {
    var getSymbolSize = require_utils().getSymbolSize;
    var FINDER_PATTERN_SIZE = 7;
    exports2.getPositions = function getPositions(version2) {
      const size = getSymbolSize(version2);
      return [
        // top-left
        [0, 0],
        // top-right
        [size - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size - FINDER_PATTERN_SIZE]
      ];
    };
  }
});

// node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS({
  "node_modules/qrcode/lib/core/mask-pattern.js"(exports2) {
    exports2.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    var PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    exports2.isValid = function isValid(mask) {
      return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
    };
    exports2.from = function from(value) {
      return exports2.isValid(value) ? parseInt(value, 10) : void 0;
    };
    exports2.getPenaltyN1 = function getPenaltyN1(data) {
      const size = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;
      for (let row = 0; row < size; row++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;
        for (let col = 0; col < size; col++) {
          let module3 = data.get(row, col);
          if (module3 === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module3;
            sameCountCol = 1;
          }
          module3 = data.get(col, row);
          if (module3 === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module3;
            sameCountRow = 1;
          }
        }
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }
      return points;
    };
    exports2.getPenaltyN2 = function getPenaltyN2(data) {
      const size = data.size;
      let points = 0;
      for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size - 1; col++) {
          const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
          if (last === 4 || last === 0) points++;
        }
      }
      return points * PenaltyScores.N2;
    };
    exports2.getPenaltyN3 = function getPenaltyN3(data) {
      const size = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;
      for (let row = 0; row < size; row++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size; col++) {
          bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
          if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
          bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
          if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
        }
      }
      return points * PenaltyScores.N3;
    };
    exports2.getPenaltyN4 = function getPenaltyN4(data) {
      let darkCount = 0;
      const modulesCount = data.data.length;
      for (let i2 = 0; i2 < modulesCount; i2++) darkCount += data.data[i2];
      const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
      return k * PenaltyScores.N4;
    };
    function getMaskAt(maskPattern, i2, j) {
      switch (maskPattern) {
        case exports2.Patterns.PATTERN000:
          return (i2 + j) % 2 === 0;
        case exports2.Patterns.PATTERN001:
          return i2 % 2 === 0;
        case exports2.Patterns.PATTERN010:
          return j % 3 === 0;
        case exports2.Patterns.PATTERN011:
          return (i2 + j) % 3 === 0;
        case exports2.Patterns.PATTERN100:
          return (Math.floor(i2 / 2) + Math.floor(j / 3)) % 2 === 0;
        case exports2.Patterns.PATTERN101:
          return i2 * j % 2 + i2 * j % 3 === 0;
        case exports2.Patterns.PATTERN110:
          return (i2 * j % 2 + i2 * j % 3) % 2 === 0;
        case exports2.Patterns.PATTERN111:
          return (i2 * j % 3 + (i2 + j) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    }
    exports2.applyMask = function applyMask(pattern, data) {
      const size = data.size;
      for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) {
          if (data.isReserved(row, col)) continue;
          data.xor(row, col, getMaskAt(pattern, row, col));
        }
      }
    };
    exports2.getBestMask = function getBestMask(data, setupFormatFunc) {
      const numPatterns = Object.keys(exports2.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;
      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports2.applyMask(p, data);
        const penalty = exports2.getPenaltyN1(data) + exports2.getPenaltyN2(data) + exports2.getPenaltyN3(data) + exports2.getPenaltyN4(data);
        exports2.applyMask(p, data);
        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }
      return bestPattern;
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-code.js"(exports2) {
    var ECLevel = require_error_correction_level();
    var EC_BLOCKS_TABLE = [
      // L  M  Q  H
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      4,
      1,
      2,
      4,
      4,
      2,
      4,
      4,
      4,
      2,
      4,
      6,
      5,
      2,
      4,
      6,
      6,
      2,
      5,
      8,
      8,
      4,
      5,
      8,
      8,
      4,
      5,
      8,
      11,
      4,
      8,
      10,
      11,
      4,
      9,
      12,
      16,
      4,
      9,
      16,
      16,
      6,
      10,
      12,
      18,
      6,
      10,
      17,
      16,
      6,
      11,
      16,
      19,
      6,
      13,
      18,
      21,
      7,
      14,
      21,
      25,
      8,
      16,
      20,
      25,
      8,
      17,
      23,
      25,
      9,
      17,
      23,
      34,
      9,
      18,
      25,
      30,
      10,
      20,
      27,
      32,
      12,
      21,
      29,
      35,
      12,
      23,
      34,
      37,
      12,
      25,
      34,
      40,
      13,
      26,
      35,
      42,
      14,
      28,
      38,
      45,
      15,
      29,
      40,
      48,
      16,
      31,
      43,
      51,
      17,
      33,
      45,
      54,
      18,
      35,
      48,
      57,
      19,
      37,
      51,
      60,
      19,
      38,
      53,
      63,
      20,
      40,
      56,
      66,
      21,
      43,
      59,
      70,
      22,
      45,
      62,
      74,
      24,
      47,
      65,
      77,
      25,
      49,
      68,
      81
    ];
    var EC_CODEWORDS_TABLE = [
      // L  M  Q  H
      7,
      10,
      13,
      17,
      10,
      16,
      22,
      28,
      15,
      26,
      36,
      44,
      20,
      36,
      52,
      64,
      26,
      48,
      72,
      88,
      36,
      64,
      96,
      112,
      40,
      72,
      108,
      130,
      48,
      88,
      132,
      156,
      60,
      110,
      160,
      192,
      72,
      130,
      192,
      224,
      80,
      150,
      224,
      264,
      96,
      176,
      260,
      308,
      104,
      198,
      288,
      352,
      120,
      216,
      320,
      384,
      132,
      240,
      360,
      432,
      144,
      280,
      408,
      480,
      168,
      308,
      448,
      532,
      180,
      338,
      504,
      588,
      196,
      364,
      546,
      650,
      224,
      416,
      600,
      700,
      224,
      442,
      644,
      750,
      252,
      476,
      690,
      816,
      270,
      504,
      750,
      900,
      300,
      560,
      810,
      960,
      312,
      588,
      870,
      1050,
      336,
      644,
      952,
      1110,
      360,
      700,
      1020,
      1200,
      390,
      728,
      1050,
      1260,
      420,
      784,
      1140,
      1350,
      450,
      812,
      1200,
      1440,
      480,
      868,
      1290,
      1530,
      510,
      924,
      1350,
      1620,
      540,
      980,
      1440,
      1710,
      570,
      1036,
      1530,
      1800,
      570,
      1064,
      1590,
      1890,
      600,
      1120,
      1680,
      1980,
      630,
      1204,
      1770,
      2100,
      660,
      1260,
      1860,
      2220,
      720,
      1316,
      1950,
      2310,
      750,
      1372,
      2040,
      2430
    ];
    exports2.getBlocksCount = function getBlocksCount(version2, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 0];
        case ECLevel.M:
          return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 2];
        case ECLevel.H:
          return EC_BLOCKS_TABLE[(version2 - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    exports2.getTotalCodewordsCount = function getTotalCodewordsCount(version2, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 0];
        case ECLevel.M:
          return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 2];
        case ECLevel.H:
          return EC_CODEWORDS_TABLE[(version2 - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
  }
});

// node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS({
  "node_modules/qrcode/lib/core/galois-field.js"(exports2) {
    var EXP_TABLE = new Uint8Array(512);
    var LOG_TABLE = new Uint8Array(256);
    (function initTables() {
      let x = 1;
      for (let i2 = 0; i2 < 255; i2++) {
        EXP_TABLE[i2] = x;
        LOG_TABLE[x] = i2;
        x <<= 1;
        if (x & 256) {
          x ^= 285;
        }
      }
      for (let i2 = 255; i2 < 512; i2++) {
        EXP_TABLE[i2] = EXP_TABLE[i2 - 255];
      }
    })();
    exports2.log = function log(n2) {
      if (n2 < 1) throw new Error("log(" + n2 + ")");
      return LOG_TABLE[n2];
    };
    exports2.exp = function exp(n2) {
      return EXP_TABLE[n2];
    };
    exports2.mul = function mul(x, y) {
      if (x === 0 || y === 0) return 0;
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
    };
  }
});

// node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS({
  "node_modules/qrcode/lib/core/polynomial.js"(exports2) {
    var GF = require_galois_field();
    exports2.mul = function mul(p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);
      for (let i2 = 0; i2 < p1.length; i2++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i2 + j] ^= GF.mul(p1[i2], p2[j]);
        }
      }
      return coeff;
    };
    exports2.mod = function mod(divident, divisor) {
      let result = new Uint8Array(divident);
      while (result.length - divisor.length >= 0) {
        const coeff = result[0];
        for (let i2 = 0; i2 < divisor.length; i2++) {
          result[i2] ^= GF.mul(divisor[i2], coeff);
        }
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }
      return result;
    };
    exports2.generateECPolynomial = function generateECPolynomial(degree) {
      let poly = new Uint8Array([1]);
      for (let i2 = 0; i2 < degree; i2++) {
        poly = exports2.mul(poly, new Uint8Array([1, GF.exp(i2)]));
      }
      return poly;
    };
  }
});

// node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS({
  "node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports2, module2) {
    var Polynomial = require_polynomial();
    function ReedSolomonEncoder(degree) {
      this.genPoly = void 0;
      this.degree = degree;
      if (this.degree) this.initialize(this.degree);
    }
    ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
      this.degree = degree;
      this.genPoly = Polynomial.generateECPolynomial(this.degree);
    };
    ReedSolomonEncoder.prototype.encode = function encode(data) {
      if (!this.genPoly) {
        throw new Error("Encoder not initialized");
      }
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);
      const remainder = Polynomial.mod(paddedData, this.genPoly);
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);
        return buff;
      }
      return remainder;
    };
    module2.exports = ReedSolomonEncoder;
  }
});

// node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS({
  "node_modules/qrcode/lib/core/version-check.js"(exports2) {
    exports2.isValid = function isValid(version2) {
      return !isNaN(version2) && version2 >= 1 && version2 <= 40;
    };
  }
});

// node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS({
  "node_modules/qrcode/lib/core/regex.js"(exports2) {
    var numeric = "[0-9]+";
    var alphanumeric = "[A-Z $%*+\\-./:]+";
    var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
    kanji = kanji.replace(/u/g, "\\u");
    var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
    exports2.KANJI = new RegExp(kanji, "g");
    exports2.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
    exports2.BYTE = new RegExp(byte, "g");
    exports2.NUMERIC = new RegExp(numeric, "g");
    exports2.ALPHANUMERIC = new RegExp(alphanumeric, "g");
    var TEST_KANJI = new RegExp("^" + kanji + "$");
    var TEST_NUMERIC = new RegExp("^" + numeric + "$");
    var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
    exports2.testKanji = function testKanji(str) {
      return TEST_KANJI.test(str);
    };
    exports2.testNumeric = function testNumeric(str) {
      return TEST_NUMERIC.test(str);
    };
    exports2.testAlphanumeric = function testAlphanumeric(str) {
      return TEST_ALPHANUMERIC.test(str);
    };
  }
});

// node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS({
  "node_modules/qrcode/lib/core/mode.js"(exports2) {
    var VersionCheck = require_version_check();
    var Regex = require_regex();
    exports2.NUMERIC = {
      id: "Numeric",
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };
    exports2.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };
    exports2.BYTE = {
      id: "Byte",
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };
    exports2.KANJI = {
      id: "Kanji",
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };
    exports2.MIXED = {
      bit: -1
    };
    exports2.getCharCountIndicator = function getCharCountIndicator(mode, version2) {
      if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
      if (!VersionCheck.isValid(version2)) {
        throw new Error("Invalid version: " + version2);
      }
      if (version2 >= 1 && version2 < 10) return mode.ccBits[0];
      else if (version2 < 27) return mode.ccBits[1];
      return mode.ccBits[2];
    };
    exports2.getBestModeForData = function getBestModeForData(dataStr) {
      if (Regex.testNumeric(dataStr)) return exports2.NUMERIC;
      else if (Regex.testAlphanumeric(dataStr)) return exports2.ALPHANUMERIC;
      else if (Regex.testKanji(dataStr)) return exports2.KANJI;
      else return exports2.BYTE;
    };
    exports2.toString = function toString2(mode) {
      if (mode && mode.id) return mode.id;
      throw new Error("Invalid mode");
    };
    exports2.isValid = function isValid(mode) {
      return mode && mode.bit && mode.ccBits;
    };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "numeric":
          return exports2.NUMERIC;
        case "alphanumeric":
          return exports2.ALPHANUMERIC;
        case "kanji":
          return exports2.KANJI;
        case "byte":
          return exports2.BYTE;
        default:
          throw new Error("Unknown mode: " + string);
      }
    }
    exports2.from = function from(value, defaultValue) {
      if (exports2.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/version.js
var require_version = __commonJS({
  "node_modules/qrcode/lib/core/version.js"(exports2) {
    var Utils = require_utils();
    var ECCode = require_error_correction_code();
    var ECLevel = require_error_correction_level();
    var Mode = require_mode();
    var VersionCheck = require_version_check();
    var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    var G18_BCH = Utils.getBCHDigit(G18);
    function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports2.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    function getReservedBitsCount(mode, version2) {
      return Mode.getCharCountIndicator(mode, version2) + 4;
    }
    function getTotalBitsFromDataArray(segments, version2) {
      let totalBits = 0;
      segments.forEach(function(data) {
        const reservedBits = getReservedBitsCount(data.mode, version2);
        totalBits += reservedBits + data.getBitsLength();
      });
      return totalBits;
    }
    function getBestVersionForMixedData(segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports2.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    exports2.from = function from(value, defaultValue) {
      if (VersionCheck.isValid(value)) {
        return parseInt(value, 10);
      }
      return defaultValue;
    };
    exports2.getCapacity = function getCapacity(version2, errorCorrectionLevel, mode) {
      if (!VersionCheck.isValid(version2)) {
        throw new Error("Invalid QR Code version");
      }
      if (typeof mode === "undefined") mode = Mode.BYTE;
      const totalCodewords = Utils.getSymbolTotalCodewords(version2);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version2, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (mode === Mode.MIXED) return dataTotalCodewordsBits;
      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version2);
      switch (mode) {
        case Mode.NUMERIC:
          return Math.floor(usableBits / 10 * 3);
        case Mode.ALPHANUMERIC:
          return Math.floor(usableBits / 11 * 2);
        case Mode.KANJI:
          return Math.floor(usableBits / 13);
        case Mode.BYTE:
        default:
          return Math.floor(usableBits / 8);
      }
    };
    exports2.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
      let seg;
      const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl);
        }
        if (data.length === 0) {
          return 1;
        }
        seg = data[0];
      } else {
        seg = data;
      }
      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
    };
    exports2.getEncodedBits = function getEncodedBits(version2) {
      if (!VersionCheck.isValid(version2) || version2 < 7) {
        throw new Error("Invalid QR Code version");
      }
      let d = version2 << 12;
      while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
      }
      return version2 << 12 | d;
    };
  }
});

// node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS({
  "node_modules/qrcode/lib/core/format-info.js"(exports2) {
    var Utils = require_utils();
    var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    var G15_BCH = Utils.getBCHDigit(G15);
    exports2.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
      const data = errorCorrectionLevel.bit << 3 | mask;
      let d = data << 10;
      while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
      }
      return (data << 10 | d) ^ G15_MASK;
    };
  }
});

// node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS({
  "node_modules/qrcode/lib/core/numeric-data.js"(exports2, module2) {
    var Mode = require_mode();
    function NumericData(data) {
      this.mode = Mode.NUMERIC;
      this.data = data.toString();
    }
    NumericData.getBitsLength = function getBitsLength(length) {
      return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
    };
    NumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    NumericData.prototype.getBitsLength = function getBitsLength() {
      return NumericData.getBitsLength(this.data.length);
    };
    NumericData.prototype.write = function write(bitBuffer) {
      let i2, group, value;
      for (i2 = 0; i2 + 3 <= this.data.length; i2 += 3) {
        group = this.data.substr(i2, 3);
        value = parseInt(group, 10);
        bitBuffer.put(value, 10);
      }
      const remainingNum = this.data.length - i2;
      if (remainingNum > 0) {
        group = this.data.substr(i2);
        value = parseInt(group, 10);
        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };
    module2.exports = NumericData;
  }
});

// node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS({
  "node_modules/qrcode/lib/core/alphanumeric-data.js"(exports2, module2) {
    var Mode = require_mode();
    var ALPHA_NUM_CHARS = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":"
    ];
    function AlphanumericData(data) {
      this.mode = Mode.ALPHANUMERIC;
      this.data = data;
    }
    AlphanumericData.getBitsLength = function getBitsLength(length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2);
    };
    AlphanumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    AlphanumericData.prototype.getBitsLength = function getBitsLength() {
      return AlphanumericData.getBitsLength(this.data.length);
    };
    AlphanumericData.prototype.write = function write(bitBuffer) {
      let i2;
      for (i2 = 0; i2 + 2 <= this.data.length; i2 += 2) {
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i2]) * 45;
        value += ALPHA_NUM_CHARS.indexOf(this.data[i2 + 1]);
        bitBuffer.put(value, 11);
      }
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i2]), 6);
      }
    };
    module2.exports = AlphanumericData;
  }
});

// node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS({
  "node_modules/qrcode/lib/core/byte-data.js"(exports2, module2) {
    var Mode = require_mode();
    function ByteData(data) {
      this.mode = Mode.BYTE;
      if (typeof data === "string") {
        this.data = new TextEncoder().encode(data);
      } else {
        this.data = new Uint8Array(data);
      }
    }
    ByteData.getBitsLength = function getBitsLength(length) {
      return length * 8;
    };
    ByteData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    ByteData.prototype.getBitsLength = function getBitsLength() {
      return ByteData.getBitsLength(this.data.length);
    };
    ByteData.prototype.write = function(bitBuffer) {
      for (let i2 = 0, l = this.data.length; i2 < l; i2++) {
        bitBuffer.put(this.data[i2], 8);
      }
    };
    module2.exports = ByteData;
  }
});

// node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS({
  "node_modules/qrcode/lib/core/kanji-data.js"(exports2, module2) {
    var Mode = require_mode();
    var Utils = require_utils();
    function KanjiData(data) {
      this.mode = Mode.KANJI;
      this.data = data;
    }
    KanjiData.getBitsLength = function getBitsLength(length) {
      return length * 13;
    };
    KanjiData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    KanjiData.prototype.getBitsLength = function getBitsLength() {
      return KanjiData.getBitsLength(this.data.length);
    };
    KanjiData.prototype.write = function(bitBuffer) {
      let i2;
      for (i2 = 0; i2 < this.data.length; i2++) {
        let value = Utils.toSJIS(this.data[i2]);
        if (value >= 33088 && value <= 40956) {
          value -= 33088;
        } else if (value >= 57408 && value <= 60351) {
          value -= 49472;
        } else {
          throw new Error(
            "Invalid SJIS character: " + this.data[i2] + "\nMake sure your charset is UTF-8"
          );
        }
        value = (value >>> 8 & 255) * 192 + (value & 255);
        bitBuffer.put(value, 13);
      }
    };
    module2.exports = KanjiData;
  }
});

// node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS({
  "node_modules/dijkstrajs/dijkstra.js"(exports2, module2) {
    "use strict";
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        var predecessors = {};
        var costs = {};
        costs[s] = 0;
        var open = dijkstra.PriorityQueue.make();
        open.push(s, 0);
        var closest, u2, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
        while (!open.empty()) {
          closest = open.pop();
          u2 = closest.value;
          cost_of_s_to_u = closest.cost;
          adjacent_nodes = graph[u2] || {};
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              cost_of_e = adjacent_nodes[v];
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
              cost_of_s_to_v = costs[v];
              first_visit = typeof costs[v] === "undefined";
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u2;
              }
            }
          }
        }
        if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
          var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
          throw new Error(msg);
        }
        return predecessors;
      },
      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u2 = d;
        var predecessor;
        while (u2) {
          nodes.push(u2);
          predecessor = predecessors[u2];
          u2 = predecessors[u2];
        }
        nodes.reverse();
        return nodes;
      },
      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors,
          d
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(opts) {
          var T = dijkstra.PriorityQueue, t = {}, key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },
        default_sorter: function(a2, b) {
          return a2.cost - b.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(value, cost) {
          var item = { value, cost };
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    if (typeof module2 !== "undefined") {
      module2.exports = dijkstra;
    }
  }
});

// node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS({
  "node_modules/qrcode/lib/core/segments.js"(exports2) {
    var Mode = require_mode();
    var NumericData = require_numeric_data();
    var AlphanumericData = require_alphanumeric_data();
    var ByteData = require_byte_data();
    var KanjiData = require_kanji_data();
    var Regex = require_regex();
    var Utils = require_utils();
    var dijkstra = require_dijkstra();
    function getStringByteLength(str) {
      return unescape(encodeURIComponent(str)).length;
    }
    function getSegments(regex, mode, str) {
      const segments = [];
      let result;
      while ((result = regex.exec(str)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode,
          length: result[0].length
        });
      }
      return segments;
    }
    function getSegmentsFromString(dataStr) {
      const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;
      if (Utils.isKanjiModeEnabled()) {
        byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
        kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
        kanjiSegs = [];
      }
      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
      return segs.sort(function(s1, s2) {
        return s1.index - s2.index;
      }).map(function(obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length
        };
      });
    }
    function getSegmentBitsLength(length, mode) {
      switch (mode) {
        case Mode.NUMERIC:
          return NumericData.getBitsLength(length);
        case Mode.ALPHANUMERIC:
          return AlphanumericData.getBitsLength(length);
        case Mode.KANJI:
          return KanjiData.getBitsLength(length);
        case Mode.BYTE:
          return ByteData.getBitsLength(length);
      }
    }
    function mergeSegments(segs) {
      return segs.reduce(function(acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc;
        }
        acc.push(curr);
        return acc;
      }, []);
    }
    function buildNodes(segs) {
      const nodes = [];
      for (let i2 = 0; i2 < segs.length; i2++) {
        const seg = segs[i2];
        switch (seg.mode) {
          case Mode.NUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.ALPHANUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.KANJI:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break;
          case Mode.BYTE:
            nodes.push([
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }
      return nodes;
    }
    function buildGraph(nodes, version2) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ["start"];
      for (let i2 = 0; i2 < nodes.length; i2++) {
        const nodeGroup = nodes[i2];
        const currentNodeIds = [];
        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = "" + i2 + j;
          currentNodeIds.push(key);
          table[key] = { node, lastCount: 0 };
          graph[key] = {};
          for (let n2 = 0; n2 < prevNodeIds.length; n2++) {
            const prevNodeId = prevNodeIds[n2];
            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version2);
            }
          }
        }
        prevNodeIds = currentNodeIds;
      }
      for (let n2 = 0; n2 < prevNodeIds.length; n2++) {
        graph[prevNodeIds[n2]].end = 0;
      }
      return { map: graph, table };
    }
    function buildSingleSegment(data, modesHint) {
      let mode;
      const bestMode = Mode.getBestModeForData(data);
      mode = Mode.from(modesHint, bestMode);
      if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
        throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
      }
      if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
        mode = Mode.BYTE;
      }
      switch (mode) {
        case Mode.NUMERIC:
          return new NumericData(data);
        case Mode.ALPHANUMERIC:
          return new AlphanumericData(data);
        case Mode.KANJI:
          return new KanjiData(data);
        case Mode.BYTE:
          return new ByteData(data);
      }
    }
    exports2.fromArray = function fromArray(array) {
      return array.reduce(function(acc, seg) {
        if (typeof seg === "string") {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }
        return acc;
      }, []);
    };
    exports2.fromString = function fromString(data, version2) {
      const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version2);
      const path = dijkstra.find_path(graph.map, "start", "end");
      const optimizedSegs = [];
      for (let i2 = 1; i2 < path.length - 1; i2++) {
        optimizedSegs.push(graph.table[path[i2]].node);
      }
      return exports2.fromArray(mergeSegments(optimizedSegs));
    };
    exports2.rawSplit = function rawSplit(data) {
      return exports2.fromArray(
        getSegmentsFromString(data, Utils.isKanjiModeEnabled())
      );
    };
  }
});

// node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS({
  "node_modules/qrcode/lib/core/qrcode.js"(exports2) {
    var Utils = require_utils();
    var ECLevel = require_error_correction_level();
    var BitBuffer = require_bit_buffer();
    var BitMatrix = require_bit_matrix();
    var AlignmentPattern = require_alignment_pattern();
    var FinderPattern = require_finder_pattern();
    var MaskPattern = require_mask_pattern();
    var ECCode = require_error_correction_code();
    var ReedSolomonEncoder = require_reed_solomon_encoder();
    var Version = require_version();
    var FormatInfo = require_format_info();
    var Mode = require_mode();
    var Segments = require_segments();
    function setupFinderPattern(matrix, version2) {
      const size = matrix.size;
      const pos = FinderPattern.getPositions(version2);
      for (let i2 = 0; i2 < pos.length; i2++) {
        const row = pos[i2][0];
        const col = pos[i2][1];
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || size <= row + r) continue;
          for (let c3 = -1; c3 <= 7; c3++) {
            if (col + c3 <= -1 || size <= col + c3) continue;
            if (r >= 0 && r <= 6 && (c3 === 0 || c3 === 6) || c3 >= 0 && c3 <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c3 >= 2 && c3 <= 4) {
              matrix.set(row + r, col + c3, true, true);
            } else {
              matrix.set(row + r, col + c3, false, true);
            }
          }
        }
      }
    }
    function setupTimingPattern(matrix) {
      const size = matrix.size;
      for (let r = 8; r < size - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }
    function setupAlignmentPattern(matrix, version2) {
      const pos = AlignmentPattern.getPositions(version2);
      for (let i2 = 0; i2 < pos.length; i2++) {
        const row = pos[i2][0];
        const col = pos[i2][1];
        for (let r = -2; r <= 2; r++) {
          for (let c3 = -2; c3 <= 2; c3++) {
            if (r === -2 || r === 2 || c3 === -2 || c3 === 2 || r === 0 && c3 === 0) {
              matrix.set(row + r, col + c3, true, true);
            } else {
              matrix.set(row + r, col + c3, false, true);
            }
          }
        }
      }
    }
    function setupVersionInfo(matrix, version2) {
      const size = matrix.size;
      const bits = Version.getEncodedBits(version2);
      let row, col, mod;
      for (let i2 = 0; i2 < 18; i2++) {
        row = Math.floor(i2 / 3);
        col = i2 % 3 + size - 8 - 3;
        mod = (bits >> i2 & 1) === 1;
        matrix.set(row, col, mod, true);
        matrix.set(col, row, mod, true);
      }
    }
    function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
      const size = matrix.size;
      const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i2, mod;
      for (i2 = 0; i2 < 15; i2++) {
        mod = (bits >> i2 & 1) === 1;
        if (i2 < 6) {
          matrix.set(i2, 8, mod, true);
        } else if (i2 < 8) {
          matrix.set(i2 + 1, 8, mod, true);
        } else {
          matrix.set(size - 15 + i2, 8, mod, true);
        }
        if (i2 < 8) {
          matrix.set(8, size - i2 - 1, mod, true);
        } else if (i2 < 9) {
          matrix.set(8, 15 - i2 - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i2 - 1, mod, true);
        }
      }
      matrix.set(size - 8, 8, 1, true);
    }
    function setupData(matrix, data) {
      const size = matrix.size;
      let inc = -1;
      let row = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c3 = 0; c3 < 2; c3++) {
            if (!matrix.isReserved(row, col - c3)) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) === 1;
              }
              matrix.set(row, col - c3, dark);
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || size <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
    function createData(version2, errorCorrectionLevel, segments) {
      const buffer = new BitBuffer();
      segments.forEach(function(data) {
        buffer.put(data.mode.bit, 4);
        buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version2));
        data.write(buffer);
      });
      const totalCodewords = Utils.getSymbolTotalCodewords(version2);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version2, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i2 = 0; i2 < remainingByte; i2++) {
        buffer.put(i2 % 2 ? 17 : 236, 8);
      }
      return createCodewords(buffer, version2, errorCorrectionLevel);
    }
    function createCodewords(bitBuffer, version2, errorCorrectionLevel) {
      const totalCodewords = Utils.getSymbolTotalCodewords(version2);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version2, errorCorrectionLevel);
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;
      const ecTotalBlocks = ECCode.getBlocksCount(version2, errorCorrectionLevel);
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
      const rs = new ReedSolomonEncoder(ecCount);
      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
        dcData[b] = buffer.slice(offset, offset + dataSize);
        ecData[b] = rs.encode(dcData[b]);
        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i2, r;
      for (i2 = 0; i2 < maxDataSize; i2++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i2 < dcData[r].length) {
            data[index++] = dcData[r][i2];
          }
        }
      }
      for (i2 = 0; i2 < ecCount; i2++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i2];
        }
      }
      return data;
    }
    function createSymbol(data, version2, errorCorrectionLevel, maskPattern) {
      let segments;
      if (Array.isArray(data)) {
        segments = Segments.fromArray(data);
      } else if (typeof data === "string") {
        let estimatedVersion = version2;
        if (!estimatedVersion) {
          const rawSegments = Segments.rawSplit(data);
          estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }
        segments = Segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error("Invalid data");
      }
      const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
      if (!bestVersion) {
        throw new Error("The amount of data is too big to be stored in a QR Code");
      }
      if (!version2) {
        version2 = bestVersion;
      } else if (version2 < bestVersion) {
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
        );
      }
      const dataBits = createData(version2, errorCorrectionLevel, segments);
      const moduleCount = Utils.getSymbolSize(version2);
      const modules = new BitMatrix(moduleCount);
      setupFinderPattern(modules, version2);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version2);
      setupFormatInfo(modules, errorCorrectionLevel, 0);
      if (version2 >= 7) {
        setupVersionInfo(modules, version2);
      }
      setupData(modules, dataBits);
      if (isNaN(maskPattern)) {
        maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        );
      }
      MaskPattern.applyMask(maskPattern, modules);
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
      return {
        modules,
        version: version2,
        errorCorrectionLevel,
        maskPattern,
        segments
      };
    }
    exports2.create = function create2(data, options) {
      if (typeof data === "undefined" || data === "") {
        throw new Error("No input text");
      }
      let errorCorrectionLevel = ECLevel.M;
      let version2;
      let mask;
      if (typeof options !== "undefined") {
        errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
        version2 = Version.from(options.version);
        mask = MaskPattern.from(options.maskPattern);
        if (options.toSJISFunc) {
          Utils.setToSJISFunction(options.toSJISFunc);
        }
      }
      return createSymbol(data, version2, errorCorrectionLevel, mask);
    };
  }
});

// node_modules/pngjs/lib/chunkstream.js
var require_chunkstream = __commonJS({
  "node_modules/pngjs/lib/chunkstream.js"(exports2, module2) {
    "use strict";
    var util = require("util");
    var Stream = require("stream");
    var ChunkStream = module2.exports = function() {
      Stream.call(this);
      this._buffers = [];
      this._buffered = 0;
      this._reads = [];
      this._paused = false;
      this._encoding = "utf8";
      this.writable = true;
    };
    util.inherits(ChunkStream, Stream);
    ChunkStream.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
      process.nextTick(
        function() {
          this._process();
          if (this._paused && this._reads && this._reads.length > 0) {
            this._paused = false;
            this.emit("drain");
          }
        }.bind(this)
      );
    };
    ChunkStream.prototype.write = function(data, encoding) {
      if (!this.writable) {
        this.emit("error", new Error("Stream not writable"));
        return false;
      }
      let dataBuffer;
      if (Buffer.isBuffer(data)) {
        dataBuffer = data;
      } else {
        dataBuffer = Buffer.from(data, encoding || this._encoding);
      }
      this._buffers.push(dataBuffer);
      this._buffered += dataBuffer.length;
      this._process();
      if (this._reads && this._reads.length === 0) {
        this._paused = true;
      }
      return this.writable && !this._paused;
    };
    ChunkStream.prototype.end = function(data, encoding) {
      if (data) {
        this.write(data, encoding);
      }
      this.writable = false;
      if (!this._buffers) {
        return;
      }
      if (this._buffers.length === 0) {
        this._end();
      } else {
        this._buffers.push(null);
        this._process();
      }
    };
    ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;
    ChunkStream.prototype._end = function() {
      if (this._reads.length > 0) {
        this.emit("error", new Error("Unexpected end of input"));
      }
      this.destroy();
    };
    ChunkStream.prototype.destroy = function() {
      if (!this._buffers) {
        return;
      }
      this.writable = false;
      this._reads = null;
      this._buffers = null;
      this.emit("close");
    };
    ChunkStream.prototype._processReadAllowingLess = function(read) {
      this._reads.shift();
      let smallerBuf = this._buffers[0];
      if (smallerBuf.length > read.length) {
        this._buffered -= read.length;
        this._buffers[0] = smallerBuf.slice(read.length);
        read.func.call(this, smallerBuf.slice(0, read.length));
      } else {
        this._buffered -= smallerBuf.length;
        this._buffers.shift();
        read.func.call(this, smallerBuf);
      }
    };
    ChunkStream.prototype._processRead = function(read) {
      this._reads.shift();
      let pos = 0;
      let count = 0;
      let data = Buffer.alloc(read.length);
      while (pos < read.length) {
        let buf = this._buffers[count++];
        let len = Math.min(buf.length, read.length - pos);
        buf.copy(data, pos, 0, len);
        pos += len;
        if (len !== buf.length) {
          this._buffers[--count] = buf.slice(len);
        }
      }
      if (count > 0) {
        this._buffers.splice(0, count);
      }
      this._buffered -= read.length;
      read.func.call(this, data);
    };
    ChunkStream.prototype._process = function() {
      try {
        while (this._buffered > 0 && this._reads && this._reads.length > 0) {
          let read = this._reads[0];
          if (read.allowLess) {
            this._processReadAllowingLess(read);
          } else if (this._buffered >= read.length) {
            this._processRead(read);
          } else {
            break;
          }
        }
        if (this._buffers && !this.writable) {
          this._end();
        }
      } catch (ex) {
        this.emit("error", ex);
      }
    };
  }
});

// node_modules/pngjs/lib/interlace.js
var require_interlace = __commonJS({
  "node_modules/pngjs/lib/interlace.js"(exports2) {
    "use strict";
    var imagePasses = [
      {
        // pass 1 - 1px
        x: [0],
        y: [0]
      },
      {
        // pass 2 - 1px
        x: [4],
        y: [0]
      },
      {
        // pass 3 - 2px
        x: [0, 4],
        y: [4]
      },
      {
        // pass 4 - 4px
        x: [2, 6],
        y: [0, 4]
      },
      {
        // pass 5 - 8px
        x: [0, 2, 4, 6],
        y: [2, 6]
      },
      {
        // pass 6 - 16px
        x: [1, 3, 5, 7],
        y: [0, 2, 4, 6]
      },
      {
        // pass 7 - 32px
        x: [0, 1, 2, 3, 4, 5, 6, 7],
        y: [1, 3, 5, 7]
      }
    ];
    exports2.getImagePasses = function(width, height) {
      let images = [];
      let xLeftOver = width % 8;
      let yLeftOver = height % 8;
      let xRepeats = (width - xLeftOver) / 8;
      let yRepeats = (height - yLeftOver) / 8;
      for (let i2 = 0; i2 < imagePasses.length; i2++) {
        let pass = imagePasses[i2];
        let passWidth = xRepeats * pass.x.length;
        let passHeight = yRepeats * pass.y.length;
        for (let j = 0; j < pass.x.length; j++) {
          if (pass.x[j] < xLeftOver) {
            passWidth++;
          } else {
            break;
          }
        }
        for (let j = 0; j < pass.y.length; j++) {
          if (pass.y[j] < yLeftOver) {
            passHeight++;
          } else {
            break;
          }
        }
        if (passWidth > 0 && passHeight > 0) {
          images.push({ width: passWidth, height: passHeight, index: i2 });
        }
      }
      return images;
    };
    exports2.getInterlaceIterator = function(width) {
      return function(x, y, pass) {
        let outerXLeftOver = x % imagePasses[pass].x.length;
        let outerX = (x - outerXLeftOver) / imagePasses[pass].x.length * 8 + imagePasses[pass].x[outerXLeftOver];
        let outerYLeftOver = y % imagePasses[pass].y.length;
        let outerY = (y - outerYLeftOver) / imagePasses[pass].y.length * 8 + imagePasses[pass].y[outerYLeftOver];
        return outerX * 4 + outerY * width * 4;
      };
    };
  }
});

// node_modules/pngjs/lib/paeth-predictor.js
var require_paeth_predictor = __commonJS({
  "node_modules/pngjs/lib/paeth-predictor.js"(exports2, module2) {
    "use strict";
    module2.exports = function paethPredictor(left, above, upLeft) {
      let paeth = left + above - upLeft;
      let pLeft = Math.abs(paeth - left);
      let pAbove = Math.abs(paeth - above);
      let pUpLeft = Math.abs(paeth - upLeft);
      if (pLeft <= pAbove && pLeft <= pUpLeft) {
        return left;
      }
      if (pAbove <= pUpLeft) {
        return above;
      }
      return upLeft;
    };
  }
});

// node_modules/pngjs/lib/filter-parse.js
var require_filter_parse = __commonJS({
  "node_modules/pngjs/lib/filter-parse.js"(exports2, module2) {
    "use strict";
    var interlaceUtils = require_interlace();
    var paethPredictor = require_paeth_predictor();
    function getByteWidth(width, bpp, depth) {
      let byteWidth = width * bpp;
      if (depth !== 8) {
        byteWidth = Math.ceil(byteWidth / (8 / depth));
      }
      return byteWidth;
    }
    var Filter = module2.exports = function(bitmapInfo, dependencies) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let interlace = bitmapInfo.interlace;
      let bpp = bitmapInfo.bpp;
      let depth = bitmapInfo.depth;
      this.read = dependencies.read;
      this.write = dependencies.write;
      this.complete = dependencies.complete;
      this._imageIndex = 0;
      this._images = [];
      if (interlace) {
        let passes = interlaceUtils.getImagePasses(width, height);
        for (let i2 = 0; i2 < passes.length; i2++) {
          this._images.push({
            byteWidth: getByteWidth(passes[i2].width, bpp, depth),
            height: passes[i2].height,
            lineIndex: 0
          });
        }
      } else {
        this._images.push({
          byteWidth: getByteWidth(width, bpp, depth),
          height,
          lineIndex: 0
        });
      }
      if (depth === 8) {
        this._xComparison = bpp;
      } else if (depth === 16) {
        this._xComparison = bpp * 2;
      } else {
        this._xComparison = 1;
      }
    };
    Filter.prototype.start = function() {
      this.read(
        this._images[this._imageIndex].byteWidth + 1,
        this._reverseFilterLine.bind(this)
      );
    };
    Filter.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        unfilteredLine[x] = rawByte + f1Left;
      }
    };
    Filter.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f2Up = lastLine ? lastLine[x] : 0;
        unfilteredLine[x] = rawByte + f2Up;
      }
    };
    Filter.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f3Up = lastLine ? lastLine[x] : 0;
        let f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f3Add = Math.floor((f3Left + f3Up) / 2);
        unfilteredLine[x] = rawByte + f3Add;
      }
    };
    Filter.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f4Up = lastLine ? lastLine[x] : 0;
        let f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
        let f4Add = paethPredictor(f4Left, f4Up, f4UpLeft);
        unfilteredLine[x] = rawByte + f4Add;
      }
    };
    Filter.prototype._reverseFilterLine = function(rawData) {
      let filter = rawData[0];
      let unfilteredLine;
      let currentImage = this._images[this._imageIndex];
      let byteWidth = currentImage.byteWidth;
      if (filter === 0) {
        unfilteredLine = rawData.slice(1, byteWidth + 1);
      } else {
        unfilteredLine = Buffer.alloc(byteWidth);
        switch (filter) {
          case 1:
            this._unFilterType1(rawData, unfilteredLine, byteWidth);
            break;
          case 2:
            this._unFilterType2(rawData, unfilteredLine, byteWidth);
            break;
          case 3:
            this._unFilterType3(rawData, unfilteredLine, byteWidth);
            break;
          case 4:
            this._unFilterType4(rawData, unfilteredLine, byteWidth);
            break;
          default:
            throw new Error("Unrecognised filter type - " + filter);
        }
      }
      this.write(unfilteredLine);
      currentImage.lineIndex++;
      if (currentImage.lineIndex >= currentImage.height) {
        this._lastLine = null;
        this._imageIndex++;
        currentImage = this._images[this._imageIndex];
      } else {
        this._lastLine = unfilteredLine;
      }
      if (currentImage) {
        this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
      } else {
        this._lastLine = null;
        this.complete();
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-async.js
var require_filter_parse_async = __commonJS({
  "node_modules/pngjs/lib/filter-parse-async.js"(exports2, module2) {
    "use strict";
    var util = require("util");
    var ChunkStream = require_chunkstream();
    var Filter = require_filter_parse();
    var FilterAsync = module2.exports = function(bitmapInfo) {
      ChunkStream.call(this);
      let buffers = [];
      let that = this;
      this._filter = new Filter(bitmapInfo, {
        read: this.read.bind(this),
        write: function(buffer) {
          buffers.push(buffer);
        },
        complete: function() {
          that.emit("complete", Buffer.concat(buffers));
        }
      });
      this._filter.start();
    };
    util.inherits(FilterAsync, ChunkStream);
  }
});

// node_modules/pngjs/lib/constants.js
var require_constants = __commonJS({
  "node_modules/pngjs/lib/constants.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10],
      TYPE_IHDR: 1229472850,
      TYPE_IEND: 1229278788,
      TYPE_IDAT: 1229209940,
      TYPE_PLTE: 1347179589,
      TYPE_tRNS: 1951551059,
      // eslint-disable-line camelcase
      TYPE_gAMA: 1732332865,
      // eslint-disable-line camelcase
      // color-type bits
      COLORTYPE_GRAYSCALE: 0,
      COLORTYPE_PALETTE: 1,
      COLORTYPE_COLOR: 2,
      COLORTYPE_ALPHA: 4,
      // e.g. grayscale and alpha
      // color-type combinations
      COLORTYPE_PALETTE_COLOR: 3,
      COLORTYPE_COLOR_ALPHA: 6,
      COLORTYPE_TO_BPP_MAP: {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4
      },
      GAMMA_DIVISION: 1e5
    };
  }
});

// node_modules/pngjs/lib/crc.js
var require_crc = __commonJS({
  "node_modules/pngjs/lib/crc.js"(exports2, module2) {
    "use strict";
    var crcTable = [];
    (function() {
      for (let i2 = 0; i2 < 256; i2++) {
        let currentCrc = i2;
        for (let j = 0; j < 8; j++) {
          if (currentCrc & 1) {
            currentCrc = 3988292384 ^ currentCrc >>> 1;
          } else {
            currentCrc = currentCrc >>> 1;
          }
        }
        crcTable[i2] = currentCrc;
      }
    })();
    var CrcCalculator = module2.exports = function() {
      this._crc = -1;
    };
    CrcCalculator.prototype.write = function(data) {
      for (let i2 = 0; i2 < data.length; i2++) {
        this._crc = crcTable[(this._crc ^ data[i2]) & 255] ^ this._crc >>> 8;
      }
      return true;
    };
    CrcCalculator.prototype.crc32 = function() {
      return this._crc ^ -1;
    };
    CrcCalculator.crc32 = function(buf) {
      let crc = -1;
      for (let i2 = 0; i2 < buf.length; i2++) {
        crc = crcTable[(crc ^ buf[i2]) & 255] ^ crc >>> 8;
      }
      return crc ^ -1;
    };
  }
});

// node_modules/pngjs/lib/parser.js
var require_parser = __commonJS({
  "node_modules/pngjs/lib/parser.js"(exports2, module2) {
    "use strict";
    var constants = require_constants();
    var CrcCalculator = require_crc();
    var Parser = module2.exports = function(options, dependencies) {
      this._options = options;
      options.checkCRC = options.checkCRC !== false;
      this._hasIHDR = false;
      this._hasIEND = false;
      this._emittedHeadersFinished = false;
      this._palette = [];
      this._colorType = 0;
      this._chunks = {};
      this._chunks[constants.TYPE_IHDR] = this._handleIHDR.bind(this);
      this._chunks[constants.TYPE_IEND] = this._handleIEND.bind(this);
      this._chunks[constants.TYPE_IDAT] = this._handleIDAT.bind(this);
      this._chunks[constants.TYPE_PLTE] = this._handlePLTE.bind(this);
      this._chunks[constants.TYPE_tRNS] = this._handleTRNS.bind(this);
      this._chunks[constants.TYPE_gAMA] = this._handleGAMA.bind(this);
      this.read = dependencies.read;
      this.error = dependencies.error;
      this.metadata = dependencies.metadata;
      this.gamma = dependencies.gamma;
      this.transColor = dependencies.transColor;
      this.palette = dependencies.palette;
      this.parsed = dependencies.parsed;
      this.inflateData = dependencies.inflateData;
      this.finished = dependencies.finished;
      this.simpleTransparency = dependencies.simpleTransparency;
      this.headersFinished = dependencies.headersFinished || function() {
      };
    };
    Parser.prototype.start = function() {
      this.read(constants.PNG_SIGNATURE.length, this._parseSignature.bind(this));
    };
    Parser.prototype._parseSignature = function(data) {
      let signature = constants.PNG_SIGNATURE;
      for (let i2 = 0; i2 < signature.length; i2++) {
        if (data[i2] !== signature[i2]) {
          this.error(new Error("Invalid file signature"));
          return;
        }
      }
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._parseChunkBegin = function(data) {
      let length = data.readUInt32BE(0);
      let type = data.readUInt32BE(4);
      let name = "";
      for (let i2 = 4; i2 < 8; i2++) {
        name += String.fromCharCode(data[i2]);
      }
      let ancillary = Boolean(data[4] & 32);
      if (!this._hasIHDR && type !== constants.TYPE_IHDR) {
        this.error(new Error("Expected IHDR on beggining"));
        return;
      }
      this._crc = new CrcCalculator();
      this._crc.write(Buffer.from(name));
      if (this._chunks[type]) {
        return this._chunks[type](length);
      }
      if (!ancillary) {
        this.error(new Error("Unsupported critical chunk type " + name));
        return;
      }
      this.read(length + 4, this._skipChunk.bind(this));
    };
    Parser.prototype._skipChunk = function() {
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._handleChunkEnd = function() {
      this.read(4, this._parseChunkEnd.bind(this));
    };
    Parser.prototype._parseChunkEnd = function(data) {
      let fileCrc = data.readInt32BE(0);
      let calcCrc = this._crc.crc32();
      if (this._options.checkCRC && calcCrc !== fileCrc) {
        this.error(new Error("Crc error - " + fileCrc + " - " + calcCrc));
        return;
      }
      if (!this._hasIEND) {
        this.read(8, this._parseChunkBegin.bind(this));
      }
    };
    Parser.prototype._handleIHDR = function(length) {
      this.read(length, this._parseIHDR.bind(this));
    };
    Parser.prototype._parseIHDR = function(data) {
      this._crc.write(data);
      let width = data.readUInt32BE(0);
      let height = data.readUInt32BE(4);
      let depth = data[8];
      let colorType = data[9];
      let compr = data[10];
      let filter = data[11];
      let interlace = data[12];
      if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
        this.error(new Error("Unsupported bit depth " + depth));
        return;
      }
      if (!(colorType in constants.COLORTYPE_TO_BPP_MAP)) {
        this.error(new Error("Unsupported color type"));
        return;
      }
      if (compr !== 0) {
        this.error(new Error("Unsupported compression method"));
        return;
      }
      if (filter !== 0) {
        this.error(new Error("Unsupported filter method"));
        return;
      }
      if (interlace !== 0 && interlace !== 1) {
        this.error(new Error("Unsupported interlace method"));
        return;
      }
      this._colorType = colorType;
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._colorType];
      this._hasIHDR = true;
      this.metadata({
        width,
        height,
        depth,
        interlace: Boolean(interlace),
        palette: Boolean(colorType & constants.COLORTYPE_PALETTE),
        color: Boolean(colorType & constants.COLORTYPE_COLOR),
        alpha: Boolean(colorType & constants.COLORTYPE_ALPHA),
        bpp,
        colorType
      });
      this._handleChunkEnd();
    };
    Parser.prototype._handlePLTE = function(length) {
      this.read(length, this._parsePLTE.bind(this));
    };
    Parser.prototype._parsePLTE = function(data) {
      this._crc.write(data);
      let entries2 = Math.floor(data.length / 3);
      for (let i2 = 0; i2 < entries2; i2++) {
        this._palette.push([data[i2 * 3], data[i2 * 3 + 1], data[i2 * 3 + 2], 255]);
      }
      this.palette(this._palette);
      this._handleChunkEnd();
    };
    Parser.prototype._handleTRNS = function(length) {
      this.simpleTransparency();
      this.read(length, this._parseTRNS.bind(this));
    };
    Parser.prototype._parseTRNS = function(data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR) {
        if (this._palette.length === 0) {
          this.error(new Error("Transparency chunk must be after palette"));
          return;
        }
        if (data.length > this._palette.length) {
          this.error(new Error("More transparent colors than palette size"));
          return;
        }
        for (let i2 = 0; i2 < data.length; i2++) {
          this._palette[i2][3] = data[i2];
        }
        this.palette(this._palette);
      }
      if (this._colorType === constants.COLORTYPE_GRAYSCALE) {
        this.transColor([data.readUInt16BE(0)]);
      }
      if (this._colorType === constants.COLORTYPE_COLOR) {
        this.transColor([
          data.readUInt16BE(0),
          data.readUInt16BE(2),
          data.readUInt16BE(4)
        ]);
      }
      this._handleChunkEnd();
    };
    Parser.prototype._handleGAMA = function(length) {
      this.read(length, this._parseGAMA.bind(this));
    };
    Parser.prototype._parseGAMA = function(data) {
      this._crc.write(data);
      this.gamma(data.readUInt32BE(0) / constants.GAMMA_DIVISION);
      this._handleChunkEnd();
    };
    Parser.prototype._handleIDAT = function(length) {
      if (!this._emittedHeadersFinished) {
        this._emittedHeadersFinished = true;
        this.headersFinished();
      }
      this.read(-length, this._parseIDAT.bind(this, length));
    };
    Parser.prototype._parseIDAT = function(length, data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
        throw new Error("Expected palette not found");
      }
      this.inflateData(data);
      let leftOverLength = length - data.length;
      if (leftOverLength > 0) {
        this._handleIDAT(leftOverLength);
      } else {
        this._handleChunkEnd();
      }
    };
    Parser.prototype._handleIEND = function(length) {
      this.read(length, this._parseIEND.bind(this));
    };
    Parser.prototype._parseIEND = function(data) {
      this._crc.write(data);
      this._hasIEND = true;
      this._handleChunkEnd();
      if (this.finished) {
        this.finished();
      }
    };
  }
});

// node_modules/pngjs/lib/bitmapper.js
var require_bitmapper = __commonJS({
  "node_modules/pngjs/lib/bitmapper.js"(exports2) {
    "use strict";
    var interlaceUtils = require_interlace();
    var pixelBppMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos === data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = 255;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 1 >= data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = data[rawPos + 1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 2 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = 255;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 3 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = data[rawPos + 3];
      }
    ];
    var pixelBppCustomMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = maxBit;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, pixelData, pxPos) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = pixelData[1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = maxBit;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, pixelData, pxPos) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = pixelData[3];
      }
    ];
    function bitRetriever(data, depth) {
      let leftOver = [];
      let i2 = 0;
      function split() {
        if (i2 === data.length) {
          throw new Error("Ran out of data");
        }
        let byte = data[i2];
        i2++;
        let byte8, byte7, byte6, byte5, byte4, byte3, byte2, byte1;
        switch (depth) {
          default:
            throw new Error("unrecognised depth");
          case 16:
            byte2 = data[i2];
            i2++;
            leftOver.push((byte << 8) + byte2);
            break;
          case 4:
            byte2 = byte & 15;
            byte1 = byte >> 4;
            leftOver.push(byte1, byte2);
            break;
          case 2:
            byte4 = byte & 3;
            byte3 = byte >> 2 & 3;
            byte2 = byte >> 4 & 3;
            byte1 = byte >> 6 & 3;
            leftOver.push(byte1, byte2, byte3, byte4);
            break;
          case 1:
            byte8 = byte & 1;
            byte7 = byte >> 1 & 1;
            byte6 = byte >> 2 & 1;
            byte5 = byte >> 3 & 1;
            byte4 = byte >> 4 & 1;
            byte3 = byte >> 5 & 1;
            byte2 = byte >> 6 & 1;
            byte1 = byte >> 7 & 1;
            leftOver.push(byte1, byte2, byte3, byte4, byte5, byte6, byte7, byte8);
            break;
        }
      }
      return {
        get: function(count) {
          while (leftOver.length < count) {
            split();
          }
          let returner = leftOver.slice(0, count);
          leftOver = leftOver.slice(count);
          return returner;
        },
        resetAfterLine: function() {
          leftOver.length = 0;
        },
        end: function() {
          if (i2 !== data.length) {
            throw new Error("extra data found");
          }
        }
      };
    }
    function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
          rawPos += bpp;
        }
      }
      return rawPos;
    }
    function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pixelData = bits.get(bpp);
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
        }
        bits.resetAfterLine();
      }
    }
    exports2.dataToBitMap = function(data, bitmapInfo) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let depth = bitmapInfo.depth;
      let bpp = bitmapInfo.bpp;
      let interlace = bitmapInfo.interlace;
      let bits;
      if (depth !== 8) {
        bits = bitRetriever(data, depth);
      }
      let pxData;
      if (depth <= 8) {
        pxData = Buffer.alloc(width * height * 4);
      } else {
        pxData = new Uint16Array(width * height * 4);
      }
      let maxBit = Math.pow(2, depth) - 1;
      let rawPos = 0;
      let images;
      let getPxPos;
      if (interlace) {
        images = interlaceUtils.getImagePasses(width, height);
        getPxPos = interlaceUtils.getInterlaceIterator(width, height);
      } else {
        let nonInterlacedPxPos = 0;
        getPxPos = function() {
          let returner = nonInterlacedPxPos;
          nonInterlacedPxPos += 4;
          return returner;
        };
        images = [{ width, height }];
      }
      for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
        if (depth === 8) {
          rawPos = mapImage8Bit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            data,
            rawPos
          );
        } else {
          mapImageCustomBit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            bits,
            maxBit
          );
        }
      }
      if (depth === 8) {
        if (rawPos !== data.length) {
          throw new Error("extra data found");
        }
      } else {
        bits.end();
      }
      return pxData;
    };
  }
});

// node_modules/pngjs/lib/format-normaliser.js
var require_format_normaliser = __commonJS({
  "node_modules/pngjs/lib/format-normaliser.js"(exports2, module2) {
    "use strict";
    function dePalette(indata, outdata, width, height, palette) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let color = palette[indata[pxPos]];
          if (!color) {
            throw new Error("index " + indata[pxPos] + " not in palette");
          }
          for (let i2 = 0; i2 < 4; i2++) {
            outdata[pxPos + i2] = color[i2];
          }
          pxPos += 4;
        }
      }
    }
    function replaceTransparentColor(indata, outdata, width, height, transColor) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let makeTrans = false;
          if (transColor.length === 1) {
            if (transColor[0] === indata[pxPos]) {
              makeTrans = true;
            }
          } else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
            makeTrans = true;
          }
          if (makeTrans) {
            for (let i2 = 0; i2 < 4; i2++) {
              outdata[pxPos + i2] = 0;
            }
          }
          pxPos += 4;
        }
      }
    }
    function scaleDepth(indata, outdata, width, height, depth) {
      let maxOutSample = 255;
      let maxInSample = Math.pow(2, depth) - 1;
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let i2 = 0; i2 < 4; i2++) {
            outdata[pxPos + i2] = Math.floor(
              indata[pxPos + i2] * maxOutSample / maxInSample + 0.5
            );
          }
          pxPos += 4;
        }
      }
    }
    module2.exports = function(indata, imageData) {
      let depth = imageData.depth;
      let width = imageData.width;
      let height = imageData.height;
      let colorType = imageData.colorType;
      let transColor = imageData.transColor;
      let palette = imageData.palette;
      let outdata = indata;
      if (colorType === 3) {
        dePalette(indata, outdata, width, height, palette);
      } else {
        if (transColor) {
          replaceTransparentColor(indata, outdata, width, height, transColor);
        }
        if (depth !== 8) {
          if (depth === 16) {
            outdata = Buffer.alloc(width * height * 4);
          }
          scaleDepth(indata, outdata, width, height, depth);
        }
      }
      return outdata;
    };
  }
});

// node_modules/pngjs/lib/parser-async.js
var require_parser_async = __commonJS({
  "node_modules/pngjs/lib/parser-async.js"(exports2, module2) {
    "use strict";
    var util = require("util");
    var zlib2 = require("zlib");
    var ChunkStream = require_chunkstream();
    var FilterAsync = require_filter_parse_async();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    var ParserAsync = module2.exports = function(options) {
      ChunkStream.call(this);
      this._parser = new Parser(options, {
        read: this.read.bind(this),
        error: this._handleError.bind(this),
        metadata: this._handleMetaData.bind(this),
        gamma: this.emit.bind(this, "gamma"),
        palette: this._handlePalette.bind(this),
        transColor: this._handleTransColor.bind(this),
        finished: this._finished.bind(this),
        inflateData: this._inflateData.bind(this),
        simpleTransparency: this._simpleTransparency.bind(this),
        headersFinished: this._headersFinished.bind(this)
      });
      this._options = options;
      this.writable = true;
      this._parser.start();
    };
    util.inherits(ParserAsync, ChunkStream);
    ParserAsync.prototype._handleError = function(err) {
      this.emit("error", err);
      this.writable = false;
      this.destroy();
      if (this._inflate && this._inflate.destroy) {
        this._inflate.destroy();
      }
      if (this._filter) {
        this._filter.destroy();
        this._filter.on("error", function() {
        });
      }
      this.errord = true;
    };
    ParserAsync.prototype._inflateData = function(data) {
      if (!this._inflate) {
        if (this._bitmapInfo.interlace) {
          this._inflate = zlib2.createInflate();
          this._inflate.on("error", this.emit.bind(this, "error"));
          this._filter.on("complete", this._complete.bind(this));
          this._inflate.pipe(this._filter);
        } else {
          let rowSize = (this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1;
          let imageSize = rowSize * this._bitmapInfo.height;
          let chunkSize = Math.max(imageSize, zlib2.Z_MIN_CHUNK);
          this._inflate = zlib2.createInflate({ chunkSize });
          let leftToInflate = imageSize;
          let emitError = this.emit.bind(this, "error");
          this._inflate.on("error", function(err) {
            if (!leftToInflate) {
              return;
            }
            emitError(err);
          });
          this._filter.on("complete", this._complete.bind(this));
          let filterWrite = this._filter.write.bind(this._filter);
          this._inflate.on("data", function(chunk2) {
            if (!leftToInflate) {
              return;
            }
            if (chunk2.length > leftToInflate) {
              chunk2 = chunk2.slice(0, leftToInflate);
            }
            leftToInflate -= chunk2.length;
            filterWrite(chunk2);
          });
          this._inflate.on("end", this._filter.end.bind(this._filter));
        }
      }
      this._inflate.write(data);
    };
    ParserAsync.prototype._handleMetaData = function(metaData) {
      this._metaData = metaData;
      this._bitmapInfo = Object.create(metaData);
      this._filter = new FilterAsync(this._bitmapInfo);
    };
    ParserAsync.prototype._handleTransColor = function(transColor) {
      this._bitmapInfo.transColor = transColor;
    };
    ParserAsync.prototype._handlePalette = function(palette) {
      this._bitmapInfo.palette = palette;
    };
    ParserAsync.prototype._simpleTransparency = function() {
      this._metaData.alpha = true;
    };
    ParserAsync.prototype._headersFinished = function() {
      this.emit("metadata", this._metaData);
    };
    ParserAsync.prototype._finished = function() {
      if (this.errord) {
        return;
      }
      if (!this._inflate) {
        this.emit("error", "No Inflate block");
      } else {
        this._inflate.end();
      }
    };
    ParserAsync.prototype._complete = function(filteredData) {
      if (this.errord) {
        return;
      }
      let normalisedBitmapData;
      try {
        let bitmapData = bitmapper.dataToBitMap(filteredData, this._bitmapInfo);
        normalisedBitmapData = formatNormaliser(bitmapData, this._bitmapInfo);
        bitmapData = null;
      } catch (ex) {
        this._handleError(ex);
        return;
      }
      this.emit("parsed", normalisedBitmapData);
    };
  }
});

// node_modules/pngjs/lib/bitpacker.js
var require_bitpacker = __commonJS({
  "node_modules/pngjs/lib/bitpacker.js"(exports2, module2) {
    "use strict";
    var constants = require_constants();
    module2.exports = function(dataIn, width, height, options) {
      let outHasAlpha = [constants.COLORTYPE_COLOR_ALPHA, constants.COLORTYPE_ALPHA].indexOf(
        options.colorType
      ) !== -1;
      if (options.colorType === options.inputColorType) {
        let bigEndian = (function() {
          let buffer = new ArrayBuffer(2);
          new DataView(buffer).setInt16(
            0,
            256,
            true
            /* littleEndian */
          );
          return new Int16Array(buffer)[0] !== 256;
        })();
        if (options.bitDepth === 8 || options.bitDepth === 16 && bigEndian) {
          return dataIn;
        }
      }
      let data = options.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
      let maxValue = 255;
      let inBpp = constants.COLORTYPE_TO_BPP_MAP[options.inputColorType];
      if (inBpp === 4 && !options.inputHasAlpha) {
        inBpp = 3;
      }
      let outBpp = constants.COLORTYPE_TO_BPP_MAP[options.colorType];
      if (options.bitDepth === 16) {
        maxValue = 65535;
        outBpp *= 2;
      }
      let outData = Buffer.alloc(width * height * outBpp);
      let inIndex = 0;
      let outIndex = 0;
      let bgColor = options.bgColor || {};
      if (bgColor.red === void 0) {
        bgColor.red = maxValue;
      }
      if (bgColor.green === void 0) {
        bgColor.green = maxValue;
      }
      if (bgColor.blue === void 0) {
        bgColor.blue = maxValue;
      }
      function getRGBA() {
        let red;
        let green;
        let blue;
        let alpha = maxValue;
        switch (options.inputColorType) {
          case constants.COLORTYPE_COLOR_ALPHA:
            alpha = data[inIndex + 3];
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_COLOR:
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_ALPHA:
            alpha = data[inIndex + 1];
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          case constants.COLORTYPE_GRAYSCALE:
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          default:
            throw new Error(
              "input color type:" + options.inputColorType + " is not supported at present"
            );
        }
        if (options.inputHasAlpha) {
          if (!outHasAlpha) {
            alpha /= maxValue;
            red = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0),
              maxValue
            );
            green = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0),
              maxValue
            );
            blue = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0),
              maxValue
            );
          }
        }
        return { red, green, blue, alpha };
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let rgba = getRGBA(data, inIndex);
          switch (options.colorType) {
            case constants.COLORTYPE_COLOR_ALPHA:
            case constants.COLORTYPE_COLOR:
              if (options.bitDepth === 8) {
                outData[outIndex] = rgba.red;
                outData[outIndex + 1] = rgba.green;
                outData[outIndex + 2] = rgba.blue;
                if (outHasAlpha) {
                  outData[outIndex + 3] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(rgba.red, outIndex);
                outData.writeUInt16BE(rgba.green, outIndex + 2);
                outData.writeUInt16BE(rgba.blue, outIndex + 4);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 6);
                }
              }
              break;
            case constants.COLORTYPE_ALPHA:
            case constants.COLORTYPE_GRAYSCALE: {
              let grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
              if (options.bitDepth === 8) {
                outData[outIndex] = grayscale;
                if (outHasAlpha) {
                  outData[outIndex + 1] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(grayscale, outIndex);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 2);
                }
              }
              break;
            }
            default:
              throw new Error("unrecognised color Type " + options.colorType);
          }
          inIndex += inBpp;
          outIndex += outBpp;
        }
      }
      return outData;
    };
  }
});

// node_modules/pngjs/lib/filter-pack.js
var require_filter_pack = __commonJS({
  "node_modules/pngjs/lib/filter-pack.js"(exports2, module2) {
    "use strict";
    var paethPredictor = require_paeth_predictor();
    function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        rawData[rawPos + x] = pxData[pxPos + x];
      }
    }
    function filterSumNone(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let i2 = pxPos; i2 < length; i2++) {
        sum += Math.abs(pxData[i2]);
      }
      return sum;
    }
    function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumSub(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - up;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumUp(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let x = pxPos; x < length; x++) {
        let up = pxPos > 0 ? pxData[x - byteWidth] : 0;
        let val = pxData[x] - up;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumAvg(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        sum += Math.abs(val);
      }
      return sum;
    }
    var filters = {
      0: filterNone,
      1: filterSub,
      2: filterUp,
      3: filterAvg,
      4: filterPaeth
    };
    var filterSums = {
      0: filterSumNone,
      1: filterSumSub,
      2: filterSumUp,
      3: filterSumAvg,
      4: filterSumPaeth
    };
    module2.exports = function(pxData, width, height, options, bpp) {
      let filterTypes;
      if (!("filterType" in options) || options.filterType === -1) {
        filterTypes = [0, 1, 2, 3, 4];
      } else if (typeof options.filterType === "number") {
        filterTypes = [options.filterType];
      } else {
        throw new Error("unrecognised filter types");
      }
      if (options.bitDepth === 16) {
        bpp *= 2;
      }
      let byteWidth = width * bpp;
      let rawPos = 0;
      let pxPos = 0;
      let rawData = Buffer.alloc((byteWidth + 1) * height);
      let sel = filterTypes[0];
      for (let y = 0; y < height; y++) {
        if (filterTypes.length > 1) {
          let min = Infinity;
          for (let i2 = 0; i2 < filterTypes.length; i2++) {
            let sum = filterSums[filterTypes[i2]](pxData, pxPos, byteWidth, bpp);
            if (sum < min) {
              sel = filterTypes[i2];
              min = sum;
            }
          }
        }
        rawData[rawPos] = sel;
        rawPos++;
        filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
        rawPos += byteWidth;
        pxPos += byteWidth;
      }
      return rawData;
    };
  }
});

// node_modules/pngjs/lib/packer.js
var require_packer = __commonJS({
  "node_modules/pngjs/lib/packer.js"(exports2, module2) {
    "use strict";
    var constants = require_constants();
    var CrcStream = require_crc();
    var bitPacker = require_bitpacker();
    var filter = require_filter_pack();
    var zlib2 = require("zlib");
    var Packer = module2.exports = function(options) {
      this._options = options;
      options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
      options.deflateLevel = options.deflateLevel != null ? options.deflateLevel : 9;
      options.deflateStrategy = options.deflateStrategy != null ? options.deflateStrategy : 3;
      options.inputHasAlpha = options.inputHasAlpha != null ? options.inputHasAlpha : true;
      options.deflateFactory = options.deflateFactory || zlib2.createDeflate;
      options.bitDepth = options.bitDepth || 8;
      options.colorType = typeof options.colorType === "number" ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;
      options.inputColorType = typeof options.inputColorType === "number" ? options.inputColorType : constants.COLORTYPE_COLOR_ALPHA;
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.colorType) === -1) {
        throw new Error(
          "option color type:" + options.colorType + " is not supported at present"
        );
      }
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.inputColorType) === -1) {
        throw new Error(
          "option input color type:" + options.inputColorType + " is not supported at present"
        );
      }
      if (options.bitDepth !== 8 && options.bitDepth !== 16) {
        throw new Error(
          "option bit depth:" + options.bitDepth + " is not supported at present"
        );
      }
    };
    Packer.prototype.getDeflateOptions = function() {
      return {
        chunkSize: this._options.deflateChunkSize,
        level: this._options.deflateLevel,
        strategy: this._options.deflateStrategy
      };
    };
    Packer.prototype.createDeflate = function() {
      return this._options.deflateFactory(this.getDeflateOptions());
    };
    Packer.prototype.filterData = function(data, width, height) {
      let packedData = bitPacker(data, width, height, this._options);
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._options.colorType];
      let filteredData = filter(packedData, width, height, this._options, bpp);
      return filteredData;
    };
    Packer.prototype._packChunk = function(type, data) {
      let len = data ? data.length : 0;
      let buf = Buffer.alloc(len + 12);
      buf.writeUInt32BE(len, 0);
      buf.writeUInt32BE(type, 4);
      if (data) {
        data.copy(buf, 8);
      }
      buf.writeInt32BE(
        CrcStream.crc32(buf.slice(4, buf.length - 4)),
        buf.length - 4
      );
      return buf;
    };
    Packer.prototype.packGAMA = function(gamma) {
      let buf = Buffer.alloc(4);
      buf.writeUInt32BE(Math.floor(gamma * constants.GAMMA_DIVISION), 0);
      return this._packChunk(constants.TYPE_gAMA, buf);
    };
    Packer.prototype.packIHDR = function(width, height) {
      let buf = Buffer.alloc(13);
      buf.writeUInt32BE(width, 0);
      buf.writeUInt32BE(height, 4);
      buf[8] = this._options.bitDepth;
      buf[9] = this._options.colorType;
      buf[10] = 0;
      buf[11] = 0;
      buf[12] = 0;
      return this._packChunk(constants.TYPE_IHDR, buf);
    };
    Packer.prototype.packIDAT = function(data) {
      return this._packChunk(constants.TYPE_IDAT, data);
    };
    Packer.prototype.packIEND = function() {
      return this._packChunk(constants.TYPE_IEND, null);
    };
  }
});

// node_modules/pngjs/lib/packer-async.js
var require_packer_async = __commonJS({
  "node_modules/pngjs/lib/packer-async.js"(exports2, module2) {
    "use strict";
    var util = require("util");
    var Stream = require("stream");
    var constants = require_constants();
    var Packer = require_packer();
    var PackerAsync = module2.exports = function(opt) {
      Stream.call(this);
      let options = opt || {};
      this._packer = new Packer(options);
      this._deflate = this._packer.createDeflate();
      this.readable = true;
    };
    util.inherits(PackerAsync, Stream);
    PackerAsync.prototype.pack = function(data, width, height, gamma) {
      this.emit("data", Buffer.from(constants.PNG_SIGNATURE));
      this.emit("data", this._packer.packIHDR(width, height));
      if (gamma) {
        this.emit("data", this._packer.packGAMA(gamma));
      }
      let filteredData = this._packer.filterData(data, width, height);
      this._deflate.on("error", this.emit.bind(this, "error"));
      this._deflate.on(
        "data",
        function(compressedData) {
          this.emit("data", this._packer.packIDAT(compressedData));
        }.bind(this)
      );
      this._deflate.on(
        "end",
        function() {
          this.emit("data", this._packer.packIEND());
          this.emit("end");
        }.bind(this)
      );
      this._deflate.end(filteredData);
    };
  }
});

// node_modules/pngjs/lib/sync-inflate.js
var require_sync_inflate = __commonJS({
  "node_modules/pngjs/lib/sync-inflate.js"(exports2, module2) {
    "use strict";
    var assert2 = require("assert").ok;
    var zlib2 = require("zlib");
    var util = require("util");
    var kMaxLength = require("buffer").kMaxLength;
    function Inflate(opts) {
      if (!(this instanceof Inflate)) {
        return new Inflate(opts);
      }
      if (opts && opts.chunkSize < zlib2.Z_MIN_CHUNK) {
        opts.chunkSize = zlib2.Z_MIN_CHUNK;
      }
      zlib2.Inflate.call(this, opts);
      this._offset = this._offset === void 0 ? this._outOffset : this._offset;
      this._buffer = this._buffer || this._outBuffer;
      if (opts && opts.maxLength != null) {
        this._maxLength = opts.maxLength;
      }
    }
    function createInflate(opts) {
      return new Inflate(opts);
    }
    function _close(engine, callback) {
      if (callback) {
        process.nextTick(callback);
      }
      if (!engine._handle) {
        return;
      }
      engine._handle.close();
      engine._handle = null;
    }
    Inflate.prototype._processChunk = function(chunk2, flushFlag, asyncCb) {
      if (typeof asyncCb === "function") {
        return zlib2.Inflate._processChunk.call(this, chunk2, flushFlag, asyncCb);
      }
      let self = this;
      let availInBefore = chunk2 && chunk2.length;
      let availOutBefore = this._chunkSize - this._offset;
      let leftToInflate = this._maxLength;
      let inOff = 0;
      let buffers = [];
      let nread = 0;
      let error;
      this.on("error", function(err) {
        error = err;
      });
      function handleChunk(availInAfter, availOutAfter) {
        if (self._hadError) {
          return;
        }
        let have = availOutBefore - availOutAfter;
        assert2(have >= 0, "have should not go down");
        if (have > 0) {
          let out = self._buffer.slice(self._offset, self._offset + have);
          self._offset += have;
          if (out.length > leftToInflate) {
            out = out.slice(0, leftToInflate);
          }
          buffers.push(out);
          nread += out.length;
          leftToInflate -= out.length;
          if (leftToInflate === 0) {
            return false;
          }
        }
        if (availOutAfter === 0 || self._offset >= self._chunkSize) {
          availOutBefore = self._chunkSize;
          self._offset = 0;
          self._buffer = Buffer.allocUnsafe(self._chunkSize);
        }
        if (availOutAfter === 0) {
          inOff += availInBefore - availInAfter;
          availInBefore = availInAfter;
          return true;
        }
        return false;
      }
      assert2(this._handle, "zlib binding closed");
      let res;
      do {
        res = this._handle.writeSync(
          flushFlag,
          chunk2,
          // in
          inOff,
          // in_off
          availInBefore,
          // in_len
          this._buffer,
          // out
          this._offset,
          //out_off
          availOutBefore
        );
        res = res || this._writeState;
      } while (!this._hadError && handleChunk(res[0], res[1]));
      if (this._hadError) {
        throw error;
      }
      if (nread >= kMaxLength) {
        _close(this);
        throw new RangeError(
          "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes"
        );
      }
      let buf = Buffer.concat(buffers, nread);
      _close(this);
      return buf;
    };
    util.inherits(Inflate, zlib2.Inflate);
    function zlibBufferSync(engine, buffer) {
      if (typeof buffer === "string") {
        buffer = Buffer.from(buffer);
      }
      if (!(buffer instanceof Buffer)) {
        throw new TypeError("Not a string or buffer");
      }
      let flushFlag = engine._finishFlushFlag;
      if (flushFlag == null) {
        flushFlag = zlib2.Z_FINISH;
      }
      return engine._processChunk(buffer, flushFlag);
    }
    function inflateSync(buffer, opts) {
      return zlibBufferSync(new Inflate(opts), buffer);
    }
    module2.exports = exports2 = inflateSync;
    exports2.Inflate = Inflate;
    exports2.createInflate = createInflate;
    exports2.inflateSync = inflateSync;
  }
});

// node_modules/pngjs/lib/sync-reader.js
var require_sync_reader = __commonJS({
  "node_modules/pngjs/lib/sync-reader.js"(exports2, module2) {
    "use strict";
    var SyncReader = module2.exports = function(buffer) {
      this._buffer = buffer;
      this._reads = [];
    };
    SyncReader.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
    };
    SyncReader.prototype.process = function() {
      while (this._reads.length > 0 && this._buffer.length) {
        let read = this._reads[0];
        if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
          this._reads.shift();
          let buf = this._buffer;
          this._buffer = buf.slice(read.length);
          read.func.call(this, buf.slice(0, read.length));
        } else {
          break;
        }
      }
      if (this._reads.length > 0) {
        return new Error("There are some read requests waitng on finished stream");
      }
      if (this._buffer.length > 0) {
        return new Error("unrecognised content at end of stream");
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-sync.js
var require_filter_parse_sync = __commonJS({
  "node_modules/pngjs/lib/filter-parse-sync.js"(exports2) {
    "use strict";
    var SyncReader = require_sync_reader();
    var Filter = require_filter_parse();
    exports2.process = function(inBuffer, bitmapInfo) {
      let outBuffers = [];
      let reader = new SyncReader(inBuffer);
      let filter = new Filter(bitmapInfo, {
        read: reader.read.bind(reader),
        write: function(bufferPart) {
          outBuffers.push(bufferPart);
        },
        complete: function() {
        }
      });
      filter.start();
      reader.process();
      return Buffer.concat(outBuffers);
    };
  }
});

// node_modules/pngjs/lib/parser-sync.js
var require_parser_sync = __commonJS({
  "node_modules/pngjs/lib/parser-sync.js"(exports2, module2) {
    "use strict";
    var hasSyncZlib = true;
    var zlib2 = require("zlib");
    var inflateSync = require_sync_inflate();
    if (!zlib2.deflateSync) {
      hasSyncZlib = false;
    }
    var SyncReader = require_sync_reader();
    var FilterSync = require_filter_parse_sync();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    module2.exports = function(buffer, options) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let err;
      function handleError(_err_) {
        err = _err_;
      }
      let metaData;
      function handleMetaData(_metaData_) {
        metaData = _metaData_;
      }
      function handleTransColor(transColor) {
        metaData.transColor = transColor;
      }
      function handlePalette(palette) {
        metaData.palette = palette;
      }
      function handleSimpleTransparency() {
        metaData.alpha = true;
      }
      let gamma;
      function handleGamma(_gamma_) {
        gamma = _gamma_;
      }
      let inflateDataList = [];
      function handleInflateData(inflatedData2) {
        inflateDataList.push(inflatedData2);
      }
      let reader = new SyncReader(buffer);
      let parser = new Parser(options, {
        read: reader.read.bind(reader),
        error: handleError,
        metadata: handleMetaData,
        gamma: handleGamma,
        palette: handlePalette,
        transColor: handleTransColor,
        inflateData: handleInflateData,
        simpleTransparency: handleSimpleTransparency
      });
      parser.start();
      reader.process();
      if (err) {
        throw err;
      }
      let inflateData = Buffer.concat(inflateDataList);
      inflateDataList.length = 0;
      let inflatedData;
      if (metaData.interlace) {
        inflatedData = zlib2.inflateSync(inflateData);
      } else {
        let rowSize = (metaData.width * metaData.bpp * metaData.depth + 7 >> 3) + 1;
        let imageSize = rowSize * metaData.height;
        inflatedData = inflateSync(inflateData, {
          chunkSize: imageSize,
          maxLength: imageSize
        });
      }
      inflateData = null;
      if (!inflatedData || !inflatedData.length) {
        throw new Error("bad png - invalid inflate data response");
      }
      let unfilteredData = FilterSync.process(inflatedData, metaData);
      inflateData = null;
      let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
      unfilteredData = null;
      let normalisedBitmapData = formatNormaliser(bitmapData, metaData);
      metaData.data = normalisedBitmapData;
      metaData.gamma = gamma || 0;
      return metaData;
    };
  }
});

// node_modules/pngjs/lib/packer-sync.js
var require_packer_sync = __commonJS({
  "node_modules/pngjs/lib/packer-sync.js"(exports2, module2) {
    "use strict";
    var hasSyncZlib = true;
    var zlib2 = require("zlib");
    if (!zlib2.deflateSync) {
      hasSyncZlib = false;
    }
    var constants = require_constants();
    var Packer = require_packer();
    module2.exports = function(metaData, opt) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let options = opt || {};
      let packer = new Packer(options);
      let chunks = [];
      chunks.push(Buffer.from(constants.PNG_SIGNATURE));
      chunks.push(packer.packIHDR(metaData.width, metaData.height));
      if (metaData.gamma) {
        chunks.push(packer.packGAMA(metaData.gamma));
      }
      let filteredData = packer.filterData(
        metaData.data,
        metaData.width,
        metaData.height
      );
      let compressedData = zlib2.deflateSync(
        filteredData,
        packer.getDeflateOptions()
      );
      filteredData = null;
      if (!compressedData || !compressedData.length) {
        throw new Error("bad png - invalid compressed data response");
      }
      chunks.push(packer.packIDAT(compressedData));
      chunks.push(packer.packIEND());
      return Buffer.concat(chunks);
    };
  }
});

// node_modules/pngjs/lib/png-sync.js
var require_png_sync = __commonJS({
  "node_modules/pngjs/lib/png-sync.js"(exports2) {
    "use strict";
    var parse2 = require_parser_sync();
    var pack = require_packer_sync();
    exports2.read = function(buffer, options) {
      return parse2(buffer, options || {});
    };
    exports2.write = function(png, options) {
      return pack(png, options);
    };
  }
});

// node_modules/pngjs/lib/png.js
var require_png = __commonJS({
  "node_modules/pngjs/lib/png.js"(exports2) {
    "use strict";
    var util = require("util");
    var Stream = require("stream");
    var Parser = require_parser_async();
    var Packer = require_packer_async();
    var PNGSync = require_png_sync();
    var PNG = exports2.PNG = function(options) {
      Stream.call(this);
      options = options || {};
      this.width = options.width | 0;
      this.height = options.height | 0;
      this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
      if (options.fill && this.data) {
        this.data.fill(0);
      }
      this.gamma = 0;
      this.readable = this.writable = true;
      this._parser = new Parser(options);
      this._parser.on("error", this.emit.bind(this, "error"));
      this._parser.on("close", this._handleClose.bind(this));
      this._parser.on("metadata", this._metadata.bind(this));
      this._parser.on("gamma", this._gamma.bind(this));
      this._parser.on(
        "parsed",
        function(data) {
          this.data = data;
          this.emit("parsed", data);
        }.bind(this)
      );
      this._packer = new Packer(options);
      this._packer.on("data", this.emit.bind(this, "data"));
      this._packer.on("end", this.emit.bind(this, "end"));
      this._parser.on("close", this._handleClose.bind(this));
      this._packer.on("error", this.emit.bind(this, "error"));
    };
    util.inherits(PNG, Stream);
    PNG.sync = PNGSync;
    PNG.prototype.pack = function() {
      if (!this.data || !this.data.length) {
        this.emit("error", "No data provided");
        return this;
      }
      process.nextTick(
        function() {
          this._packer.pack(this.data, this.width, this.height, this.gamma);
        }.bind(this)
      );
      return this;
    };
    PNG.prototype.parse = function(data, callback) {
      if (callback) {
        let onParsed, onError;
        onParsed = function(parsedData) {
          this.removeListener("error", onError);
          this.data = parsedData;
          callback(null, this);
        }.bind(this);
        onError = function(err) {
          this.removeListener("parsed", onParsed);
          callback(err, null);
        }.bind(this);
        this.once("parsed", onParsed);
        this.once("error", onError);
      }
      this.end(data);
      return this;
    };
    PNG.prototype.write = function(data) {
      this._parser.write(data);
      return true;
    };
    PNG.prototype.end = function(data) {
      this._parser.end(data);
    };
    PNG.prototype._metadata = function(metadata) {
      this.width = metadata.width;
      this.height = metadata.height;
      this.emit("metadata", metadata);
    };
    PNG.prototype._gamma = function(gamma) {
      this.gamma = gamma;
    };
    PNG.prototype._handleClose = function() {
      if (!this._parser.writable && !this._packer.readable) {
        this.emit("close");
      }
    };
    PNG.bitblt = function(src, dst, srcX, srcY, width, height, deltaX, deltaY) {
      srcX |= 0;
      srcY |= 0;
      width |= 0;
      height |= 0;
      deltaX |= 0;
      deltaY |= 0;
      if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height) {
        throw new Error("bitblt reading outside image");
      }
      if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
        throw new Error("bitblt writing outside image");
      }
      for (let y = 0; y < height; y++) {
        src.data.copy(
          dst.data,
          (deltaY + y) * dst.width + deltaX << 2,
          (srcY + y) * src.width + srcX << 2,
          (srcY + y) * src.width + srcX + width << 2
        );
      }
    };
    PNG.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) {
      PNG.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
      return this;
    };
    PNG.adjustGamma = function(src) {
      if (src.gamma) {
        for (let y = 0; y < src.height; y++) {
          for (let x = 0; x < src.width; x++) {
            let idx = src.width * y + x << 2;
            for (let i2 = 0; i2 < 3; i2++) {
              let sample = src.data[idx + i2] / 255;
              sample = Math.pow(sample, 1 / 2.2 / src.gamma);
              src.data[idx + i2] = Math.round(sample * 255);
            }
          }
        }
        src.gamma = 0;
      }
    };
    PNG.prototype.adjustGamma = function() {
      PNG.adjustGamma(this);
    };
  }
});

// node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS({
  "node_modules/qrcode/lib/renderer/utils.js"(exports2) {
    function hex2rgba(hex) {
      if (typeof hex === "number") {
        hex = hex.toString();
      }
      if (typeof hex !== "string") {
        throw new Error("Color should be defined as hex string");
      }
      let hexCode = hex.slice().replace("#", "").split("");
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error("Invalid hex color: " + hex);
      }
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function(c3) {
          return [c3, c3];
        }));
      }
      if (hexCode.length === 6) hexCode.push("F", "F");
      const hexValue = parseInt(hexCode.join(""), 16);
      return {
        r: hexValue >> 24 & 255,
        g: hexValue >> 16 & 255,
        b: hexValue >> 8 & 255,
        a: hexValue & 255,
        hex: "#" + hexCode.slice(0, 6).join("")
      };
    }
    exports2.getOptions = function getOptions(options) {
      if (!options) options = {};
      if (!options.color) options.color = {};
      const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
      const width = options.width && options.width >= 21 ? options.width : void 0;
      const scale = options.scale || 4;
      return {
        width,
        scale: width ? 4 : scale,
        margin,
        color: {
          dark: hex2rgba(options.color.dark || "#000000ff"),
          light: hex2rgba(options.color.light || "#ffffffff")
        },
        type: options.type,
        rendererOpts: options.rendererOpts || {}
      };
    };
    exports2.getScale = function getScale(qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
    };
    exports2.getImageWidth = function getImageWidth(qrSize, opts) {
      const scale = exports2.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale);
    };
    exports2.qrToImageData = function qrToImageData(imgData, qr, opts) {
      const size = qr.modules.size;
      const data = qr.modules.data;
      const scale = exports2.getScale(size, opts);
      const symbolSize = Math.floor((size + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];
      for (let i2 = 0; i2 < symbolSize; i2++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i2 * symbolSize + j) * 4;
          let pxColor = opts.color.light;
          if (i2 >= scaledMargin && j >= scaledMargin && i2 < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i2 - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
          }
          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
  }
});

// node_modules/qrcode/lib/renderer/png.js
var require_png2 = __commonJS({
  "node_modules/qrcode/lib/renderer/png.js"(exports2) {
    var fs = require("fs");
    var PNG = require_png().PNG;
    var Utils = require_utils2();
    exports2.render = function render(qrData, options) {
      const opts = Utils.getOptions(options);
      const pngOpts = opts.rendererOpts;
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      pngOpts.width = size;
      pngOpts.height = size;
      const pngImage = new PNG(pngOpts);
      Utils.qrToImageData(pngImage.data, qrData, opts);
      return pngImage;
    };
    exports2.renderToDataURL = function renderToDataURL(qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      exports2.renderToBuffer(qrData, options, function(err, output) {
        if (err) cb(err);
        let url = "data:image/png;base64,";
        url += output.toString("base64");
        cb(null, url);
      });
    };
    exports2.renderToBuffer = function renderToBuffer(qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      const png = exports2.render(qrData, options);
      const buffer = [];
      png.on("error", cb);
      png.on("data", function(data) {
        buffer.push(data);
      });
      png.on("end", function() {
        cb(null, Buffer.concat(buffer));
      });
      png.pack();
    };
    exports2.renderToFile = function renderToFile(path, qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      let called = false;
      const done = (...args) => {
        if (called) return;
        called = true;
        cb.apply(null, args);
      };
      const stream2 = fs.createWriteStream(path);
      stream2.on("error", done);
      stream2.on("close", done);
      exports2.renderToFileStream(stream2, qrData, options);
    };
    exports2.renderToFileStream = function renderToFileStream(stream2, qrData, options) {
      const png = exports2.render(qrData, options);
      png.pack().pipe(stream2);
    };
  }
});

// node_modules/qrcode/lib/renderer/utf8.js
var require_utf8 = __commonJS({
  "node_modules/qrcode/lib/renderer/utf8.js"(exports2) {
    var Utils = require_utils2();
    var BLOCK_CHAR = {
      WW: " ",
      WB: "\u2584",
      BB: "\u2588",
      BW: "\u2580"
    };
    var INVERTED_BLOCK_CHAR = {
      BB: " ",
      BW: "\u2584",
      WW: "\u2588",
      WB: "\u2580"
    };
    function getBlockChar(top, bottom, blocks) {
      if (top && bottom) return blocks.BB;
      if (top && !bottom) return blocks.BW;
      if (!top && bottom) return blocks.WB;
      return blocks.WW;
    }
    exports2.render = function(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      let blocks = BLOCK_CHAR;
      if (opts.color.dark.hex === "#ffffff" || opts.color.light.hex === "#000000") {
        blocks = INVERTED_BLOCK_CHAR;
      }
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      let output = "";
      let hMargin = Array(size + opts.margin * 2 + 1).join(blocks.WW);
      hMargin = Array(opts.margin / 2 + 1).join(hMargin + "\n");
      const vMargin = Array(opts.margin + 1).join(blocks.WW);
      output += hMargin;
      for (let i2 = 0; i2 < size; i2 += 2) {
        output += vMargin;
        for (let j = 0; j < size; j++) {
          const topModule = data[i2 * size + j];
          const bottomModule = data[(i2 + 1) * size + j];
          output += getBlockChar(topModule, bottomModule, blocks);
        }
        output += vMargin + "\n";
      }
      output += hMargin.slice(0, -1);
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
    exports2.renderToFile = function renderToFile(path, qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      const fs = require("fs");
      const utf8 = exports2.render(qrData, options);
      fs.writeFile(path, utf8, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal/terminal.js
var require_terminal = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal/terminal.js"(exports2) {
    exports2.render = function(qrData, options, cb) {
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const black = "\x1B[40m  \x1B[0m";
      const white = "\x1B[47m  \x1B[0m";
      let output = "";
      const hMargin = Array(size + 3).join(white);
      const vMargin = Array(2).join(white);
      output += hMargin + "\n";
      for (let i2 = 0; i2 < size; ++i2) {
        output += white;
        for (let j = 0; j < size; j++) {
          output += data[i2 * size + j] ? black : white;
        }
        output += vMargin + "\n";
      }
      output += hMargin + "\n";
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal/terminal-small.js
var require_terminal_small = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal/terminal-small.js"(exports2) {
    var backgroundWhite = "\x1B[47m";
    var backgroundBlack = "\x1B[40m";
    var foregroundWhite = "\x1B[37m";
    var foregroundBlack = "\x1B[30m";
    var reset = "\x1B[0m";
    var lineSetupNormal = backgroundWhite + foregroundBlack;
    var lineSetupInverse = backgroundBlack + foregroundWhite;
    var createPalette = function(lineSetup, foregroundWhite2, foregroundBlack2) {
      return {
        // 1 ... white, 2 ... black, 0 ... transparent (default)
        "00": reset + " " + lineSetup,
        "01": reset + foregroundWhite2 + "\u2584" + lineSetup,
        "02": reset + foregroundBlack2 + "\u2584" + lineSetup,
        10: reset + foregroundWhite2 + "\u2580" + lineSetup,
        11: " ",
        12: "\u2584",
        20: reset + foregroundBlack2 + "\u2580" + lineSetup,
        21: "\u2580",
        22: "\u2588"
      };
    };
    var mkCodePixel = function(modules, size, x, y) {
      const sizePlus = size + 1;
      if (x >= sizePlus || y >= sizePlus || y < -1 || x < -1) return "0";
      if (x >= size || y >= size || y < 0 || x < 0) return "1";
      const idx = y * size + x;
      return modules[idx] ? "2" : "1";
    };
    var mkCode = function(modules, size, x, y) {
      return mkCodePixel(modules, size, x, y) + mkCodePixel(modules, size, x, y + 1);
    };
    exports2.render = function(qrData, options, cb) {
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const inverse = !!(options && options.inverse);
      const lineSetup = options && options.inverse ? lineSetupInverse : lineSetupNormal;
      const white = inverse ? foregroundBlack : foregroundWhite;
      const black = inverse ? foregroundWhite : foregroundBlack;
      const palette = createPalette(lineSetup, white, black);
      const newLine = reset + "\n" + lineSetup;
      let output = lineSetup;
      for (let y = -1; y < size + 1; y += 2) {
        for (let x = -1; x < size; x++) {
          output += palette[mkCode(data, size, x, y)];
        }
        output += palette[mkCode(data, size, size, y)] + newLine;
      }
      output += reset;
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal.js
var require_terminal2 = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal.js"(exports2) {
    var big = require_terminal();
    var small = require_terminal_small();
    exports2.render = function(qrData, options, cb) {
      if (options && options.small) {
        return small.render(qrData, options, cb);
      }
      return big.render(qrData, options, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS({
  "node_modules/qrcode/lib/renderer/svg-tag.js"(exports2) {
    var Utils = require_utils2();
    function getColorAttrib(color, attrib) {
      const alpha = color.a / 255;
      const str = attrib + '="' + color.hex + '"';
      return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
    }
    function svgCmd(cmd, x, y) {
      let str = cmd + x;
      if (typeof y !== "undefined") str += " " + y;
      return str;
    }
    function qrToPath(data, size, margin) {
      let path = "";
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;
      for (let i2 = 0; i2 < data.length; i2++) {
        const col = Math.floor(i2 % size);
        const row = Math.floor(i2 / size);
        if (!col && !newRow) newRow = true;
        if (data[i2]) {
          lineLength++;
          if (!(i2 > 0 && col > 0 && data[i2 - 1])) {
            path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
            moveBy = 0;
            newRow = false;
          }
          if (!(col + 1 < size && data[i2 + 1])) {
            path += svgCmd("h", lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }
      return path;
    }
    exports2.render = function render(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size + opts.margin * 2;
      const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
      const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
      const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
      const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + "</svg>\n";
      if (typeof cb === "function") {
        cb(null, svgTag);
      }
      return svgTag;
    };
  }
});

// node_modules/qrcode/lib/renderer/svg.js
var require_svg = __commonJS({
  "node_modules/qrcode/lib/renderer/svg.js"(exports2) {
    var svgTagRenderer = require_svg_tag();
    exports2.render = svgTagRenderer.render;
    exports2.renderToFile = function renderToFile(path, qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      const fs = require("fs");
      const svgTag = exports2.render(qrData, options);
      const xmlStr = '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' + svgTag;
      fs.writeFile(path, xmlStr, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/canvas.js
var require_canvas = __commonJS({
  "node_modules/qrcode/lib/renderer/canvas.js"(exports2) {
    var Utils = require_utils2();
    function clearCanvas(ctx, canvas, size) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!canvas.style) canvas.style = {};
      canvas.height = size;
      canvas.width = size;
      canvas.style.height = size + "px";
      canvas.style.width = size + "px";
    }
    function getCanvasElement() {
      try {
        return document.createElement("canvas");
      } catch (e) {
        throw new Error("You need to specify a canvas element");
      }
    }
    exports2.render = function render(qrData, canvas, options) {
      let opts = options;
      let canvasEl = canvas;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!canvas) {
        canvasEl = getCanvasElement();
      }
      opts = Utils.getOptions(opts);
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      const ctx = canvasEl.getContext("2d");
      const image = ctx.createImageData(size, size);
      Utils.qrToImageData(image.data, qrData, opts);
      clearCanvas(ctx, canvasEl, size);
      ctx.putImageData(image, 0, 0);
      return canvasEl;
    };
    exports2.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
      let opts = options;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!opts) opts = {};
      const canvasEl = exports2.render(qrData, canvas, opts);
      const type = opts.type || "image/png";
      const rendererOpts = opts.rendererOpts || {};
      return canvasEl.toDataURL(type, rendererOpts.quality);
    };
  }
});

// node_modules/qrcode/lib/browser.js
var require_browser = __commonJS({
  "node_modules/qrcode/lib/browser.js"(exports2) {
    var canPromise = require_can_promise();
    var QRCode2 = require_qrcode();
    var CanvasRenderer = require_canvas();
    var SvgRenderer = require_svg_tag();
    function renderCanvas(renderFunc, canvas, text, opts, cb) {
      const args = [].slice.call(arguments, 1);
      const argsNum = args.length;
      const isLastArgCb = typeof args[argsNum - 1] === "function";
      if (!isLastArgCb && !canPromise()) {
        throw new Error("Callback required as last argument");
      }
      if (isLastArgCb) {
        if (argsNum < 2) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 2) {
          cb = text;
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 3) {
          if (canvas.getContext && typeof cb === "undefined") {
            cb = opts;
            opts = void 0;
          } else {
            cb = opts;
            opts = text;
            text = canvas;
            canvas = void 0;
          }
        }
      } else {
        if (argsNum < 1) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 1) {
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 2 && !canvas.getContext) {
          opts = text;
          text = canvas;
          canvas = void 0;
        }
        return new Promise(function(resolve, reject) {
          try {
            const data = QRCode2.create(text, opts);
            resolve(renderFunc(data, canvas, opts));
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode2.create(text, opts);
        cb(null, renderFunc(data, canvas, opts));
      } catch (e) {
        cb(e);
      }
    }
    exports2.create = QRCode2.create;
    exports2.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
    exports2.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
    exports2.toString = renderCanvas.bind(null, function(data, _, opts) {
      return SvgRenderer.render(data, opts);
    });
  }
});

// node_modules/qrcode/lib/server.js
var require_server = __commonJS({
  "node_modules/qrcode/lib/server.js"(exports2) {
    var canPromise = require_can_promise();
    var QRCode2 = require_qrcode();
    var PngRenderer = require_png2();
    var Utf8Renderer = require_utf8();
    var TerminalRenderer = require_terminal2();
    var SvgRenderer = require_svg();
    function checkParams(text, opts, cb) {
      if (typeof text === "undefined") {
        throw new Error("String required as first argument");
      }
      if (typeof cb === "undefined") {
        cb = opts;
        opts = {};
      }
      if (typeof cb !== "function") {
        if (!canPromise()) {
          throw new Error("Callback required as last argument");
        } else {
          opts = cb || {};
          cb = null;
        }
      }
      return {
        opts,
        cb
      };
    }
    function getTypeFromFilename(path) {
      return path.slice((path.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }
    function getRendererFromType(type) {
      switch (type) {
        case "svg":
          return SvgRenderer;
        case "txt":
        case "utf8":
          return Utf8Renderer;
        case "png":
        case "image/png":
        default:
          return PngRenderer;
      }
    }
    function getStringRendererFromType(type) {
      switch (type) {
        case "svg":
          return SvgRenderer;
        case "terminal":
          return TerminalRenderer;
        case "utf8":
        default:
          return Utf8Renderer;
      }
    }
    function render(renderFunc, text, params) {
      if (!params.cb) {
        return new Promise(function(resolve, reject) {
          try {
            const data = QRCode2.create(text, params.opts);
            return renderFunc(data, params.opts, function(err, data2) {
              return err ? reject(err) : resolve(data2);
            });
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode2.create(text, params.opts);
        return renderFunc(data, params.opts, params.cb);
      } catch (e) {
        params.cb(e);
      }
    }
    exports2.create = QRCode2.create;
    exports2.toCanvas = require_browser().toCanvas;
    exports2.toString = function toString2(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const type = params.opts ? params.opts.type : void 0;
      const renderer = getStringRendererFromType(type);
      return render(renderer.render, text, params);
    };
    exports2.toDataURL = function toDataURL(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const renderer = getRendererFromType(params.opts.type);
      return render(renderer.renderToDataURL, text, params);
    };
    exports2.toBuffer = function toBuffer(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const renderer = getRendererFromType(params.opts.type);
      return render(renderer.renderToBuffer, text, params);
    };
    exports2.toFile = function toFile(path, text, opts, cb) {
      if (typeof path !== "string" || !(typeof text === "string" || typeof text === "object")) {
        throw new Error("Invalid argument");
      }
      if (arguments.length < 3 && !canPromise()) {
        throw new Error("Too few arguments provided");
      }
      const params = checkParams(text, opts, cb);
      const type = params.opts.type || getTypeFromFilename(path);
      const renderer = getRendererFromType(type);
      const renderToFile = renderer.renderToFile.bind(null, path);
      return render(renderToFile, text, params);
    };
    exports2.toFileStream = function toFileStream(stream2, text, opts) {
      if (arguments.length < 2) {
        throw new Error("Too few arguments provided");
      }
      const params = checkParams(text, opts, stream2.emit.bind(stream2, "error"));
      const renderer = getRendererFromType("png");
      const renderToFileStream = renderer.renderToFileStream.bind(null, stream2);
      render(renderToFileStream, text, params);
    };
  }
});

// node_modules/qrcode/lib/index.js
var require_lib = __commonJS({
  "node_modules/qrcode/lib/index.js"(exports2, module2) {
    module2.exports = require_server();
  }
});

// node_modules/got/dist/source/create.js
var import_promises2 = require("node:timers/promises");

// node_modules/@sindresorhus/is/distribution/utilities.js
function keysOf(value) {
  return Object.keys(value);
}

// node_modules/@sindresorhus/is/distribution/index.js
var typedArrayTypeNames = [
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array"
];
function isTypedArrayName(name) {
  return typedArrayTypeNames.includes(name);
}
var objectTypeNames = [
  "Function",
  "Generator",
  "AsyncGenerator",
  "GeneratorFunction",
  "AsyncGeneratorFunction",
  "AsyncFunction",
  "Observable",
  "Array",
  "Buffer",
  "Blob",
  "Object",
  "RegExp",
  "Date",
  "Error",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "WeakRef",
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Promise",
  "URL",
  "FormData",
  "URLSearchParams",
  "HTMLElement",
  "NaN",
  ...typedArrayTypeNames
];
function isObjectTypeName(name) {
  return objectTypeNames.includes(name);
}
var primitiveTypeNames = [
  "null",
  "undefined",
  "string",
  "number",
  "bigint",
  "boolean",
  "symbol"
];
function isPrimitiveTypeName(name) {
  return primitiveTypeNames.includes(name);
}
var assertionTypeDescriptions = [
  "bound Function",
  "positive number",
  "negative number",
  "Class",
  "string with a number",
  "null or undefined",
  "Iterable",
  "AsyncIterable",
  "native Promise",
  "EnumCase",
  "string with a URL",
  "truthy",
  "falsy",
  "primitive",
  "integer",
  "plain object",
  "TypedArray",
  "array-like",
  "tuple-like",
  "Node.js Stream",
  "infinite number",
  "empty array",
  "non-empty array",
  "empty string",
  "empty string or whitespace",
  "non-empty string",
  "non-empty string and not whitespace",
  "empty object",
  "non-empty object",
  "empty set",
  "non-empty set",
  "empty map",
  "non-empty map",
  "PropertyKey",
  "even integer",
  "finite number",
  "negative integer",
  "non-negative integer",
  "non-negative number",
  "odd integer",
  "positive integer",
  "safe integer",
  "T",
  "in range",
  "predicate returns truthy for any value",
  "predicate returns truthy for all values",
  "valid Date",
  "valid length",
  "whitespace string",
  ...objectTypeNames,
  ...primitiveTypeNames
];
var getObjectType = (value) => {
  const objectTypeName = Object.prototype.toString.call(value).slice(8, -1);
  if (new RegExp("HTML\\w+Element", "v").test(objectTypeName) && isHtmlElement(value)) {
    return "HTMLElement";
  }
  if (isObjectTypeName(objectTypeName)) {
    return objectTypeName;
  }
  return void 0;
};
function detect(value) {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "undefined": {
      return "undefined";
    }
    case "string": {
      return "string";
    }
    case "number": {
      return Number.isNaN(value) ? "NaN" : "number";
    }
    case "boolean": {
      return "boolean";
    }
    case "function": {
      return "Function";
    }
    case "bigint": {
      return "bigint";
    }
    case "symbol": {
      return "symbol";
    }
    default:
  }
  if (isObservable(value)) {
    return "Observable";
  }
  if (isArray(value)) {
    return "Array";
  }
  if (isBuffer(value)) {
    return "Buffer";
  }
  const tagType = getObjectType(value);
  if (tagType !== void 0 && tagType !== "Object") {
    return tagType;
  }
  if (hasPromiseApi(value)) {
    return "Promise";
  }
  if (isBoxedPrimitiveObject(value)) {
    throw new TypeError("Please don't use object wrappers for primitive types");
  }
  return "Object";
}
function hasPromiseApi(value) {
  return isFunction(value?.then) && isFunction(value?.catch);
}
function hasBoxedPrimitiveBrand(value, valueOf) {
  try {
    Reflect.apply(valueOf, value, []);
    return true;
  } catch {
    return false;
  }
}
function isBoxedPrimitiveObject(value) {
  return hasBoxedPrimitiveBrand(value, String.prototype.valueOf) || hasBoxedPrimitiveBrand(value, Boolean.prototype.valueOf) || hasBoxedPrimitiveBrand(value, Number.prototype.valueOf);
}
var is = Object.assign(detect, {
  all: isAll,
  any: isAny,
  array: isArray,
  arrayBuffer: isArrayBuffer,
  arrayLike: isArrayLike,
  arrayOf: isArrayOf,
  asyncFunction: isAsyncFunction,
  asyncGenerator: isAsyncGenerator,
  asyncGeneratorFunction: isAsyncGeneratorFunction,
  asyncIterable: isAsyncIterable,
  bigint: isBigint,
  bigInt64Array: isBigInt64Array,
  bigUint64Array: isBigUint64Array,
  blob: isBlob,
  boolean: isBoolean,
  boundFunction: isBoundFunction,
  buffer: isBuffer,
  class: isClass,
  dataView: isDataView,
  date: isDate,
  detect,
  directInstanceOf: isDirectInstanceOf,
  emptyArray: isEmptyArray,
  emptyMap: isEmptyMap,
  emptyObject: isEmptyObject,
  emptySet: isEmptySet,
  emptyString: isEmptyString,
  emptyStringOrWhitespace: isEmptyStringOrWhitespace,
  enumCase: isEnumCase,
  error: isError,
  evenInteger: isEvenInteger,
  falsy: isFalsy,
  finiteNumber: isFiniteNumber,
  float32Array: isFloat32Array,
  float64Array: isFloat64Array,
  formData: isFormData,
  function: isFunction,
  generator: isGenerator,
  generatorFunction: isGeneratorFunction,
  htmlElement: isHtmlElement,
  infinite: isInfinite,
  inRange: isInRange,
  int16Array: isInt16Array,
  int32Array: isInt32Array,
  int8Array: isInt8Array,
  integer: isInteger,
  iterable: isIterable,
  map: isMap,
  nan: isNan,
  nativePromise: isNativePromise,
  negativeInteger: isNegativeInteger,
  negativeNumber: isNegativeNumber,
  nodeStream: isNodeStream,
  nonEmptyArray: isNonEmptyArray,
  nonEmptyMap: isNonEmptyMap,
  nonEmptyObject: isNonEmptyObject,
  nonEmptySet: isNonEmptySet,
  nonEmptyString: isNonEmptyString,
  nonEmptyStringAndNotWhitespace: isNonEmptyStringAndNotWhitespace,
  nonNegativeInteger: isNonNegativeInteger,
  nonNegativeNumber: isNonNegativeNumber,
  null: isNull,
  nullOrUndefined: isNullOrUndefined,
  number: isNumber,
  numericString: isNumericString,
  object: isObject,
  observable: isObservable,
  oddInteger: isOddInteger,
  oneOf: isOneOf,
  plainObject: isPlainObject,
  positiveInteger: isPositiveInteger,
  positiveNumber: isPositiveNumber,
  primitive: isPrimitive,
  promise: isPromise,
  propertyKey: isPropertyKey,
  regExp: isRegExp,
  safeInteger: isSafeInteger,
  set: isSet,
  sharedArrayBuffer: isSharedArrayBuffer,
  string: isString,
  symbol: isSymbol,
  truthy: isTruthy,
  tupleLike: isTupleLike,
  typedArray: isTypedArray,
  uint16Array: isUint16Array,
  uint32Array: isUint32Array,
  uint8Array: isUint8Array,
  uint8ClampedArray: isUint8ClampedArray,
  undefined: isUndefined,
  urlInstance: isUrlInstance,
  urlSearchParams: isUrlSearchParams,
  urlString: isUrlString,
  optional: isOptional,
  validDate: isValidDate,
  validLength: isValidLength,
  weakMap: isWeakMap,
  weakRef: isWeakRef,
  weakSet: isWeakSet,
  whitespaceString: isWhitespaceString
});
function isAbsoluteModule2(remainder) {
  return (value) => isInteger(value) && Math.abs(value % 2) === remainder;
}
function validatePredicateArray(predicateArray, allowEmpty) {
  if (predicateArray.length === 0) {
    if (allowEmpty) {
    } else {
      throw new TypeError("Invalid predicate array");
    }
    return;
  }
  for (const predicate of predicateArray) {
    if (!isFunction(predicate)) {
      throw new TypeError(`Invalid predicate: ${JSON.stringify(predicate)}`);
    }
  }
}
function isAll(predicate, ...values) {
  if (Array.isArray(predicate)) {
    const predicateArray = predicate;
    validatePredicateArray(predicateArray, values.length === 0);
    const combinedPredicate = (value) => predicateArray.every((singlePredicate) => singlePredicate(value));
    if (values.length === 0) {
      return combinedPredicate;
    }
    return predicateOnArray(Array.prototype.every, combinedPredicate, values);
  }
  return predicateOnArray(Array.prototype.every, predicate, values);
}
function isAny(predicate, ...values) {
  if (Array.isArray(predicate)) {
    const predicateArray = predicate;
    validatePredicateArray(predicateArray, values.length === 0);
    const combinedPredicate = (value) => predicateArray.some((singlePredicate) => singlePredicate(value));
    if (values.length === 0) {
      return combinedPredicate;
    }
    return predicateOnArray(Array.prototype.some, combinedPredicate, values);
  }
  return predicateOnArray(Array.prototype.some, predicate, values);
}
function isOptional(value, predicate) {
  return isUndefined(value) || predicate(value);
}
function isArray(value, assertion) {
  if (!Array.isArray(value)) {
    return false;
  }
  if (!isFunction(assertion)) {
    return true;
  }
  return value.every((element) => assertion(element));
}
function isArrayBuffer(value) {
  return getObjectType(value) === "ArrayBuffer";
}
function isArrayLike(value) {
  return !isNullOrUndefined(value) && !isFunction(value) && isValidLength(value.length);
}
function isArrayOf(predicate) {
  return (value) => isArray(value) && value.every((element) => predicate(element));
}
function isAsyncFunction(value) {
  return getObjectType(value) === "AsyncFunction";
}
function isAsyncGenerator(value) {
  return isAsyncIterable(value) && isFunction(value.next) && isFunction(value.throw);
}
function isAsyncGeneratorFunction(value) {
  return getObjectType(value) === "AsyncGeneratorFunction";
}
function isAsyncIterable(value) {
  return isFunction(value?.[Symbol.asyncIterator]);
}
function isBigint(value) {
  return typeof value === "bigint";
}
function isBigInt64Array(value) {
  return getObjectType(value) === "BigInt64Array";
}
function isBigUint64Array(value) {
  return getObjectType(value) === "BigUint64Array";
}
function isBlob(value) {
  return getObjectType(value) === "Blob";
}
function isBoolean(value) {
  return value === true || value === false;
}
function isBoundFunction(value) {
  return isFunction(value) && !Object.hasOwn(value, "prototype");
}
function isBuffer(value) {
  return value?.constructor?.isBuffer?.(value) ?? false;
}
function isClass(value) {
  return isFunction(value) && new RegExp("^class(?:\\s+|\\{)", "v").test(value.toString());
}
function isDataView(value) {
  return getObjectType(value) === "DataView";
}
function isDate(value) {
  return getObjectType(value) === "Date";
}
function isDirectInstanceOf(instance, class_) {
  if (instance === void 0 || instance === null) {
    return false;
  }
  return Object.getPrototypeOf(instance) === class_.prototype;
}
function isEmptyArray(value) {
  return isArray(value) && value.length === 0;
}
function isEmptyMap(value) {
  return isMap(value) && value.size === 0;
}
function isEmptyObject(value) {
  return isObject(value) && !isFunction(value) && !isArray(value) && !isMap(value) && !isSet(value) && Object.keys(value).length === 0;
}
function isEmptySet(value) {
  return isSet(value) && value.size === 0;
}
function isEmptyString(value) {
  return isString(value) && value.length === 0;
}
function isEmptyStringOrWhitespace(value) {
  return isEmptyString(value) || isWhitespaceString(value);
}
function isEnumCase(value, targetEnum) {
  const enumObject = targetEnum;
  return Object.entries(enumObject).some(([key, enumValue]) => {
    if (!isString(enumValue)) {
      return enumValue === value;
    }
    const numericKey = Number(key);
    if (Number.isNaN(numericKey) || String(numericKey) !== key) {
      return enumValue === value;
    }
    return enumValue === value && !(Object.hasOwn(enumObject, enumValue) && enumObject[enumValue] === numericKey);
  });
}
function isError(value) {
  return getObjectType(value) === "Error";
}
function isEvenInteger(value) {
  return isAbsoluteModule2(0)(value);
}
function isFalsy(value) {
  return !value;
}
function isFiniteNumber(value) {
  return Number.isFinite(value);
}
function isFloat32Array(value) {
  return getObjectType(value) === "Float32Array";
}
function isFloat64Array(value) {
  return getObjectType(value) === "Float64Array";
}
function isFormData(value) {
  return getObjectType(value) === "FormData";
}
function isFunction(value) {
  return typeof value === "function";
}
function isGenerator(value) {
  return isIterable(value) && isFunction(value?.next) && isFunction(value?.throw);
}
function isGeneratorFunction(value) {
  return getObjectType(value) === "GeneratorFunction";
}
var NODE_TYPE_ELEMENT = 1;
var DOM_PROPERTIES_TO_CHECK = [
  "innerHTML",
  "ownerDocument",
  "style",
  "attributes",
  "nodeValue"
];
function isHtmlElement(value) {
  return isObject(value) && value.nodeType === NODE_TYPE_ELEMENT && isString(value.nodeName) && !isPlainObject(value) && DOM_PROPERTIES_TO_CHECK.every((property) => property in value);
}
function isInfinite(value) {
  return value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY;
}
function isInRange(value, range) {
  if (isNumber(range)) {
    return value >= Math.min(0, range) && value <= Math.max(range, 0);
  }
  if (isArray(range) && range.length === 2) {
    if (Number.isNaN(range[0]) || Number.isNaN(range[1])) {
      throw new TypeError(`Invalid range: ${JSON.stringify(range)}`);
    }
    return value >= Math.min(...range) && value <= Math.max(...range);
  }
  throw new TypeError(`Invalid range: ${JSON.stringify(range)}`);
}
function isInt16Array(value) {
  return getObjectType(value) === "Int16Array";
}
function isInt32Array(value) {
  return getObjectType(value) === "Int32Array";
}
function isInt8Array(value) {
  return getObjectType(value) === "Int8Array";
}
function isInteger(value) {
  return Number.isInteger(value);
}
function isIterable(value) {
  return isFunction(value?.[Symbol.iterator]);
}
function isMap(value) {
  return getObjectType(value) === "Map";
}
function isNan(value) {
  return Number.isNaN(value);
}
function isNativePromise(value) {
  return getObjectType(value) === "Promise";
}
function isNegativeInteger(value) {
  return isInteger(value) && value < 0;
}
function isNegativeNumber(value) {
  return isNumber(value) && value < 0;
}
function isNodeStream(value) {
  return isObject(value) && isFunction(value.pipe) && !isObservable(value);
}
function isNonEmptyArray(value) {
  return isArray(value) && value.length > 0;
}
function isNonEmptyMap(value) {
  return isMap(value) && value.size > 0;
}
function isNonEmptyObject(value) {
  return isObject(value) && !isFunction(value) && !isArray(value) && !isMap(value) && !isSet(value) && Object.keys(value).length > 0;
}
function isNonEmptySet(value) {
  return isSet(value) && value.size > 0;
}
function isNonEmptyString(value) {
  return isString(value) && value.length > 0;
}
function isNonEmptyStringAndNotWhitespace(value) {
  return isString(value) && !isEmptyStringOrWhitespace(value);
}
function isNonNegativeInteger(value) {
  return isInteger(value) && value >= 0;
}
function isNonNegativeNumber(value) {
  return isNumber(value) && value >= 0;
}
function isNull(value) {
  return value === null;
}
function isNullOrUndefined(value) {
  return isNull(value) || isUndefined(value);
}
function isNumber(value) {
  return typeof value === "number" && !Number.isNaN(value);
}
function isNumericString(value) {
  return isString(value) && !isEmptyStringOrWhitespace(value) && value === value.trim() && !Number.isNaN(Number(value));
}
function isObject(value) {
  return !isNull(value) && (typeof value === "object" || isFunction(value));
}
function isObservable(value) {
  if (!value) {
    return false;
  }
  if (Symbol.observable !== void 0 && value === value[Symbol.observable]?.()) {
    return true;
  }
  if (value === value["@@observable"]?.()) {
    return true;
  }
  return false;
}
function isOddInteger(value) {
  return isAbsoluteModule2(1)(value);
}
function isOneOf(values) {
  return (value) => values.includes(value);
}
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
}
function isPositiveInteger(value) {
  return isInteger(value) && value > 0;
}
function isPositiveNumber(value) {
  return isNumber(value) && value > 0;
}
function isPrimitive(value) {
  return isNull(value) || isPrimitiveTypeName(typeof value);
}
function isPromise(value) {
  return isNativePromise(value) || hasPromiseApi(value);
}
function isPropertyKey(value) {
  return isAny([isString, isNumber, isSymbol], value);
}
function isRegExp(value) {
  return getObjectType(value) === "RegExp";
}
function isSafeInteger(value) {
  return Number.isSafeInteger(value);
}
function isSet(value) {
  return getObjectType(value) === "Set";
}
function isSharedArrayBuffer(value) {
  return getObjectType(value) === "SharedArrayBuffer";
}
function isString(value) {
  return typeof value === "string";
}
function isSymbol(value) {
  return typeof value === "symbol";
}
function isTruthy(value) {
  return Boolean(value);
}
function isTupleLike(value, guards) {
  if (isArray(guards) && isArray(value) && guards.length === value.length) {
    return guards.every((guard, index) => guard(value[index]));
  }
  return false;
}
function isTypedArray(value) {
  return isTypedArrayName(getObjectType(value));
}
function isUint16Array(value) {
  return getObjectType(value) === "Uint16Array";
}
function isUint32Array(value) {
  return getObjectType(value) === "Uint32Array";
}
function isUint8Array(value) {
  return getObjectType(value) === "Uint8Array";
}
function isUint8ClampedArray(value) {
  return getObjectType(value) === "Uint8ClampedArray";
}
function isUndefined(value) {
  return value === void 0;
}
function isUrlInstance(value) {
  return getObjectType(value) === "URL";
}
function isUrlSearchParams(value) {
  return getObjectType(value) === "URLSearchParams";
}
function isUrlString(value) {
  if (!isString(value)) {
    return false;
  }
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
function isValidDate(value) {
  return isDate(value) && !isNan(Number(value));
}
function isValidLength(value) {
  return isSafeInteger(value) && value >= 0;
}
function isWeakMap(value) {
  return getObjectType(value) === "WeakMap";
}
function isWeakRef(value) {
  return getObjectType(value) === "WeakRef";
}
function isWeakSet(value) {
  return getObjectType(value) === "WeakSet";
}
function isWhitespaceString(value) {
  return isString(value) && new RegExp("^\\s+$", "v").test(value);
}
function predicateOnArray(method, predicate, values) {
  if (!isFunction(predicate)) {
    throw new TypeError(`Invalid predicate: ${JSON.stringify(predicate)}`);
  }
  if (values.length === 0) {
    throw new TypeError("Invalid number of values");
  }
  return method.call(values, predicate);
}
function typeErrorMessage(description, value) {
  return `Expected value which is \`${description}\`, received value of type \`${is(value)}\`.`;
}
function unique(values) {
  return Array.from(new Set(values));
}
var andFormatter = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
var orFormatter = new Intl.ListFormat("en", { style: "long", type: "disjunction" });
function typeErrorMessageMultipleValues(expectedType, values) {
  const uniqueExpectedTypes = unique((isArray(expectedType) ? expectedType : [expectedType]).map((value) => `\`${value}\``));
  const uniqueValueTypes = unique(values.map((value) => `\`${is(value)}\``));
  return `Expected values which are ${orFormatter.format(uniqueExpectedTypes)}. Received values of type${uniqueValueTypes.length > 1 ? "s" : ""} ${andFormatter.format(uniqueValueTypes)}.`;
}
var assert = {
  all: assertAll,
  any: assertAny,
  optional: assertOptional,
  array: assertArray,
  arrayBuffer: assertArrayBuffer,
  arrayLike: assertArrayLike,
  asyncFunction: assertAsyncFunction,
  asyncGenerator: assertAsyncGenerator,
  asyncGeneratorFunction: assertAsyncGeneratorFunction,
  asyncIterable: assertAsyncIterable,
  bigint: assertBigint,
  bigInt64Array: assertBigInt64Array,
  bigUint64Array: assertBigUint64Array,
  blob: assertBlob,
  boolean: assertBoolean,
  boundFunction: assertBoundFunction,
  buffer: assertBuffer,
  class: assertClass,
  dataView: assertDataView,
  date: assertDate,
  directInstanceOf: assertDirectInstanceOf,
  emptyArray: assertEmptyArray,
  emptyMap: assertEmptyMap,
  emptyObject: assertEmptyObject,
  emptySet: assertEmptySet,
  emptyString: assertEmptyString,
  emptyStringOrWhitespace: assertEmptyStringOrWhitespace,
  enumCase: assertEnumCase,
  error: assertError,
  evenInteger: assertEvenInteger,
  falsy: assertFalsy,
  finiteNumber: assertFiniteNumber,
  float32Array: assertFloat32Array,
  float64Array: assertFloat64Array,
  formData: assertFormData,
  function: assertFunction,
  generator: assertGenerator,
  generatorFunction: assertGeneratorFunction,
  htmlElement: assertHtmlElement,
  infinite: assertInfinite,
  inRange: assertInRange,
  int16Array: assertInt16Array,
  int32Array: assertInt32Array,
  int8Array: assertInt8Array,
  integer: assertInteger,
  iterable: assertIterable,
  map: assertMap,
  nan: assertNan,
  nativePromise: assertNativePromise,
  negativeInteger: assertNegativeInteger,
  negativeNumber: assertNegativeNumber,
  nodeStream: assertNodeStream,
  nonEmptyArray: assertNonEmptyArray,
  nonEmptyMap: assertNonEmptyMap,
  nonEmptyObject: assertNonEmptyObject,
  nonEmptySet: assertNonEmptySet,
  nonEmptyString: assertNonEmptyString,
  nonEmptyStringAndNotWhitespace: assertNonEmptyStringAndNotWhitespace,
  nonNegativeInteger: assertNonNegativeInteger,
  nonNegativeNumber: assertNonNegativeNumber,
  null: assertNull,
  nullOrUndefined: assertNullOrUndefined,
  number: assertNumber,
  numericString: assertNumericString,
  object: assertObject,
  observable: assertObservable,
  oddInteger: assertOddInteger,
  plainObject: assertPlainObject,
  positiveInteger: assertPositiveInteger,
  positiveNumber: assertPositiveNumber,
  primitive: assertPrimitive,
  promise: assertPromise,
  propertyKey: assertPropertyKey,
  regExp: assertRegExp,
  safeInteger: assertSafeInteger,
  set: assertSet,
  sharedArrayBuffer: assertSharedArrayBuffer,
  string: assertString,
  symbol: assertSymbol,
  truthy: assertTruthy,
  tupleLike: assertTupleLike,
  typedArray: assertTypedArray,
  uint16Array: assertUint16Array,
  uint32Array: assertUint32Array,
  uint8Array: assertUint8Array,
  uint8ClampedArray: assertUint8ClampedArray,
  undefined: assertUndefined,
  urlInstance: assertUrlInstance,
  urlSearchParams: assertUrlSearchParams,
  urlString: assertUrlString,
  validDate: assertValidDate,
  validLength: assertValidLength,
  weakMap: assertWeakMap,
  weakRef: assertWeakRef,
  weakSet: assertWeakSet,
  whitespaceString: assertWhitespaceString
};
var methodTypeMap = {
  isArray: "Array",
  isArrayBuffer: "ArrayBuffer",
  isArrayLike: "array-like",
  isAsyncFunction: "AsyncFunction",
  isAsyncGenerator: "AsyncGenerator",
  isAsyncGeneratorFunction: "AsyncGeneratorFunction",
  isAsyncIterable: "AsyncIterable",
  isBigint: "bigint",
  isBigInt64Array: "BigInt64Array",
  isBigUint64Array: "BigUint64Array",
  isBlob: "Blob",
  isBoolean: "boolean",
  isBoundFunction: "bound Function",
  isBuffer: "Buffer",
  isClass: "Class",
  isDataView: "DataView",
  isDate: "Date",
  isDirectInstanceOf: "T",
  isEmptyArray: "empty array",
  isEmptyMap: "empty map",
  isEmptyObject: "empty object",
  isEmptySet: "empty set",
  isEmptyString: "empty string",
  isEmptyStringOrWhitespace: "empty string or whitespace",
  isEnumCase: "EnumCase",
  isError: "Error",
  isEvenInteger: "even integer",
  isFalsy: "falsy",
  isFiniteNumber: "finite number",
  isFloat32Array: "Float32Array",
  isFloat64Array: "Float64Array",
  isFormData: "FormData",
  isFunction: "Function",
  isGenerator: "Generator",
  isGeneratorFunction: "GeneratorFunction",
  isHtmlElement: "HTMLElement",
  isInfinite: "infinite number",
  isInRange: "in range",
  isInt16Array: "Int16Array",
  isInt32Array: "Int32Array",
  isInt8Array: "Int8Array",
  isInteger: "integer",
  isIterable: "Iterable",
  isMap: "Map",
  isNan: "NaN",
  isNativePromise: "native Promise",
  isNegativeInteger: "negative integer",
  isNegativeNumber: "negative number",
  isNodeStream: "Node.js Stream",
  isNonEmptyArray: "non-empty array",
  isNonEmptyMap: "non-empty map",
  isNonEmptyObject: "non-empty object",
  isNonEmptySet: "non-empty set",
  isNonEmptyString: "non-empty string",
  isNonEmptyStringAndNotWhitespace: "non-empty string and not whitespace",
  isNonNegativeInteger: "non-negative integer",
  isNonNegativeNumber: "non-negative number",
  isNull: "null",
  isNullOrUndefined: "null or undefined",
  isNumber: "number",
  isNumericString: "string with a number",
  isObject: "Object",
  isObservable: "Observable",
  isOddInteger: "odd integer",
  isPlainObject: "plain object",
  isPositiveInteger: "positive integer",
  isPositiveNumber: "positive number",
  isPrimitive: "primitive",
  isPromise: "Promise",
  isPropertyKey: "PropertyKey",
  isRegExp: "RegExp",
  isSafeInteger: "safe integer",
  isSet: "Set",
  isSharedArrayBuffer: "SharedArrayBuffer",
  isString: "string",
  isSymbol: "symbol",
  isTruthy: "truthy",
  isTupleLike: "tuple-like",
  isTypedArray: "TypedArray",
  isUint16Array: "Uint16Array",
  isUint32Array: "Uint32Array",
  isUint8Array: "Uint8Array",
  isUint8ClampedArray: "Uint8ClampedArray",
  isUndefined: "undefined",
  isUrlInstance: "URL",
  isUrlSearchParams: "URLSearchParams",
  isUrlString: "string with a URL",
  isValidDate: "valid Date",
  isValidLength: "valid length",
  isWeakMap: "WeakMap",
  isWeakRef: "WeakRef",
  isWeakSet: "WeakSet",
  isWhitespaceString: "whitespace string"
};
var isMethodNames = keysOf(methodTypeMap);
function isIsMethodName(value) {
  return isMethodNames.includes(value);
}
function assertAll(predicate, ...values) {
  if (values.length === 0) {
    throw new TypeError("Invalid number of values");
  }
  if (!isAll(predicate, ...values)) {
    const predicateFunction = predicate;
    const expectedType = !Array.isArray(predicate) && isIsMethodName(predicateFunction.name) ? methodTypeMap[predicateFunction.name] : "predicate returns truthy for all values";
    throw new TypeError(typeErrorMessageMultipleValues(expectedType, values));
  }
}
function assertAny(predicate, ...values) {
  if (values.length === 0) {
    throw new TypeError("Invalid number of values");
  }
  if (!isAny(predicate, ...values)) {
    const predicates = Array.isArray(predicate) ? predicate : [predicate];
    const expectedTypes = predicates.map((singlePredicate) => isIsMethodName(singlePredicate.name) ? methodTypeMap[singlePredicate.name] : "predicate returns truthy for any value");
    throw new TypeError(typeErrorMessageMultipleValues(expectedTypes, values));
  }
}
function assertOptional(value, assertion, message) {
  if (!isUndefined(value)) {
    assertion(value, message);
  }
}
function assertArray(value, assertion, message) {
  if (!isArray(value)) {
    throw new TypeError(message ?? typeErrorMessage("Array", value));
  }
  if (assertion) {
    for (const element of value) {
      assertion(element, message);
    }
  }
}
function assertArrayBuffer(value, message) {
  if (!isArrayBuffer(value)) {
    throw new TypeError(message ?? typeErrorMessage("ArrayBuffer", value));
  }
}
function assertArrayLike(value, message) {
  if (!isArrayLike(value)) {
    throw new TypeError(message ?? typeErrorMessage("array-like", value));
  }
}
function assertAsyncFunction(value, message) {
  if (!isAsyncFunction(value)) {
    throw new TypeError(message ?? typeErrorMessage("AsyncFunction", value));
  }
}
function assertAsyncGenerator(value, message) {
  if (!isAsyncGenerator(value)) {
    throw new TypeError(message ?? typeErrorMessage("AsyncGenerator", value));
  }
}
function assertAsyncGeneratorFunction(value, message) {
  if (!isAsyncGeneratorFunction(value)) {
    throw new TypeError(message ?? typeErrorMessage("AsyncGeneratorFunction", value));
  }
}
function assertAsyncIterable(value, message) {
  if (!isAsyncIterable(value)) {
    throw new TypeError(message ?? typeErrorMessage("AsyncIterable", value));
  }
}
function assertBigint(value, message) {
  if (!isBigint(value)) {
    throw new TypeError(message ?? typeErrorMessage("bigint", value));
  }
}
function assertBigInt64Array(value, message) {
  if (!isBigInt64Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("BigInt64Array", value));
  }
}
function assertBigUint64Array(value, message) {
  if (!isBigUint64Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("BigUint64Array", value));
  }
}
function assertBlob(value, message) {
  if (!isBlob(value)) {
    throw new TypeError(message ?? typeErrorMessage("Blob", value));
  }
}
function assertBoolean(value, message) {
  if (!isBoolean(value)) {
    throw new TypeError(message ?? typeErrorMessage("boolean", value));
  }
}
function assertBoundFunction(value, message) {
  if (!isBoundFunction(value)) {
    throw new TypeError(message ?? typeErrorMessage("bound Function", value));
  }
}
function assertBuffer(value, message) {
  if (!isBuffer(value)) {
    throw new TypeError(message ?? typeErrorMessage("Buffer", value));
  }
}
function assertClass(value, message) {
  if (!isClass(value)) {
    throw new TypeError(message ?? typeErrorMessage("Class", value));
  }
}
function assertDataView(value, message) {
  if (!isDataView(value)) {
    throw new TypeError(message ?? typeErrorMessage("DataView", value));
  }
}
function assertDate(value, message) {
  if (!isDate(value)) {
    throw new TypeError(message ?? typeErrorMessage("Date", value));
  }
}
function assertDirectInstanceOf(instance, class_, message) {
  if (!isDirectInstanceOf(instance, class_)) {
    throw new TypeError(message ?? typeErrorMessage("T", instance));
  }
}
function assertEmptyArray(value, message) {
  if (!isEmptyArray(value)) {
    throw new TypeError(message ?? typeErrorMessage("empty array", value));
  }
}
function assertEmptyMap(value, message) {
  if (!isEmptyMap(value)) {
    throw new TypeError(message ?? typeErrorMessage("empty map", value));
  }
}
function assertEmptyObject(value, message) {
  if (!isEmptyObject(value)) {
    throw new TypeError(message ?? typeErrorMessage("empty object", value));
  }
}
function assertEmptySet(value, message) {
  if (!isEmptySet(value)) {
    throw new TypeError(message ?? typeErrorMessage("empty set", value));
  }
}
function assertEmptyString(value, message) {
  if (!isEmptyString(value)) {
    throw new TypeError(message ?? typeErrorMessage("empty string", value));
  }
}
function assertEmptyStringOrWhitespace(value, message) {
  if (!isEmptyStringOrWhitespace(value)) {
    throw new TypeError(message ?? typeErrorMessage("empty string or whitespace", value));
  }
}
function assertEnumCase(value, targetEnum, message) {
  if (!isEnumCase(value, targetEnum)) {
    throw new TypeError(message ?? typeErrorMessage("EnumCase", value));
  }
}
function assertError(value, message) {
  if (!isError(value)) {
    throw new TypeError(message ?? typeErrorMessage("Error", value));
  }
}
function assertEvenInteger(value, message) {
  if (!isEvenInteger(value)) {
    throw new TypeError(message ?? typeErrorMessage("even integer", value));
  }
}
function assertFalsy(value, message) {
  if (!isFalsy(value)) {
    throw new TypeError(message ?? typeErrorMessage("falsy", value));
  }
}
function assertFiniteNumber(value, message) {
  if (!isFiniteNumber(value)) {
    throw new TypeError(message ?? typeErrorMessage("finite number", value));
  }
}
function assertFloat32Array(value, message) {
  if (!isFloat32Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("Float32Array", value));
  }
}
function assertFloat64Array(value, message) {
  if (!isFloat64Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("Float64Array", value));
  }
}
function assertFormData(value, message) {
  if (!isFormData(value)) {
    throw new TypeError(message ?? typeErrorMessage("FormData", value));
  }
}
function assertFunction(value, message) {
  if (!isFunction(value)) {
    throw new TypeError(message ?? typeErrorMessage("Function", value));
  }
}
function assertGenerator(value, message) {
  if (!isGenerator(value)) {
    throw new TypeError(message ?? typeErrorMessage("Generator", value));
  }
}
function assertGeneratorFunction(value, message) {
  if (!isGeneratorFunction(value)) {
    throw new TypeError(message ?? typeErrorMessage("GeneratorFunction", value));
  }
}
function assertHtmlElement(value, message) {
  if (!isHtmlElement(value)) {
    throw new TypeError(message ?? typeErrorMessage("HTMLElement", value));
  }
}
function assertInfinite(value, message) {
  if (!isInfinite(value)) {
    throw new TypeError(message ?? typeErrorMessage("infinite number", value));
  }
}
function assertInRange(value, range, message) {
  if (!isInRange(value, range)) {
    throw new TypeError(message ?? typeErrorMessage("in range", value));
  }
}
function assertInt16Array(value, message) {
  if (!isInt16Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("Int16Array", value));
  }
}
function assertInt32Array(value, message) {
  if (!isInt32Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("Int32Array", value));
  }
}
function assertInt8Array(value, message) {
  if (!isInt8Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("Int8Array", value));
  }
}
function assertInteger(value, message) {
  if (!isInteger(value)) {
    throw new TypeError(message ?? typeErrorMessage("integer", value));
  }
}
function assertIterable(value, message) {
  if (!isIterable(value)) {
    throw new TypeError(message ?? typeErrorMessage("Iterable", value));
  }
}
function assertMap(value, message) {
  if (!isMap(value)) {
    throw new TypeError(message ?? typeErrorMessage("Map", value));
  }
}
function assertNan(value, message) {
  if (!isNan(value)) {
    throw new TypeError(message ?? typeErrorMessage("NaN", value));
  }
}
function assertNativePromise(value, message) {
  if (!isNativePromise(value)) {
    throw new TypeError(message ?? typeErrorMessage("native Promise", value));
  }
}
function assertNegativeInteger(value, message) {
  if (!isNegativeInteger(value)) {
    throw new TypeError(message ?? typeErrorMessage("negative integer", value));
  }
}
function assertNegativeNumber(value, message) {
  if (!isNegativeNumber(value)) {
    throw new TypeError(message ?? typeErrorMessage("negative number", value));
  }
}
function assertNodeStream(value, message) {
  if (!isNodeStream(value)) {
    throw new TypeError(message ?? typeErrorMessage("Node.js Stream", value));
  }
}
function assertNonEmptyArray(value, message) {
  if (!isNonEmptyArray(value)) {
    throw new TypeError(message ?? typeErrorMessage("non-empty array", value));
  }
}
function assertNonEmptyMap(value, message) {
  if (!isNonEmptyMap(value)) {
    throw new TypeError(message ?? typeErrorMessage("non-empty map", value));
  }
}
function assertNonEmptyObject(value, message) {
  if (!isNonEmptyObject(value)) {
    throw new TypeError(message ?? typeErrorMessage("non-empty object", value));
  }
}
function assertNonEmptySet(value, message) {
  if (!isNonEmptySet(value)) {
    throw new TypeError(message ?? typeErrorMessage("non-empty set", value));
  }
}
function assertNonEmptyString(value, message) {
  if (!isNonEmptyString(value)) {
    throw new TypeError(message ?? typeErrorMessage("non-empty string", value));
  }
}
function assertNonEmptyStringAndNotWhitespace(value, message) {
  if (!isNonEmptyStringAndNotWhitespace(value)) {
    throw new TypeError(message ?? typeErrorMessage("non-empty string and not whitespace", value));
  }
}
function assertNonNegativeInteger(value, message) {
  if (!isNonNegativeInteger(value)) {
    throw new TypeError(message ?? typeErrorMessage("non-negative integer", value));
  }
}
function assertNonNegativeNumber(value, message) {
  if (!isNonNegativeNumber(value)) {
    throw new TypeError(message ?? typeErrorMessage("non-negative number", value));
  }
}
function assertNull(value, message) {
  if (!isNull(value)) {
    throw new TypeError(message ?? typeErrorMessage("null", value));
  }
}
function assertNullOrUndefined(value, message) {
  if (!isNullOrUndefined(value)) {
    throw new TypeError(message ?? typeErrorMessage("null or undefined", value));
  }
}
function assertNumber(value, message) {
  if (!isNumber(value)) {
    throw new TypeError(message ?? typeErrorMessage("number", value));
  }
}
function assertNumericString(value, message) {
  if (!isNumericString(value)) {
    throw new TypeError(message ?? typeErrorMessage("string with a number", value));
  }
}
function assertObject(value, message) {
  if (!isObject(value)) {
    throw new TypeError(message ?? typeErrorMessage("Object", value));
  }
}
function assertObservable(value, message) {
  if (!isObservable(value)) {
    throw new TypeError(message ?? typeErrorMessage("Observable", value));
  }
}
function assertOddInteger(value, message) {
  if (!isOddInteger(value)) {
    throw new TypeError(message ?? typeErrorMessage("odd integer", value));
  }
}
function assertPlainObject(value, message) {
  if (!isPlainObject(value)) {
    throw new TypeError(message ?? typeErrorMessage("plain object", value));
  }
}
function assertPositiveInteger(value, message) {
  if (!isPositiveInteger(value)) {
    throw new TypeError(message ?? typeErrorMessage("positive integer", value));
  }
}
function assertPositiveNumber(value, message) {
  if (!isPositiveNumber(value)) {
    throw new TypeError(message ?? typeErrorMessage("positive number", value));
  }
}
function assertPrimitive(value, message) {
  if (!isPrimitive(value)) {
    throw new TypeError(message ?? typeErrorMessage("primitive", value));
  }
}
function assertPromise(value, message) {
  if (!isPromise(value)) {
    throw new TypeError(message ?? typeErrorMessage("Promise", value));
  }
}
function assertPropertyKey(value, message) {
  if (!isPropertyKey(value)) {
    throw new TypeError(message ?? typeErrorMessage("PropertyKey", value));
  }
}
function assertRegExp(value, message) {
  if (!isRegExp(value)) {
    throw new TypeError(message ?? typeErrorMessage("RegExp", value));
  }
}
function assertSafeInteger(value, message) {
  if (!isSafeInteger(value)) {
    throw new TypeError(message ?? typeErrorMessage("safe integer", value));
  }
}
function assertSet(value, message) {
  if (!isSet(value)) {
    throw new TypeError(message ?? typeErrorMessage("Set", value));
  }
}
function assertSharedArrayBuffer(value, message) {
  if (!isSharedArrayBuffer(value)) {
    throw new TypeError(message ?? typeErrorMessage("SharedArrayBuffer", value));
  }
}
function assertString(value, message) {
  if (!isString(value)) {
    throw new TypeError(message ?? typeErrorMessage("string", value));
  }
}
function assertSymbol(value, message) {
  if (!isSymbol(value)) {
    throw new TypeError(message ?? typeErrorMessage("symbol", value));
  }
}
function assertTruthy(value, message) {
  if (!isTruthy(value)) {
    throw new TypeError(message ?? typeErrorMessage("truthy", value));
  }
}
function assertTupleLike(value, guards, message) {
  if (!isTupleLike(value, guards)) {
    throw new TypeError(message ?? typeErrorMessage("tuple-like", value));
  }
}
function assertTypedArray(value, message) {
  if (!isTypedArray(value)) {
    throw new TypeError(message ?? typeErrorMessage("TypedArray", value));
  }
}
function assertUint16Array(value, message) {
  if (!isUint16Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("Uint16Array", value));
  }
}
function assertUint32Array(value, message) {
  if (!isUint32Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("Uint32Array", value));
  }
}
function assertUint8Array(value, message) {
  if (!isUint8Array(value)) {
    throw new TypeError(message ?? typeErrorMessage("Uint8Array", value));
  }
}
function assertUint8ClampedArray(value, message) {
  if (!isUint8ClampedArray(value)) {
    throw new TypeError(message ?? typeErrorMessage("Uint8ClampedArray", value));
  }
}
function assertUndefined(value, message) {
  if (!isUndefined(value)) {
    throw new TypeError(message ?? typeErrorMessage("undefined", value));
  }
}
function assertUrlInstance(value, message) {
  if (!isUrlInstance(value)) {
    throw new TypeError(message ?? typeErrorMessage("URL", value));
  }
}
function assertUrlSearchParams(value, message) {
  if (!isUrlSearchParams(value)) {
    throw new TypeError(message ?? typeErrorMessage("URLSearchParams", value));
  }
}
function assertUrlString(value, message) {
  if (!isUrlString(value)) {
    throw new TypeError(message ?? typeErrorMessage("string with a URL", value));
  }
}
function assertValidDate(value, message) {
  if (!isValidDate(value)) {
    throw new TypeError(message ?? typeErrorMessage("valid Date", value));
  }
}
function assertValidLength(value, message) {
  if (!isValidLength(value)) {
    throw new TypeError(message ?? typeErrorMessage("valid length", value));
  }
}
function assertWeakMap(value, message) {
  if (!isWeakMap(value)) {
    throw new TypeError(message ?? typeErrorMessage("WeakMap", value));
  }
}
function assertWeakRef(value, message) {
  if (!isWeakRef(value)) {
    throw new TypeError(message ?? typeErrorMessage("WeakRef", value));
  }
}
function assertWeakSet(value, message) {
  if (!isWeakSet(value)) {
    throw new TypeError(message ?? typeErrorMessage("WeakSet", value));
  }
}
function assertWhitespaceString(value, message) {
  if (!isWhitespaceString(value)) {
    throw new TypeError(message ?? typeErrorMessage("whitespace string", value));
  }
}
var distribution_default = is;

// node_modules/got/dist/source/as-promise/index.js
var import_node_events5 = require("node:events");

// node_modules/got/dist/source/core/utils/strip-url-auth.js
function stripUrlAuth(url) {
  const sanitized = new URL(url);
  sanitized.username = "";
  sanitized.password = "";
  return sanitized.toString();
}

// node_modules/got/dist/source/core/errors.js
function isRequest(x) {
  return distribution_default.object(x) && "_onResponse" in x;
}
var RequestError = class extends Error {
  name = "RequestError";
  code = "ERR_GOT_REQUEST_ERROR";
  input;
  stack;
  response;
  request;
  timings;
  constructor(message, error, self) {
    super(message, { cause: error });
    Error.captureStackTrace(this, this.constructor);
    if (error.code) {
      this.code = error.code;
    }
    this.input = error.input;
    if (isRequest(self)) {
      Object.defineProperty(this, "request", {
        enumerable: false,
        value: self
      });
      Object.defineProperty(this, "response", {
        enumerable: false,
        value: self.response
      });
      this.options = self.options;
    } else {
      this.options = self;
    }
    this.timings = this.request?.timings;
    if (distribution_default.string(error.stack) && distribution_default.string(this.stack)) {
      const indexOfMessage = this.stack.indexOf(this.message) + this.message.length;
      const thisStackTrace = this.stack.slice(indexOfMessage).split("\n").toReversed();
      const errorStackTrace = error.stack.slice(error.stack.indexOf(error.message) + error.message.length).split("\n").toReversed();
      while (errorStackTrace.length > 0 && errorStackTrace[0] === thisStackTrace[0]) {
        thisStackTrace.shift();
      }
      this.stack = `${this.stack.slice(0, indexOfMessage)}${thisStackTrace.toReversed().join("\n")}${errorStackTrace.toReversed().join("\n")}`;
    }
  }
};
var MaxRedirectsError = class extends RequestError {
  name = "MaxRedirectsError";
  code = "ERR_TOO_MANY_REDIRECTS";
  constructor(request) {
    super(`Redirected ${request.options.maxRedirects} times. Aborting.`, {}, request);
  }
};
var HTTPError = class extends RequestError {
  name = "HTTPError";
  code = "ERR_NON_2XX_3XX_RESPONSE";
  constructor(response) {
    super(`Request failed with status code ${response.statusCode} (${response.statusMessage}): ${response.request.options.method} ${stripUrlAuth(response.request.options.url)}`, {}, response.request);
  }
};
var CacheError = class extends RequestError {
  name = "CacheError";
  constructor(error, request) {
    super(error.message, error, request);
    this.code = "ERR_CACHE_ACCESS";
  }
};
var UploadError = class extends RequestError {
  name = "UploadError";
  constructor(error, request) {
    super(error.message, error, request);
    this.code = "ERR_UPLOAD";
  }
};
var TimeoutError = class extends RequestError {
  name = "TimeoutError";
  timings;
  event;
  constructor(error, timings, request) {
    super(error.message, error, request);
    this.event = error.event;
    this.timings = timings;
  }
};
var ReadError = class extends RequestError {
  name = "ReadError";
  code = "ERR_READING_RESPONSE_STREAM";
  constructor(error, request) {
    super(error.message, error, request);
    if (error.code === "ECONNRESET" || error.code === "ERR_HTTP_CONTENT_LENGTH_MISMATCH") {
      this.code = error.code;
    }
  }
};
var RetryError = class extends RequestError {
  name = "RetryError";
  code = "ERR_RETRYING";
  constructor(request) {
    super("Retrying", {}, request);
  }
};
var AbortError = class extends RequestError {
  name = "AbortError";
  code = "ERR_ABORTED";
  constructor(request) {
    super("This operation was aborted.", {}, request);
  }
};

// node_modules/got/dist/source/core/index.js
var import_node_process2 = __toESM(require("node:process"), 1);
var import_node_buffer2 = require("node:buffer");
var import_node_stream4 = require("node:stream");
var import_node_events4 = require("node:events");
var import_node_http2 = __toESM(require("node:http"), 1);

// node_modules/byte-counter/utilities.js
var textEncoder = new TextEncoder();
function byteLength(data) {
  if (typeof data === "string") {
    return textEncoder.encode(data).byteLength;
  }
  if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer || data instanceof SharedArrayBuffer) {
    return data.byteLength;
  }
  return 0;
}

// node_modules/chunk-data/index.js
var toUint8Array = (data) => data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
function* chunk(data, chunkSize) {
  if (!ArrayBuffer.isView(data)) {
    throw new TypeError("Expected data to be ArrayBufferView");
  }
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new TypeError("Expected chunkSize to be a positive integer");
  }
  const uint8Array = toUint8Array(data);
  for (let offset = 0; offset < uint8Array.length; offset += chunkSize) {
    yield uint8Array.subarray(offset, offset + chunkSize);
  }
}

// node_modules/uint8array-extras/index.js
var objectToString = Object.prototype.toString;
var uint8ArrayStringified = "[object Uint8Array]";
function isType(value, typeConstructor, typeStringified) {
  if (!value) {
    return false;
  }
  if (value.constructor === typeConstructor) {
    return true;
  }
  return objectToString.call(value) === typeStringified;
}
function isUint8Array2(value) {
  return isType(value, Uint8Array, uint8ArrayStringified);
}
function assertUint8Array2(value) {
  if (!isUint8Array2(value)) {
    throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof value}\``);
  }
}
function concatUint8Arrays(arrays, totalLength) {
  if (arrays.length === 0) {
    return new Uint8Array(0);
  }
  totalLength ??= arrays.reduce((accumulator, currentValue) => accumulator + currentValue.length, 0);
  const returnValue = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of arrays) {
    assertUint8Array2(array);
    returnValue.set(array, offset);
    offset += array.length;
  }
  return returnValue;
}
var cachedDecoders = {
  utf8: new globalThis.TextDecoder("utf8")
};
function assertString2(value) {
  if (typeof value !== "string") {
    throw new TypeError(`Expected \`string\`, got \`${typeof value}\``);
  }
}
var cachedEncoder = new globalThis.TextEncoder();
function stringToUint8Array(string) {
  assertString2(string);
  return cachedEncoder.encode(string);
}
function base64ToBase64Url(base64) {
  return base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
var MAX_BLOCK_SIZE = 65535;
function uint8ArrayToBase64(array, { urlSafe = false } = {}) {
  assertUint8Array2(array);
  let base64 = "";
  for (let index = 0; index < array.length; index += MAX_BLOCK_SIZE) {
    const chunk2 = array.subarray(index, index + MAX_BLOCK_SIZE);
    base64 += globalThis.btoa(String.fromCodePoint.apply(void 0, chunk2));
  }
  return urlSafe ? base64ToBase64Url(base64) : base64;
}
function stringToBase64(string, { urlSafe = false } = {}) {
  assertString2(string);
  return uint8ArrayToBase64(stringToUint8Array(string), { urlSafe });
}
var byteToHexLookupTable = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, "0"));

// node_modules/cacheable-request/dist/index.js
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_node_events2 = __toESM(require("node:events"), 1);
var import_node_stream2 = __toESM(require("node:stream"), 1);
var import_node_url = __toESM(require("node:url"), 1);

// node_modules/get-stream/source/index.js
var import_node_events = require("node:events");
var import_promises = require("node:stream/promises");

// node_modules/is-stream/index.js
function isStream(stream2, { checkOpen = true } = {}) {
  return stream2 !== null && typeof stream2 === "object" && (stream2.writable || stream2.readable || !checkOpen || stream2.writable === void 0 && stream2.readable === void 0) && typeof stream2.pipe === "function";
}
function isReadableStream(stream2, { checkOpen = true } = {}) {
  return isStream(stream2, { checkOpen }) && (stream2.readable || !checkOpen) && typeof stream2.read === "function" && typeof stream2.readable === "boolean" && typeof stream2.readableObjectMode === "boolean" && typeof stream2.destroy === "function" && typeof stream2.destroyed === "boolean";
}

// node_modules/@sec-ant/readable-stream/dist/ponyfill/asyncIterator.js
var a = Object.getPrototypeOf(
  Object.getPrototypeOf(
    /* istanbul ignore next */
    async function* () {
    }
  ).prototype
);
var c = class {
  #t;
  #n;
  #r = false;
  #e = void 0;
  constructor(e, t) {
    this.#t = e, this.#n = t;
  }
  next() {
    const e = () => this.#s();
    return this.#e = this.#e ? this.#e.then(e, e) : e(), this.#e;
  }
  return(e) {
    const t = () => this.#i(e);
    return this.#e ? this.#e.then(t, t) : t();
  }
  async #s() {
    if (this.#r)
      return {
        done: true,
        value: void 0
      };
    let e;
    try {
      e = await this.#t.read();
    } catch (t) {
      throw this.#e = void 0, this.#r = true, this.#t.releaseLock(), t;
    }
    return e.done && (this.#e = void 0, this.#r = true, this.#t.releaseLock()), e;
  }
  async #i(e) {
    if (this.#r)
      return {
        done: true,
        value: e
      };
    if (this.#r = true, !this.#n) {
      const t = this.#t.cancel(e);
      return this.#t.releaseLock(), await t, {
        done: true,
        value: e
      };
    }
    return this.#t.releaseLock(), {
      done: true,
      value: e
    };
  }
};
var n = Symbol();
function i() {
  return this[n].next();
}
Object.defineProperty(i, "name", { value: "next" });
function o(r) {
  return this[n].return(r);
}
Object.defineProperty(o, "name", { value: "return" });
var u = Object.create(a, {
  next: {
    enumerable: true,
    configurable: true,
    writable: true,
    value: i
  },
  return: {
    enumerable: true,
    configurable: true,
    writable: true,
    value: o
  }
});
function h({ preventCancel: r = false } = {}) {
  const e = this.getReader(), t = new c(
    e,
    r
  ), s = Object.create(u);
  return s[n] = t, s;
}

// node_modules/get-stream/source/stream.js
var getAsyncIterable = (stream2) => {
  if (isReadableStream(stream2, { checkOpen: false }) && nodeImports.on !== void 0) {
    return getStreamIterable(stream2);
  }
  if (typeof stream2?.[Symbol.asyncIterator] === "function") {
    return stream2;
  }
  if (toString.call(stream2) === "[object ReadableStream]") {
    return h.call(stream2);
  }
  throw new TypeError("The first argument must be a Readable, a ReadableStream, or an async iterable.");
};
var { toString } = Object.prototype;
var getStreamIterable = async function* (stream2) {
  const controller = new AbortController();
  const state = {};
  handleStreamEnd(stream2, controller, state);
  try {
    for await (const [chunk2] of nodeImports.on(stream2, "data", { signal: controller.signal })) {
      yield chunk2;
    }
  } catch (error) {
    if (state.error !== void 0) {
      throw state.error;
    } else if (!controller.signal.aborted) {
      throw error;
    }
  } finally {
    stream2.destroy();
  }
};
var handleStreamEnd = async (stream2, controller, state) => {
  try {
    await nodeImports.finished(stream2, {
      cleanup: true,
      readable: true,
      writable: false,
      error: false
    });
  } catch (error) {
    state.error = error;
  } finally {
    controller.abort();
  }
};
var nodeImports = {};

// node_modules/get-stream/source/contents.js
var getStreamContents = async (stream2, { init: init2, convertChunk, getSize, truncateChunk, addChunk, getFinalChunk, finalize }, { maxBuffer = Number.POSITIVE_INFINITY } = {}) => {
  const asyncIterable = getAsyncIterable(stream2);
  const state = init2();
  state.length = 0;
  try {
    for await (const chunk2 of asyncIterable) {
      const chunkType = getChunkType(chunk2);
      const convertedChunk = convertChunk[chunkType](chunk2, state);
      appendChunk({
        convertedChunk,
        state,
        getSize,
        truncateChunk,
        addChunk,
        maxBuffer
      });
    }
    appendFinalChunk({
      state,
      convertChunk,
      getSize,
      truncateChunk,
      addChunk,
      getFinalChunk,
      maxBuffer
    });
    return finalize(state);
  } catch (error) {
    const normalizedError = typeof error === "object" && error !== null ? error : new Error(error);
    normalizedError.bufferedData = finalize(state);
    throw normalizedError;
  }
};
var appendFinalChunk = ({ state, getSize, truncateChunk, addChunk, getFinalChunk, maxBuffer }) => {
  const convertedChunk = getFinalChunk(state);
  if (convertedChunk !== void 0) {
    appendChunk({
      convertedChunk,
      state,
      getSize,
      truncateChunk,
      addChunk,
      maxBuffer
    });
  }
};
var appendChunk = ({ convertedChunk, state, getSize, truncateChunk, addChunk, maxBuffer }) => {
  const chunkSize = getSize(convertedChunk);
  const newLength = state.length + chunkSize;
  if (newLength <= maxBuffer) {
    addNewChunk(convertedChunk, state, addChunk, newLength);
    return;
  }
  const truncatedChunk = truncateChunk(convertedChunk, maxBuffer - state.length);
  if (truncatedChunk !== void 0) {
    addNewChunk(truncatedChunk, state, addChunk, maxBuffer);
  }
  throw new MaxBufferError();
};
var addNewChunk = (convertedChunk, state, addChunk, newLength) => {
  state.contents = addChunk(convertedChunk, state, newLength);
  state.length = newLength;
};
var getChunkType = (chunk2) => {
  const typeOfChunk = typeof chunk2;
  if (typeOfChunk === "string") {
    return "string";
  }
  if (typeOfChunk !== "object" || chunk2 === null) {
    return "others";
  }
  if (globalThis.Buffer?.isBuffer(chunk2)) {
    return "buffer";
  }
  const prototypeName = objectToString2.call(chunk2);
  if (prototypeName === "[object ArrayBuffer]") {
    return "arrayBuffer";
  }
  if (prototypeName === "[object DataView]") {
    return "dataView";
  }
  if (Number.isInteger(chunk2.byteLength) && Number.isInteger(chunk2.byteOffset) && objectToString2.call(chunk2.buffer) === "[object ArrayBuffer]") {
    return "typedArray";
  }
  return "others";
};
var { toString: objectToString2 } = Object.prototype;
var MaxBufferError = class extends Error {
  name = "MaxBufferError";
  constructor() {
    super("maxBuffer exceeded");
  }
};

// node_modules/get-stream/source/utils.js
var noop = () => void 0;
var throwObjectStream = (chunk2) => {
  throw new Error(`Streams in object mode are not supported: ${String(chunk2)}`);
};
var getLengthProperty = (convertedChunk) => convertedChunk.length;

// node_modules/get-stream/source/array-buffer.js
async function getStreamAsArrayBuffer(stream2, options) {
  return getStreamContents(stream2, arrayBufferMethods, options);
}
var initArrayBuffer = () => ({ contents: new ArrayBuffer(0) });
var useTextEncoder = (chunk2) => textEncoder2.encode(chunk2);
var textEncoder2 = new TextEncoder();
var useUint8Array = (chunk2) => new Uint8Array(chunk2);
var useUint8ArrayWithOffset = (chunk2) => new Uint8Array(chunk2.buffer, chunk2.byteOffset, chunk2.byteLength);
var truncateArrayBufferChunk = (convertedChunk, chunkSize) => convertedChunk.slice(0, chunkSize);
var addArrayBufferChunk = (convertedChunk, { contents, length: previousLength }, length) => {
  const newContents = hasArrayBufferResize() ? resizeArrayBuffer(contents, length) : resizeArrayBufferSlow(contents, length);
  new Uint8Array(newContents).set(convertedChunk, previousLength);
  return newContents;
};
var resizeArrayBufferSlow = (contents, length) => {
  if (length <= contents.byteLength) {
    return contents;
  }
  const arrayBuffer = new ArrayBuffer(getNewContentsLength(length));
  new Uint8Array(arrayBuffer).set(new Uint8Array(contents), 0);
  return arrayBuffer;
};
var resizeArrayBuffer = (contents, length) => {
  if (length <= contents.maxByteLength) {
    contents.resize(length);
    return contents;
  }
  const arrayBuffer = new ArrayBuffer(length, { maxByteLength: getNewContentsLength(length) });
  new Uint8Array(arrayBuffer).set(new Uint8Array(contents), 0);
  return arrayBuffer;
};
var getNewContentsLength = (length) => SCALE_FACTOR ** Math.ceil(Math.log(length) / Math.log(SCALE_FACTOR));
var SCALE_FACTOR = 2;
var finalizeArrayBuffer = ({ contents, length }) => hasArrayBufferResize() ? contents : contents.slice(0, length);
var hasArrayBufferResize = () => "resize" in ArrayBuffer.prototype;
var arrayBufferMethods = {
  init: initArrayBuffer,
  convertChunk: {
    string: useTextEncoder,
    buffer: useUint8Array,
    arrayBuffer: useUint8Array,
    dataView: useUint8ArrayWithOffset,
    typedArray: useUint8ArrayWithOffset,
    others: throwObjectStream
  },
  getSize: getLengthProperty,
  truncateChunk: truncateArrayBufferChunk,
  addChunk: addArrayBufferChunk,
  getFinalChunk: noop,
  finalize: finalizeArrayBuffer
};

// node_modules/get-stream/source/buffer.js
async function getStreamAsBuffer(stream2, options) {
  if (!("Buffer" in globalThis)) {
    throw new Error("getStreamAsBuffer() is only supported in Node.js");
  }
  try {
    return arrayBufferToNodeBuffer(await getStreamAsArrayBuffer(stream2, options));
  } catch (error) {
    if (error.bufferedData !== void 0) {
      error.bufferedData = arrayBufferToNodeBuffer(error.bufferedData);
    }
    throw error;
  }
}
var arrayBufferToNodeBuffer = (arrayBuffer) => globalThis.Buffer.from(arrayBuffer);

// node_modules/get-stream/source/index.js
Object.assign(nodeImports, { on: import_node_events.on, finished: import_promises.finished });

// node_modules/cacheable-request/dist/index.js
var import_http_cache_semantics = __toESM(require_http_cache_semantics(), 1);

// node_modules/@keyv/serialize/dist/index.js
var import_buffer2 = require("buffer");
var _serialize = (data, escapeColonStrings = true) => {
  if (data === void 0 || data === null) {
    return "null";
  }
  if (typeof data === "string") {
    return JSON.stringify(
      escapeColonStrings && data.startsWith(":") ? `:${data}` : data
    );
  }
  if (import_buffer2.Buffer.isBuffer(data)) {
    return JSON.stringify(`:base64:${data.toString("base64")}`);
  }
  if (data?.toJSON) {
    data = data.toJSON();
  }
  if (typeof data === "object") {
    let s = "";
    const array = Array.isArray(data);
    s = array ? "[" : "{";
    let first = true;
    for (const k in data) {
      const ignore = typeof data[k] === "function" || !array && data[k] === void 0;
      if (!Object.hasOwn(data, k) || ignore) {
        continue;
      }
      if (!first) {
        s += ",";
      }
      first = false;
      if (array) {
        s += _serialize(data[k], escapeColonStrings);
      } else if (data[k] !== void 0) {
        s += `${_serialize(k, false)}:${_serialize(data[k], escapeColonStrings)}`;
      }
    }
    s += array ? "]" : "}";
    return s;
  }
  return JSON.stringify(data);
};
var defaultSerialize = (data) => {
  return _serialize(data, true);
};
var defaultDeserialize = (data) => JSON.parse(data, (_, value) => {
  if (typeof value === "string") {
    if (value.startsWith(":base64:")) {
      return import_buffer2.Buffer.from(value.slice(8), "base64");
    }
    return value.startsWith(":") ? value.slice(1) : value;
  }
  return value;
});

// node_modules/keyv/dist/index.js
var EventManager = class {
  _eventListeners;
  _maxListeners;
  constructor() {
    this._eventListeners = /* @__PURE__ */ new Map();
    this._maxListeners = 100;
  }
  maxListeners() {
    return this._maxListeners;
  }
  // Add an event listener
  addListener(event, listener) {
    this.on(event, listener);
  }
  on(event, listener) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      if (listeners.length >= this._maxListeners) {
        console.warn(
          `MaxListenersExceededWarning: Possible event memory leak detected. ${listeners.length + 1} ${event} listeners added. Use setMaxListeners() to increase limit.`
        );
      }
      listeners.push(listener);
    }
    return this;
  }
  // Remove an event listener
  removeListener(event, listener) {
    this.off(event, listener);
  }
  off(event, listener) {
    const listeners = this._eventListeners.get(event) ?? [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    if (listeners.length === 0) {
      this._eventListeners.delete(event);
    }
  }
  once(event, listener) {
    const onceListener = (...arguments_) => {
      listener(...arguments_);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }
  // Emit an event
  // biome-ignore lint/suspicious/noExplicitAny: type format
  emit(event, ...arguments_) {
    const listeners = this._eventListeners.get(event);
    if (listeners && listeners.length > 0) {
      for (const listener of listeners) {
        listener(...arguments_);
      }
    }
  }
  // Get all listeners for a specific event
  listeners(event) {
    return this._eventListeners.get(event) ?? [];
  }
  // Remove all listeners for a specific event
  removeAllListeners(event) {
    if (event) {
      this._eventListeners.delete(event);
    } else {
      this._eventListeners.clear();
    }
  }
  // Set the maximum number of listeners for a single event
  setMaxListeners(n2) {
    this._maxListeners = n2;
  }
};
var event_manager_default = EventManager;
var HooksManager = class extends event_manager_default {
  _hookHandlers;
  constructor() {
    super();
    this._hookHandlers = /* @__PURE__ */ new Map();
  }
  // Adds a handler function for a specific event
  addHandler(event, handler) {
    const eventHandlers = this._hookHandlers.get(event);
    if (eventHandlers) {
      eventHandlers.push(handler);
    } else {
      this._hookHandlers.set(event, [handler]);
    }
  }
  // Removes a specific handler function for a specific event
  removeHandler(event, handler) {
    const eventHandlers = this._hookHandlers.get(event);
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler);
      if (index !== -1) {
        eventHandlers.splice(index, 1);
      }
    }
  }
  // Triggers all handlers for a specific event with provided data
  // biome-ignore lint/suspicious/noExplicitAny: type format
  trigger(event, data) {
    const eventHandlers = this._hookHandlers.get(event);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        try {
          handler(data);
        } catch (error) {
          this.emit(
            "error",
            new Error(
              `Error in hook handler for event "${event}": ${error.message}`
            )
          );
        }
      }
    }
  }
  // Provides read-only access to the current handlers
  get handlers() {
    return new Map(this._hookHandlers);
  }
};
var hooks_manager_default = HooksManager;
var StatsManager = class extends event_manager_default {
  enabled = true;
  hits = 0;
  misses = 0;
  sets = 0;
  deletes = 0;
  errors = 0;
  constructor(enabled) {
    super();
    if (enabled !== void 0) {
      this.enabled = enabled;
    }
    this.reset();
  }
  hit() {
    if (this.enabled) {
      this.hits++;
    }
  }
  miss() {
    if (this.enabled) {
      this.misses++;
    }
  }
  set() {
    if (this.enabled) {
      this.sets++;
    }
  }
  delete() {
    if (this.enabled) {
      this.deletes++;
    }
  }
  hitsOrMisses(array) {
    for (const item of array) {
      if (item === void 0) {
        this.miss();
      } else {
        this.hit();
      }
    }
  }
  reset() {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.errors = 0;
  }
};
var stats_manager_default = StatsManager;
var iterableAdapters = [
  "sqlite",
  "postgres",
  "mysql",
  "mongo",
  "redis",
  "valkey",
  "etcd"
];
var Keyv = class extends event_manager_default {
  opts;
  iterator;
  hooks = new hooks_manager_default();
  stats = new stats_manager_default(false);
  /**
   * Time to live in milliseconds
   */
  _ttl;
  /**
   * Namespace
   */
  _namespace;
  /**
   * Store
   */
  // biome-ignore lint/suspicious/noExplicitAny: type format
  _store = /* @__PURE__ */ new Map();
  _serialize = defaultSerialize;
  _deserialize = defaultDeserialize;
  _compression;
  _useKeyPrefix = true;
  _throwOnErrors = false;
  /**
   * Keyv Constructor
   * @param {KeyvStoreAdapter | KeyvOptions} store
   * @param {Omit<KeyvOptions, 'store'>} [options] if you provide the store you can then provide the Keyv Options
   */
  constructor(store, options) {
    super();
    options ??= {};
    store ??= {};
    this.opts = {
      namespace: "keyv",
      serialize: defaultSerialize,
      deserialize: defaultDeserialize,
      emitErrors: true,
      // @ts-expect-error - Map is not a KeyvStoreAdapter
      store: /* @__PURE__ */ new Map(),
      ...options
    };
    if (store && store.get) {
      this.opts.store = store;
    } else {
      this.opts = {
        ...this.opts,
        ...store
      };
    }
    this._store = this.opts.store ?? /* @__PURE__ */ new Map();
    this._compression = this.opts.compression;
    this._serialize = this.opts.serialize;
    this._deserialize = this.opts.deserialize;
    if (this.opts.namespace) {
      this._namespace = this.opts.namespace;
    }
    if (this._store) {
      if (!this._isValidStorageAdapter(this._store)) {
        throw new Error("Invalid storage adapter");
      }
      if (typeof this._store.on === "function") {
        this._store.on("error", (error) => this.emit("error", error));
      }
      this._store.namespace = this._namespace;
      if (typeof this._store[Symbol.iterator] === "function" && this._store instanceof Map) {
        this.iterator = this.generateIterator(
          this._store
        );
      } else if ("iterator" in this._store && this._store.opts && this._checkIterableAdapter()) {
        this.iterator = this.generateIterator(
          // biome-ignore lint/style/noNonNullAssertion: need to fix
          this._store.iterator.bind(this._store)
        );
      }
    }
    if (this.opts.stats) {
      this.stats.enabled = this.opts.stats;
    }
    if (this.opts.ttl) {
      this._ttl = this.opts.ttl;
    }
    if (this.opts.useKeyPrefix !== void 0) {
      this._useKeyPrefix = this.opts.useKeyPrefix;
    }
    if (this.opts.throwOnErrors !== void 0) {
      this._throwOnErrors = this.opts.throwOnErrors;
    }
  }
  /**
   * Get the current store
   */
  // biome-ignore lint/suspicious/noExplicitAny: type format
  get store() {
    return this._store;
  }
  /**
   * Set the current store. This will also set the namespace, event error handler, and generate the iterator. If the store is not valid it will throw an error.
   * @param {KeyvStoreAdapter | Map<any, any> | any} store the store to set
   */
  // biome-ignore lint/suspicious/noExplicitAny: type format
  set store(store) {
    if (this._isValidStorageAdapter(store)) {
      this._store = store;
      this.opts.store = store;
      if (typeof store.on === "function") {
        store.on("error", (error) => this.emit("error", error));
      }
      if (this._namespace) {
        this._store.namespace = this._namespace;
      }
      if (typeof store[Symbol.iterator] === "function" && store instanceof Map) {
        this.iterator = this.generateIterator(
          store
        );
      } else if ("iterator" in store && store.opts && this._checkIterableAdapter()) {
        this.iterator = this.generateIterator(store.iterator?.bind(store));
      }
    } else {
      throw new Error("Invalid storage adapter");
    }
  }
  /**
   * Get the current compression function
   * @returns {CompressionAdapter} The current compression function
   */
  get compression() {
    return this._compression;
  }
  /**
   * Set the current compression function
   * @param {CompressionAdapter} compress The compression function to set
   */
  set compression(compress) {
    this._compression = compress;
  }
  /**
   * Get the current namespace.
   * @returns {string | undefined} The current namespace.
   */
  get namespace() {
    return this._namespace;
  }
  /**
   * Set the current namespace.
   * @param {string | undefined} namespace The namespace to set.
   */
  set namespace(namespace) {
    this._namespace = namespace;
    this.opts.namespace = namespace;
    this._store.namespace = namespace;
    if (this.opts.store) {
      this.opts.store.namespace = namespace;
    }
  }
  /**
   * Get the current TTL.
   * @returns {number} The current TTL in milliseconds.
   */
  get ttl() {
    return this._ttl;
  }
  /**
   * Set the current TTL.
   * @param {number} ttl The TTL to set in milliseconds.
   */
  set ttl(ttl2) {
    this.opts.ttl = ttl2;
    this._ttl = ttl2;
  }
  /**
   * Get the current serialize function.
   * @returns {Serialize} The current serialize function.
   */
  get serialize() {
    return this._serialize;
  }
  /**
   * Set the current serialize function.
   * @param {Serialize} serialize The serialize function to set.
   */
  set serialize(serialize) {
    this.opts.serialize = serialize;
    this._serialize = serialize;
  }
  /**
   * Get the current deserialize function.
   * @returns {Deserialize} The current deserialize function.
   */
  get deserialize() {
    return this._deserialize;
  }
  /**
   * Set the current deserialize function.
   * @param {Deserialize} deserialize The deserialize function to set.
   */
  set deserialize(deserialize) {
    this.opts.deserialize = deserialize;
    this._deserialize = deserialize;
  }
  /**
   * Get the current useKeyPrefix value. This will enable or disable key prefixing.
   * @returns {boolean} The current useKeyPrefix value.
   * @default true
   */
  get useKeyPrefix() {
    return this._useKeyPrefix;
  }
  /**
   * Set the current useKeyPrefix value. This will enable or disable key prefixing.
   * @param {boolean} value The useKeyPrefix value to set.
   */
  set useKeyPrefix(value) {
    this._useKeyPrefix = value;
    this.opts.useKeyPrefix = value;
  }
  /**
   * Get the current throwErrors value. This will enable or disable throwing errors on methods in addition to emitting them.
   * @return {boolean} The current throwOnErrors value.
   */
  get throwOnErrors() {
    return this._throwOnErrors;
  }
  /**
   * Set the current throwOnErrors value. This will enable or disable throwing errors on methods in addition to emitting them.
   * @param {boolean} value The throwOnErrors value to set.
   */
  set throwOnErrors(value) {
    this._throwOnErrors = value;
    this.opts.throwOnErrors = value;
  }
  generateIterator(iterator) {
    const function_ = async function* () {
      for await (const [key, raw] of typeof iterator === "function" ? iterator(this._store.namespace) : iterator) {
        const data = await this.deserializeData(raw);
        if (this._useKeyPrefix && this._store.namespace && !key.includes(this._store.namespace)) {
          continue;
        }
        if (typeof data.expires === "number" && Date.now() > data.expires) {
          await this.delete(key);
          continue;
        }
        yield [this._getKeyUnprefix(key), data.value];
      }
    };
    return function_.bind(this);
  }
  _checkIterableAdapter() {
    return iterableAdapters.includes(this._store.opts.dialect) || iterableAdapters.some(
      (element) => this._store.opts.url.includes(element)
    );
  }
  _getKeyPrefix(key) {
    if (!this._useKeyPrefix) {
      return key;
    }
    if (!this._namespace) {
      return key;
    }
    if (key.startsWith(`${this._namespace}:`)) {
      return key;
    }
    return `${this._namespace}:${key}`;
  }
  _getKeyPrefixArray(keys) {
    if (!this._useKeyPrefix) {
      return keys;
    }
    if (!this._namespace) {
      return keys;
    }
    return keys.map((key) => `${this._namespace}:${key}`);
  }
  _getKeyUnprefix(key) {
    if (!this._useKeyPrefix) {
      return key;
    }
    return key.split(":").splice(1).join(":");
  }
  // biome-ignore lint/suspicious/noExplicitAny: type format
  _isValidStorageAdapter(store) {
    return store instanceof Map || typeof store.get === "function" && typeof store.set === "function" && typeof store.delete === "function" && typeof store.clear === "function";
  }
  // eslint-disable-next-line @stylistic/max-len
  async get(key, options) {
    const { store } = this.opts;
    const isArray2 = Array.isArray(key);
    const keyPrefixed = isArray2 ? this._getKeyPrefixArray(key) : this._getKeyPrefix(key);
    const isDataExpired = (data) => typeof data.expires === "number" && Date.now() > data.expires;
    if (isArray2) {
      if (options?.raw === true) {
        return this.getMany(key, { raw: true });
      }
      return this.getMany(key, { raw: false });
    }
    this.hooks.trigger("preGet", { key: keyPrefixed });
    let rawData;
    try {
      rawData = await store.get(keyPrefixed);
    } catch (error) {
      if (this.throwOnErrors) {
        throw error;
      }
    }
    const deserializedData = typeof rawData === "string" || this.opts.compression ? await this.deserializeData(rawData) : rawData;
    if (deserializedData === void 0 || deserializedData === null) {
      this.hooks.trigger("postGet", {
        key: keyPrefixed,
        value: void 0
      });
      this.stats.miss();
      return void 0;
    }
    if (isDataExpired(deserializedData)) {
      await this.delete(key);
      this.hooks.trigger("postGet", {
        key: keyPrefixed,
        value: void 0
      });
      this.stats.miss();
      return void 0;
    }
    this.hooks.trigger("postGet", {
      key: keyPrefixed,
      value: deserializedData
    });
    this.stats.hit();
    return options?.raw ? deserializedData : deserializedData.value;
  }
  async getMany(keys, options) {
    const { store } = this.opts;
    const keyPrefixed = this._getKeyPrefixArray(keys);
    const isDataExpired = (data) => typeof data.expires === "number" && Date.now() > data.expires;
    this.hooks.trigger("preGetMany", { keys: keyPrefixed });
    if (store.getMany === void 0) {
      const promises = keyPrefixed.map(async (key) => {
        const rawData2 = await store.get(key);
        const deserializedRow = typeof rawData2 === "string" || this.opts.compression ? await this.deserializeData(rawData2) : rawData2;
        if (deserializedRow === void 0 || deserializedRow === null) {
          return void 0;
        }
        if (isDataExpired(deserializedRow)) {
          await this.delete(key);
          return void 0;
        }
        return options?.raw ? deserializedRow : deserializedRow.value;
      });
      const deserializedRows = await Promise.allSettled(promises);
      const result2 = deserializedRows.map(
        // biome-ignore lint/suspicious/noExplicitAny: type format
        (row) => row.value
      );
      this.hooks.trigger("postGetMany", result2);
      if (result2.length > 0) {
        this.stats.hit();
      }
      return result2;
    }
    const rawData = await store.getMany(keyPrefixed);
    const result = [];
    const expiredKeys = [];
    for (const index in rawData) {
      let row = rawData[index];
      if (typeof row === "string") {
        row = await this.deserializeData(row);
      }
      if (row === void 0 || row === null) {
        result.push(void 0);
        continue;
      }
      if (isDataExpired(row)) {
        expiredKeys.push(keys[index]);
        result.push(void 0);
        continue;
      }
      const value = options?.raw ? row : row.value;
      result.push(value);
    }
    if (expiredKeys.length > 0) {
      await this.deleteMany(expiredKeys);
    }
    this.hooks.trigger("postGetMany", result);
    if (result.length > 0) {
      this.stats.hit();
    }
    return result;
  }
  /**
   * Get the raw value of a key. This is the replacement for setting raw to true in the get() method.
   * @param {string} key the key to get
   * @returns {Promise<StoredDataRaw<Value> | undefined>} will return a StoredDataRaw<Value> or undefined if the key does not exist or is expired.
   */
  async getRaw(key) {
    const { store } = this.opts;
    const keyPrefixed = this._getKeyPrefix(key);
    this.hooks.trigger("preGetRaw", { key: keyPrefixed });
    const rawData = await store.get(keyPrefixed);
    if (rawData === void 0 || rawData === null) {
      this.hooks.trigger("postGetRaw", {
        key: keyPrefixed,
        value: void 0
      });
      this.stats.miss();
      return void 0;
    }
    const deserializedData = typeof rawData === "string" || this.opts.compression ? await this.deserializeData(rawData) : rawData;
    if (deserializedData !== void 0 && deserializedData.expires !== void 0 && deserializedData.expires !== null && // biome-ignore lint/style/noNonNullAssertion: need to fix
    deserializedData.expires < Date.now()) {
      this.hooks.trigger("postGetRaw", {
        key: keyPrefixed,
        value: void 0
      });
      this.stats.miss();
      await this.delete(key);
      return void 0;
    }
    this.stats.hit();
    this.hooks.trigger("postGetRaw", {
      key: keyPrefixed,
      value: deserializedData
    });
    return deserializedData;
  }
  /**
   * Get the raw values of many keys. This is the replacement for setting raw to true in the getMany() method.
   * @param {string[]} keys the keys to get
   * @returns {Promise<Array<StoredDataRaw<Value>>>} will return an array of StoredDataRaw<Value> or undefined if the key does not exist or is expired.
   */
  async getManyRaw(keys) {
    const { store } = this.opts;
    const keyPrefixed = this._getKeyPrefixArray(keys);
    if (keys.length === 0) {
      const result2 = Array.from({ length: keys.length }).fill(
        void 0
      );
      this.stats.misses += keys.length;
      this.hooks.trigger("postGetManyRaw", {
        keys: keyPrefixed,
        values: result2
      });
      return result2;
    }
    let result = [];
    if (store.getMany === void 0) {
      const promises = keyPrefixed.map(async (key) => {
        const rawData = await store.get(key);
        if (rawData !== void 0 && rawData !== null) {
          return this.deserializeData(rawData);
        }
        return void 0;
      });
      const deserializedRows = await Promise.allSettled(promises);
      result = deserializedRows.map(
        // biome-ignore lint/suspicious/noExplicitAny: type format
        (row) => row.value
      );
    } else {
      const rawData = await store.getMany(keyPrefixed);
      for (const row of rawData) {
        if (row !== void 0 && row !== null) {
          result.push(await this.deserializeData(row));
        } else {
          result.push(void 0);
        }
      }
    }
    const expiredKeys = [];
    const isDataExpired = (data) => typeof data.expires === "number" && Date.now() > data.expires;
    for (const [index, row] of result.entries()) {
      if (row !== void 0 && isDataExpired(row)) {
        expiredKeys.push(keyPrefixed[index]);
        result[index] = void 0;
      }
    }
    if (expiredKeys.length > 0) {
      await this.deleteMany(expiredKeys);
    }
    this.stats.hitsOrMisses(result);
    this.hooks.trigger("postGetManyRaw", {
      keys: keyPrefixed,
      values: result
    });
    return result;
  }
  /**
   * Set an item to the store
   * @param {string | Array<KeyvEntry>} key the key to use. If you pass in an array of KeyvEntry it will set many items
   * @param {Value} value the value of the key
   * @param {number} [ttl] time to live in milliseconds
   * @returns {boolean} if it sets then it will return a true. On failure will return false.
   */
  async set(key, value, ttl2) {
    const data = { key, value, ttl: ttl2 };
    this.hooks.trigger("preSet", data);
    const keyPrefixed = this._getKeyPrefix(data.key);
    data.ttl ??= this._ttl;
    if (data.ttl === 0) {
      data.ttl = void 0;
    }
    const { store } = this.opts;
    const expires = typeof data.ttl === "number" ? Date.now() + data.ttl : void 0;
    if (typeof data.value === "symbol") {
      this.emit("error", "symbol cannot be serialized");
      throw new Error("symbol cannot be serialized");
    }
    const formattedValue = { value: data.value, expires };
    const serializedValue = await this.serializeData(formattedValue);
    let result = true;
    try {
      const value2 = await store.set(keyPrefixed, serializedValue, data.ttl);
      if (typeof value2 === "boolean") {
        result = value2;
      }
    } catch (error) {
      result = false;
      this.emit("error", error);
      if (this._throwOnErrors) {
        throw error;
      }
    }
    this.hooks.trigger("postSet", {
      key: keyPrefixed,
      value: serializedValue,
      ttl: ttl2
    });
    this.stats.set();
    return result;
  }
  /**
   * Set many items to the store
   * @param {Array<KeyvEntry>} entries the entries to set
   * @returns {boolean[]} will return an array of booleans if it sets then it will return a true. On failure will return false.
   */
  // biome-ignore lint/correctness/noUnusedVariables: type format
  async setMany(entries2) {
    let results = [];
    try {
      if (this._store.setMany === void 0) {
        const promises = [];
        for (const entry of entries2) {
          promises.push(this.set(entry.key, entry.value, entry.ttl));
        }
        const promiseResults = await Promise.all(promises);
        results = promiseResults;
      } else {
        const serializedEntries = await Promise.all(
          entries2.map(async ({ key, value, ttl: ttl2 }) => {
            ttl2 ??= this._ttl;
            if (ttl2 === 0) {
              ttl2 = void 0;
            }
            const expires = typeof ttl2 === "number" ? Date.now() + ttl2 : void 0;
            if (typeof value === "symbol") {
              this.emit("error", "symbol cannot be serialized");
              throw new Error("symbol cannot be serialized");
            }
            const formattedValue = { value, expires };
            const serializedValue = await this.serializeData(formattedValue);
            const keyPrefixed = this._getKeyPrefix(key);
            return { key: keyPrefixed, value: serializedValue, ttl: ttl2 };
          })
        );
        results = await this._store.setMany(serializedEntries);
      }
    } catch (error) {
      this.emit("error", error);
      if (this._throwOnErrors) {
        throw error;
      }
      results = entries2.map(() => false);
    }
    return results;
  }
  /**
   * Delete an Entry
   * @param {string | string[]} key the key to be deleted. if an array it will delete many items
   * @returns {boolean} will return true if item or items are deleted. false if there is an error
   */
  async delete(key) {
    const { store } = this.opts;
    if (Array.isArray(key)) {
      return this.deleteMany(key);
    }
    const keyPrefixed = this._getKeyPrefix(key);
    this.hooks.trigger("preDelete", { key: keyPrefixed });
    let result = true;
    try {
      const value = await store.delete(keyPrefixed);
      if (typeof value === "boolean") {
        result = value;
      }
    } catch (error) {
      result = false;
      this.emit("error", error);
      if (this._throwOnErrors) {
        throw error;
      }
    }
    this.hooks.trigger("postDelete", {
      key: keyPrefixed,
      value: result
    });
    this.stats.delete();
    return result;
  }
  /**
   * Delete many items from the store
   * @param {string[]} keys the keys to be deleted
   * @returns {boolean} will return true if item or items are deleted. false if there is an error
   */
  async deleteMany(keys) {
    try {
      const { store } = this.opts;
      const keyPrefixed = this._getKeyPrefixArray(keys);
      this.hooks.trigger("preDelete", { key: keyPrefixed });
      if (store.deleteMany !== void 0) {
        return await store.deleteMany(keyPrefixed);
      }
      const promises = keyPrefixed.map(async (key) => store.delete(key));
      const results = await Promise.all(promises);
      const returnResult = results.every(Boolean);
      this.hooks.trigger("postDelete", {
        key: keyPrefixed,
        value: returnResult
      });
      return returnResult;
    } catch (error) {
      this.emit("error", error);
      if (this._throwOnErrors) {
        throw error;
      }
      return false;
    }
  }
  /**
   * Clear the store
   * @returns {void}
   */
  async clear() {
    this.emit("clear");
    const { store } = this.opts;
    try {
      await store.clear();
    } catch (error) {
      this.emit("error", error);
      if (this._throwOnErrors) {
        throw error;
      }
    }
  }
  async has(key) {
    if (Array.isArray(key)) {
      return this.hasMany(key);
    }
    const keyPrefixed = this._getKeyPrefix(key);
    const { store } = this.opts;
    if (store.has !== void 0 && !(store instanceof Map)) {
      return store.has(keyPrefixed);
    }
    let rawData;
    try {
      rawData = await store.get(keyPrefixed);
    } catch (error) {
      this.emit("error", error);
      if (this._throwOnErrors) {
        throw error;
      }
      return false;
    }
    if (rawData) {
      const data = await this.deserializeData(rawData);
      if (data) {
        if (data.expires === void 0 || data.expires === null) {
          return true;
        }
        return data.expires > Date.now();
      }
    }
    return false;
  }
  /**
   * Check if many keys exist
   * @param {string[]} keys the keys to check
   * @returns {boolean[]} will return an array of booleans if the keys exist
   */
  async hasMany(keys) {
    const keyPrefixed = this._getKeyPrefixArray(keys);
    const { store } = this.opts;
    if (store.hasMany !== void 0) {
      return store.hasMany(keyPrefixed);
    }
    const results = [];
    for (const key of keys) {
      results.push(await this.has(key));
    }
    return results;
  }
  /**
   * Will disconnect the store. This is only available if the store has a disconnect method
   * @returns {Promise<void>}
   */
  async disconnect() {
    const { store } = this.opts;
    this.emit("disconnect");
    if (typeof store.disconnect === "function") {
      return store.disconnect();
    }
  }
  // biome-ignore lint/suspicious/noExplicitAny: type format
  emit(event, ...arguments_) {
    if (event === "error" && !this.opts.emitErrors) {
      return;
    }
    super.emit(event, ...arguments_);
  }
  async serializeData(data) {
    if (!this._serialize) {
      return data;
    }
    if (this._compression?.compress) {
      return this._serialize({
        value: await this._compression.compress(data.value),
        expires: data.expires
      });
    }
    return this._serialize(data);
  }
  async deserializeData(data) {
    if (!this._deserialize) {
      return data;
    }
    if (this._compression?.decompress && typeof data === "string") {
      const result = await this._deserialize(data);
      return {
        value: await this._compression.decompress(result?.value),
        expires: result?.expires
      };
    }
    if (typeof data === "string") {
      return this._deserialize(data);
    }
    return void 0;
  }
};

// node_modules/mimic-response/index.js
var knownProperties = [
  "aborted",
  "complete",
  "headers",
  "httpVersion",
  "httpVersionMinor",
  "httpVersionMajor",
  "method",
  "rawHeaders",
  "rawTrailers",
  "setTimeout",
  "socket",
  "statusCode",
  "statusMessage",
  "trailers",
  "url"
];
function mimicResponse(fromStream, toStream) {
  if (toStream._readableState.autoDestroy) {
    throw new Error("The second stream must have the `autoDestroy` option set to `false`");
  }
  const fromProperties = /* @__PURE__ */ new Set([...Object.keys(fromStream), ...knownProperties]);
  const properties = {};
  for (const property of fromProperties) {
    if (property in toStream) {
      continue;
    }
    properties[property] = {
      get() {
        const value = fromStream[property];
        const isFunction2 = typeof value === "function";
        return isFunction2 ? value.bind(fromStream) : value;
      },
      set(value) {
        fromStream[property] = value;
      },
      enumerable: true,
      configurable: false
    };
  }
  Object.defineProperties(toStream, properties);
  fromStream.once("aborted", () => {
    toStream.destroy();
    toStream.emit("aborted");
  });
  fromStream.once("close", () => {
    if (fromStream.complete) {
      if (toStream.readable) {
        toStream.once("end", () => {
          toStream.emit("close");
        });
      } else {
        toStream.emit("close");
      }
    } else {
      toStream.emit("close");
    }
  });
  return toStream;
}

// node_modules/normalize-url/index.js
var DATA_URL_DEFAULT_MIME_TYPE = "text/plain";
var DATA_URL_DEFAULT_CHARSET = "us-ascii";
var testParameter = (name, filters) => filters.some((filter) => filter instanceof RegExp ? filter.test(name) : filter === name);
var supportedProtocols = /* @__PURE__ */ new Set([
  "https:",
  "http:",
  "file:"
]);
var hasCustomProtocol = (urlString) => {
  try {
    const { protocol } = new URL(urlString);
    return protocol.endsWith(":") && !protocol.includes(".") && !supportedProtocols.has(protocol);
  } catch {
    return false;
  }
};
var normalizeDataURL = (urlString, { stripHash }) => {
  const match = /^data:(?<type>[^,]*?),(?<data>[^#]*?)(?:#(?<hash>.*))?$/.exec(urlString);
  if (!match) {
    throw new Error(`Invalid URL: ${urlString}`);
  }
  const { type, data, hash } = match.groups;
  const mediaType = type.split(";");
  const isBase64 = mediaType.at(-1) === "base64";
  if (isBase64) {
    mediaType.pop();
  }
  const mimeType = mediaType.shift()?.toLowerCase() ?? "";
  const attributes = mediaType.map((attribute) => {
    let [key, value = ""] = attribute.split("=").map((string) => string.trim());
    if (key === "charset") {
      value = value.toLowerCase();
      if (value === DATA_URL_DEFAULT_CHARSET) {
        return "";
      }
    }
    return `${key}${value ? `=${value}` : ""}`;
  }).filter(Boolean);
  const normalizedMediaType = [...attributes];
  if (isBase64) {
    normalizedMediaType.push("base64");
  }
  if (normalizedMediaType.length > 0 || mimeType && mimeType !== DATA_URL_DEFAULT_MIME_TYPE) {
    normalizedMediaType.unshift(mimeType);
  }
  const hashPart = stripHash || !hash ? "" : `#${hash}`;
  return `data:${normalizedMediaType.join(";")},${isBase64 ? data.trim() : data}${hashPart}`;
};
function normalizeUrl(urlString, options) {
  options = {
    defaultProtocol: "http",
    normalizeProtocol: true,
    forceHttp: false,
    forceHttps: false,
    stripAuthentication: true,
    stripHash: false,
    stripTextFragment: true,
    stripWWW: true,
    removeQueryParameters: [/^utm_\w+/i],
    removeTrailingSlash: true,
    removeSingleSlash: true,
    removeDirectoryIndex: false,
    removeExplicitPort: false,
    sortQueryParameters: true,
    removePath: false,
    transformPath: false,
    ...options
  };
  if (typeof options.defaultProtocol === "string" && !options.defaultProtocol.endsWith(":")) {
    options.defaultProtocol = `${options.defaultProtocol}:`;
  }
  urlString = urlString.trim();
  if (/^data:/i.test(urlString)) {
    return normalizeDataURL(urlString, options);
  }
  if (hasCustomProtocol(urlString)) {
    return urlString;
  }
  const hasRelativeProtocol = urlString.startsWith("//");
  const isRelativeUrl = !hasRelativeProtocol && /^\.*\//.test(urlString);
  if (!isRelativeUrl) {
    urlString = urlString.replace(/^(?!(?:\w+:)?\/\/)|^\/\//, options.defaultProtocol);
  }
  const urlObject = new URL(urlString);
  if (options.forceHttp && options.forceHttps) {
    throw new Error("The `forceHttp` and `forceHttps` options cannot be used together");
  }
  if (options.forceHttp && urlObject.protocol === "https:") {
    urlObject.protocol = "http:";
  }
  if (options.forceHttps && urlObject.protocol === "http:") {
    urlObject.protocol = "https:";
  }
  if (options.stripAuthentication) {
    urlObject.username = "";
    urlObject.password = "";
  }
  if (options.stripHash) {
    urlObject.hash = "";
  } else if (options.stripTextFragment) {
    urlObject.hash = urlObject.hash.replace(/#?:~:text.*?$/i, "");
  }
  if (urlObject.pathname) {
    const protocolRegex = /\b[a-z][a-z\d+\-.]{1,50}:\/\//g;
    let lastIndex = 0;
    let result = "";
    for (; ; ) {
      const match = protocolRegex.exec(urlObject.pathname);
      if (!match) {
        break;
      }
      const protocol = match[0];
      const protocolAtIndex = match.index;
      const intermediate = urlObject.pathname.slice(lastIndex, protocolAtIndex);
      result += intermediate.replace(/\/{2,}/g, "/");
      result += protocol;
      lastIndex = protocolAtIndex + protocol.length;
    }
    const remnant = urlObject.pathname.slice(lastIndex, urlObject.pathname.length);
    result += remnant.replace(/\/{2,}/g, "/");
    urlObject.pathname = result;
  }
  if (urlObject.pathname) {
    try {
      urlObject.pathname = decodeURI(urlObject.pathname).replace(/\\/g, "%5C");
    } catch {
    }
  }
  if (options.removeDirectoryIndex === true) {
    options.removeDirectoryIndex = [/^index\.[a-z]+$/];
  }
  if (Array.isArray(options.removeDirectoryIndex) && options.removeDirectoryIndex.length > 0) {
    const pathComponents = urlObject.pathname.split("/").filter(Boolean);
    const lastComponent = pathComponents.at(-1);
    if (lastComponent && testParameter(lastComponent, options.removeDirectoryIndex)) {
      pathComponents.pop();
      urlObject.pathname = pathComponents.length > 0 ? `/${pathComponents.join("/")}/` : "/";
    }
  }
  if (options.removePath) {
    urlObject.pathname = "/";
  }
  if (options.transformPath && typeof options.transformPath === "function") {
    const pathComponents = urlObject.pathname.split("/").filter(Boolean);
    const newComponents = options.transformPath(pathComponents);
    urlObject.pathname = newComponents?.length > 0 ? `/${newComponents.join("/")}` : "/";
  }
  if (urlObject.hostname) {
    urlObject.hostname = urlObject.hostname.replace(/\.$/, "");
    if (options.stripWWW && /^www\.(?!www\.)[a-z\-\d]{1,63}\.[a-z.\-\d]{2,63}$/.test(urlObject.hostname)) {
      urlObject.hostname = urlObject.hostname.replace(/^www\./, "");
    }
  }
  if (Array.isArray(options.removeQueryParameters)) {
    for (const key of [...urlObject.searchParams.keys()]) {
      if (testParameter(key, options.removeQueryParameters)) {
        urlObject.searchParams.delete(key);
      }
    }
  }
  if (!Array.isArray(options.keepQueryParameters) && options.removeQueryParameters === true) {
    urlObject.search = "";
  }
  if (Array.isArray(options.keepQueryParameters) && options.keepQueryParameters.length > 0) {
    for (const key of [...urlObject.searchParams.keys()]) {
      if (!testParameter(key, options.keepQueryParameters)) {
        urlObject.searchParams.delete(key);
      }
    }
  }
  if (options.sortQueryParameters) {
    const originalSearch = urlObject.search;
    urlObject.searchParams.sort();
    try {
      urlObject.search = decodeURIComponent(urlObject.search);
    } catch {
    }
    const partsWithoutEquals = originalSearch.slice(1).split("&").filter((p) => p && !p.includes("="));
    for (const part of partsWithoutEquals) {
      const decoded = decodeURIComponent(part);
      urlObject.search = urlObject.search.replace(`?${decoded}=`, `?${decoded}`).replace(`&${decoded}=`, `&${decoded}`);
    }
  }
  if (options.removeTrailingSlash) {
    urlObject.pathname = urlObject.pathname.replace(/\/$/, "");
  }
  if (options.removeExplicitPort && urlObject.port) {
    urlObject.port = "";
  }
  const oldUrlString = urlString;
  urlString = urlObject.toString();
  if (!options.removeSingleSlash && urlObject.pathname === "/" && !oldUrlString.endsWith("/") && urlObject.hash === "") {
    urlString = urlString.replace(/\/$/, "");
  }
  if ((options.removeTrailingSlash || urlObject.pathname === "/") && urlObject.hash === "" && options.removeSingleSlash) {
    urlString = urlString.replace(/\/$/, "");
  }
  if (hasRelativeProtocol && !options.normalizeProtocol) {
    urlString = urlString.replace(/^http:\/\//, "//");
  }
  if (options.stripProtocol) {
    urlString = urlString.replace(/^(?:https?:)?\/\//, "");
  }
  return urlString;
}

// node_modules/responselike/index.js
var import_node_stream = require("node:stream");

// node_modules/responselike/node_modules/lowercase-keys/index.js
function lowercaseKeys(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key.toLowerCase(), value]));
}

// node_modules/responselike/index.js
var Response2 = class extends import_node_stream.Readable {
  statusCode;
  headers;
  body;
  url;
  complete;
  constructor({ statusCode, headers, body, url }) {
    if (typeof statusCode !== "number") {
      throw new TypeError("Argument `statusCode` should be a number");
    }
    if (typeof headers !== "object") {
      throw new TypeError("Argument `headers` should be an object");
    }
    if (!(body instanceof Uint8Array)) {
      throw new TypeError("Argument `body` should be a buffer");
    }
    if (typeof url !== "string") {
      throw new TypeError("Argument `url` should be a string");
    }
    let bodyPushed = false;
    super({
      read() {
        if (!bodyPushed) {
          bodyPushed = true;
          this.push(body);
          return;
        }
        this.push(null);
      }
    });
    this.statusCode = statusCode;
    this.headers = lowercaseKeys(headers);
    this.body = body;
    this.url = url;
    this.complete = true;
  }
};

// node_modules/cacheable-request/dist/types.js
var RequestError2 = class extends Error {
  constructor(error) {
    super(error.message);
    Object.defineProperties(this, Object.getOwnPropertyDescriptors(error));
  }
};
var CacheError2 = class extends Error {
  constructor(error) {
    super(error.message);
    Object.defineProperties(this, Object.getOwnPropertyDescriptors(error));
  }
};

// node_modules/cacheable-request/dist/index.js
var CacheableRequest = class {
  constructor(cacheRequest, cacheAdapter) {
    this.cache = new Keyv({ namespace: "cacheable-request" });
    this.hooks = /* @__PURE__ */ new Map();
    this.request = () => (options, callback) => {
      let url;
      if (typeof options === "string") {
        url = normalizeUrlObject(parseWithWhatwg(options));
        options = {};
      } else if (options instanceof import_node_url.default.URL) {
        url = normalizeUrlObject(parseWithWhatwg(options.toString()));
        options = {};
      } else {
        const [pathname, ...searchParts] = (options.path ?? "").split("?");
        const search = searchParts.length > 0 ? `?${searchParts.join("?")}` : "";
        url = normalizeUrlObject({ ...options, pathname, search });
      }
      options = {
        headers: {},
        method: "GET",
        cache: true,
        strictTtl: false,
        automaticFailover: false,
        ...options,
        ...urlObjectToRequestOptions(url)
      };
      options.headers = Object.fromEntries(entries(options.headers).map(([key2, value]) => [
        key2.toLowerCase(),
        value
      ]));
      const ee = new import_node_events2.default();
      const normalizedUrlString = normalizeUrl(import_node_url.default.format(url), {
        stripWWW: false,
        removeTrailingSlash: false,
        stripAuthentication: false
      });
      let key = `${options.method}:${normalizedUrlString}`;
      if (options.body && options.method !== void 0 && ["POST", "PATCH", "PUT"].includes(options.method)) {
        if (options.body instanceof import_node_stream2.default.Readable) {
          options.cache = false;
        } else {
          key += `:${import_node_crypto.default.createHash("md5").update(options.body).digest("hex")}`;
        }
      }
      let revalidate = false;
      let madeRequest = false;
      const makeRequest = (options_) => {
        madeRequest = true;
        let requestErrored = false;
        let requestErrorCallback = () => {
        };
        const requestErrorPromise = new Promise((resolve) => {
          requestErrorCallback = () => {
            if (!requestErrored) {
              requestErrored = true;
              resolve();
            }
          };
        });
        const handler = async (response) => {
          if (revalidate) {
            response.status = response.statusCode;
            const originalPolicy = import_http_cache_semantics.default.fromObject(revalidate.cachePolicy);
            const revalidatedPolicy = originalPolicy.revalidatedPolicy(options_, response);
            if (!revalidatedPolicy.modified) {
              response.resume();
              await new Promise((resolve) => {
                response.once("end", resolve);
              });
              const headers = convertHeaders(revalidatedPolicy.policy.responseHeaders());
              const originalHeaders = convertHeaders(originalPolicy.responseHeaders());
              const preserveHeaders = [
                "content-encoding",
                "content-type",
                "content-length",
                "content-language",
                "content-location",
                "etag"
              ];
              for (const headerName of preserveHeaders) {
                if (originalHeaders[headerName] !== void 0 && headers[headerName] === void 0) {
                  headers[headerName] = originalHeaders[headerName];
                }
              }
              response = new Response2({
                statusCode: revalidate.statusCode,
                headers,
                body: revalidate.body,
                url: revalidate.url
              });
              response.cachePolicy = revalidatedPolicy.policy;
              response.fromCache = true;
            }
          }
          if (!response.fromCache) {
            response.cachePolicy = new import_http_cache_semantics.default(options_, response, options_);
            response.fromCache = false;
          }
          let clonedResponse;
          if (options_.cache && response.cachePolicy.storable()) {
            clonedResponse = cloneResponse(response);
            (async () => {
              try {
                const bodyPromise = getStreamAsBuffer(response);
                await Promise.race([
                  requestErrorPromise,
                  new Promise((resolve) => response.once("end", resolve)),
                  new Promise((resolve) => response.once("close", resolve))
                ]);
                const body = await bodyPromise;
                let value = {
                  url: response.url,
                  statusCode: response.fromCache ? revalidate.statusCode : response.statusCode,
                  body,
                  cachePolicy: response.cachePolicy.toObject()
                };
                let ttl2 = options_.strictTtl ? response.cachePolicy.timeToLive() : void 0;
                if (options_.maxTtl) {
                  ttl2 = ttl2 ? Math.min(ttl2, options_.maxTtl) : options_.maxTtl;
                }
                if (this.hooks.size > 0) {
                  for (const key_ of this.hooks.keys()) {
                    value = await this.runHook(key_, value, response);
                  }
                }
                await this.cache.set(key, value, ttl2);
              } catch (error) {
                ee.emit("error", new CacheError2(error));
              }
            })();
          } else if (options_.cache && revalidate) {
            (async () => {
              try {
                await this.cache.delete(key);
              } catch (error) {
                ee.emit("error", new CacheError2(error));
              }
            })();
          }
          ee.emit("response", clonedResponse ?? response);
          if (typeof callback === "function") {
            callback(clonedResponse ?? response);
          }
        };
        try {
          const request_ = this.cacheRequest(options_, handler);
          request_.once("error", requestErrorCallback);
          request_.once("abort", requestErrorCallback);
          request_.once("destroy", requestErrorCallback);
          ee.emit("request", request_);
        } catch (error) {
          ee.emit("error", new RequestError2(error));
        }
      };
      (async () => {
        const get = async (options_) => {
          await Promise.resolve();
          const cacheEntry = options_.cache ? await this.cache.get(key) : void 0;
          if (cacheEntry === void 0 && !options_.forceRefresh) {
            makeRequest(options_);
            return;
          }
          const policy = import_http_cache_semantics.default.fromObject(cacheEntry.cachePolicy);
          if (policy.satisfiesWithoutRevalidation(options_) && !options_.forceRefresh) {
            const headers = convertHeaders(policy.responseHeaders());
            const bodyBuffer = cacheEntry.body;
            const body = Buffer.from(bodyBuffer);
            const response = new Response2({
              statusCode: cacheEntry.statusCode,
              headers,
              body,
              url: cacheEntry.url
            });
            response.cachePolicy = policy;
            response.fromCache = true;
            ee.emit("response", response);
            if (typeof callback === "function") {
              callback(response);
            }
          } else if (policy.satisfiesWithoutRevalidation(options_) && Date.now() >= policy.timeToLive() && options_.forceRefresh) {
            await this.cache.delete(key);
            options_.headers = policy.revalidationHeaders(options_);
            makeRequest(options_);
          } else {
            revalidate = cacheEntry;
            options_.headers = policy.revalidationHeaders(options_);
            makeRequest(options_);
          }
        };
        const errorHandler = (error) => ee.emit("error", new CacheError2(error));
        if (this.cache instanceof Keyv) {
          const cachek = this.cache;
          cachek.once("error", errorHandler);
          ee.on("error", () => {
            cachek.removeListener("error", errorHandler);
          });
          ee.on("response", () => {
            cachek.removeListener("error", errorHandler);
          });
        }
        try {
          await get(options);
        } catch (error) {
          if (options.automaticFailover && !madeRequest) {
            makeRequest(options);
          }
          ee.emit("error", new CacheError2(error));
        }
      })();
      return ee;
    };
    this.addHook = (name, function_) => {
      if (!this.hooks.has(name)) {
        this.hooks.set(name, function_);
      }
    };
    this.removeHook = (name) => this.hooks.delete(name);
    this.getHook = (name) => this.hooks.get(name);
    this.runHook = async (name, ...arguments_) => this.hooks.get(name)?.(...arguments_);
    if (cacheAdapter) {
      if (cacheAdapter instanceof Keyv) {
        this.cache = cacheAdapter;
      } else {
        this.cache = new Keyv({
          store: cacheAdapter,
          namespace: "cacheable-request"
        });
      }
    }
    this.request = this.request.bind(this);
    this.cacheRequest = cacheRequest;
  }
};
var entries = Object.entries;
var cloneResponse = (response) => {
  const clone = new import_node_stream2.PassThrough({ autoDestroy: false });
  mimicResponse(response, clone);
  return response.pipe(clone);
};
var urlObjectToRequestOptions = (url) => {
  const options = { ...url };
  options.path = `${url.pathname || "/"}${url.search || ""}`;
  delete options.pathname;
  delete options.search;
  return options;
};
var normalizeUrlObject = (url) => (
  // If url was parsed by url.parse or new URL:
  // - hostname will be set
  // - host will be hostname[:port]
  // - port will be set if it was explicit in the parsed string
  // Otherwise, url was from request options:
  // - hostname or host may be set
  // - host shall not have port encoded
  {
    protocol: url.protocol,
    auth: url.auth,
    hostname: url.hostname || url.host || "localhost",
    port: url.port,
    pathname: url.pathname,
    search: url.search
  }
);
var convertHeaders = (headers) => {
  const result = [];
  for (const name of Object.keys(headers)) {
    result[name.toLowerCase()] = headers[name];
  }
  return result;
};
var parseWithWhatwg = (raw) => {
  const u2 = new import_node_url.URL(raw);
  return {
    protocol: u2.protocol,
    // E.g. 'https:'
    slashes: true,
    // Always true for WHATWG URLs
    /* c8 ignore next 3 */
    auth: u2.username || u2.password ? `${u2.username}:${u2.password}` : void 0,
    host: u2.host,
    // E.g. 'example.com:8080'
    port: u2.port,
    // E.g. '8080'
    hostname: u2.hostname,
    // E.g. 'example.com'
    hash: u2.hash,
    // E.g. '#quux'
    search: u2.search,
    // E.g. '?bar=baz'
    query: Object.fromEntries(u2.searchParams),
    // { bar: 'baz' }
    pathname: u2.pathname,
    // E.g. '/foo'
    path: u2.pathname + u2.search,
    // '/foo?bar=baz'
    href: u2.href
    // Full serialized URL
  };
};
var dist_default = CacheableRequest;

// node_modules/decompress-response/index.js
var import_node_stream3 = require("node:stream");
var import_node_zlib = __toESM(require("node:zlib"), 1);
var supportsZstd = typeof import_node_zlib.default.createZstdDecompress === "function";
function decompressResponse(response) {
  const contentEncoding = (response.headers["content-encoding"] || "").toLowerCase();
  const supportedEncodings = ["gzip", "deflate", "br"];
  if (supportsZstd) {
    supportedEncodings.push("zstd");
  }
  if (!supportedEncodings.includes(contentEncoding)) {
    return response;
  }
  let isEmpty = true;
  const headers = { ...response.headers };
  const finalStream = new import_node_stream3.PassThrough({
    autoDestroy: false
  });
  finalStream.once("error", () => {
    response.destroy();
  });
  function handleContentEncoding(data) {
    let decompressStream;
    if (contentEncoding === "zstd") {
      decompressStream = import_node_zlib.default.createZstdDecompress();
    } else if (contentEncoding === "br") {
      decompressStream = import_node_zlib.default.createBrotliDecompress();
    } else if (contentEncoding === "deflate" && data.length > 0 && (data[0] & 8) === 0) {
      decompressStream = import_node_zlib.default.createInflateRaw();
    } else {
      decompressStream = import_node_zlib.default.createUnzip();
    }
    decompressStream.once("error", (error) => {
      if (isEmpty && !response.readable) {
        finalStream.end();
        return;
      }
      finalStream.destroy(error);
    });
    checker.pipe(decompressStream).pipe(finalStream);
  }
  const checker = new import_node_stream3.Transform({
    transform(data, _encoding, callback) {
      if (isEmpty === false) {
        callback(null, data);
        return;
      }
      isEmpty = false;
      handleContentEncoding(data);
      callback(null, data);
    },
    flush(callback) {
      if (isEmpty) {
        finalStream.end();
      }
      callback();
    }
  });
  delete headers["content-encoding"];
  delete headers["content-length"];
  finalStream.headers = headers;
  mimicResponse(response, finalStream);
  response.pipe(checker);
  return finalStream;
}

// node_modules/got/dist/source/core/utils/timer.js
var import_node_events3 = require("node:events");
var import_node_util = require("node:util");

// node_modules/got/dist/source/core/utils/defer-to-connect.js
function isTlsSocket(socket) {
  return "encrypted" in socket;
}
var deferToConnect = (socket, fn) => {
  const listeners = typeof fn === "function" ? { connect: fn } : fn;
  const onConnect = () => {
    listeners.connect?.();
    if (isTlsSocket(socket) && listeners.secureConnect) {
      if (socket.authorized) {
        listeners.secureConnect();
      } else {
        socket.once("secureConnect", listeners.secureConnect);
      }
    }
    if (listeners.close) {
      socket.once("close", listeners.close);
    }
  };
  if (socket.writable && !socket.connecting) {
    onConnect();
  } else if (socket.connecting) {
    socket.once("connect", onConnect);
  } else if (socket.destroyed && listeners.close) {
    const hadError = "_hadError" in socket ? Boolean(socket._hadError) : false;
    listeners.close(hadError);
  }
};
var defer_to_connect_default = deferToConnect;

// node_modules/got/dist/source/core/utils/timer.js
var getInitialConnectionTimings = (socket) => Reflect.get(socket, "__initial_connection_timings__");
var setInitialConnectionTimings = (socket, timings) => {
  Reflect.set(socket, "__initial_connection_timings__", timings);
};
var timer = (request) => {
  if (request.timings) {
    return request.timings;
  }
  const timings = {
    start: Date.now(),
    socket: void 0,
    lookup: void 0,
    connect: void 0,
    secureConnect: void 0,
    upload: void 0,
    response: void 0,
    end: void 0,
    error: void 0,
    abort: void 0,
    phases: {
      wait: void 0,
      dns: void 0,
      tcp: void 0,
      tls: void 0,
      request: void 0,
      firstByte: void 0,
      download: void 0,
      total: void 0
    }
  };
  request.timings = timings;
  const handleError = (origin) => {
    origin.once(import_node_events3.errorMonitor, () => {
      timings.error = Date.now();
      timings.phases.total = timings.error - timings.start;
    });
  };
  handleError(request);
  const onAbort = () => {
    timings.abort = Date.now();
    timings.phases.total = timings.abort - timings.start;
  };
  request.prependOnceListener("abort", onAbort);
  const onSocket = (socket) => {
    timings.socket = Date.now();
    timings.phases.wait = timings.socket - timings.start;
    if (import_node_util.types.isProxy(socket)) {
      return;
    }
    const socketAlreadyConnected = socket.writable && !socket.connecting;
    if (socketAlreadyConnected) {
      timings.lookup = timings.socket;
      timings.connect = timings.socket;
      const initialConnectionTimings = getInitialConnectionTimings(socket);
      if (initialConnectionTimings) {
        timings.phases.dns = initialConnectionTimings.dnsPhase;
        timings.phases.tcp = initialConnectionTimings.tcpPhase;
        timings.phases.tls = initialConnectionTimings.tlsPhase;
        if (timings.phases.tls !== void 0) {
          timings.secureConnect = timings.socket;
        }
      } else {
        timings.phases.dns = 0;
        timings.phases.tcp = 0;
      }
      return;
    }
    const lookupListener = () => {
      timings.lookup = Date.now();
      timings.phases.dns = timings.lookup - timings.socket;
    };
    socket.prependOnceListener("lookup", lookupListener);
    defer_to_connect_default(socket, {
      connect() {
        timings.connect = Date.now();
        if (timings.lookup === void 0) {
          socket.removeListener("lookup", lookupListener);
          timings.lookup = timings.socket;
          timings.phases.dns = 0;
        }
        timings.phases.tcp = timings.connect - timings.lookup;
        if (timings.phases.tcp === 0 && timings.phases.dns && timings.phases.dns > 0) {
          timings.phases.dns = 0;
        }
        if (!getInitialConnectionTimings(socket)) {
          setInitialConnectionTimings(socket, {
            dnsPhase: timings.phases.dns,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- TypeScript can't prove this is defined due to callback structure
            tcpPhase: timings.phases.tcp
          });
        }
      },
      secureConnect() {
        timings.secureConnect = Date.now();
        timings.phases.tls = timings.secureConnect - timings.connect;
        const initialConnectionTimings = getInitialConnectionTimings(socket);
        if (initialConnectionTimings) {
          initialConnectionTimings.tlsPhase = timings.phases.tls;
        }
      }
    });
  };
  if (request.socket) {
    onSocket(request.socket);
  } else {
    request.prependOnceListener("socket", onSocket);
  }
  const onUpload = () => {
    timings.upload = Date.now();
    const secureOrConnect = timings.secureConnect ?? timings.connect;
    if (secureOrConnect !== void 0) {
      timings.phases.request = timings.upload - secureOrConnect;
    }
  };
  if (request.writableFinished) {
    onUpload();
  } else {
    request.prependOnceListener("finish", onUpload);
  }
  request.prependOnceListener("response", (response) => {
    timings.response = Date.now();
    timings.phases.firstByte = timings.response - timings.upload;
    response.timings = timings;
    handleError(response);
    response.prependOnceListener("end", () => {
      request.off("abort", onAbort);
      response.off("aborted", onAbort);
      if (timings.phases.total !== void 0) {
        return;
      }
      timings.end = Date.now();
      timings.phases.download = timings.end - timings.response;
      timings.phases.total = timings.end - timings.start;
    });
    response.prependOnceListener("aborted", onAbort);
  });
  return timings;
};
var timer_default = timer;

// node_modules/got/dist/source/core/utils/get-body-size.js
function getBodySize(body, headers) {
  if (headers && "content-length" in headers) {
    return Number(headers["content-length"]);
  }
  if (!body) {
    return 0;
  }
  if (distribution_default.string(body)) {
    return stringToUint8Array(body).byteLength;
  }
  if (distribution_default.buffer(body)) {
    return body.length;
  }
  if (distribution_default.typedArray(body)) {
    return body.byteLength;
  }
  return void 0;
}

// node_modules/got/dist/source/core/utils/proxy-events.js
function proxyEvents(from, to, events) {
  const eventFunctions = /* @__PURE__ */ new Map();
  for (const event of events) {
    const eventFunction = (...arguments_) => {
      to.emit(event, ...arguments_);
    };
    eventFunctions.set(event, eventFunction);
    from.on(event, eventFunction);
  }
  return () => {
    for (const [event, eventFunction] of eventFunctions) {
      from.off(event, eventFunction);
    }
  };
}

// node_modules/got/dist/source/core/timed-out.js
var import_node_net = __toESM(require("node:net"), 1);

// node_modules/got/dist/source/core/utils/unhandle.js
function unhandle() {
  const handlers = [];
  return {
    once(origin, event, function_) {
      origin.once(event, function_);
      handlers.push({ origin, event, fn: function_ });
    },
    unhandleAll() {
      for (const { origin, event, fn } of handlers) {
        origin.removeListener(event, fn);
      }
      handlers.length = 0;
    }
  };
}

// node_modules/got/dist/source/core/timed-out.js
var reentry = Symbol("reentry");
var noop2 = () => {
};
var TimeoutError2 = class extends Error {
  name = "TimeoutError";
  code = "ETIMEDOUT";
  event;
  constructor(threshold, event) {
    super(`Timeout awaiting '${event}' for ${threshold}ms`);
    this.event = event;
  }
};
function timedOut(request, delays, options) {
  if (reentry in request) {
    return noop2;
  }
  request[reentry] = true;
  const cancelers = [];
  const { once, unhandleAll } = unhandle();
  const handled = /* @__PURE__ */ new Set();
  const addTimeout = (delay2, callback, event) => {
    const timeout = setTimeout(callback, delay2, delay2, event);
    timeout.unref?.();
    const cancel = () => {
      handled.add(event);
      clearTimeout(timeout);
    };
    cancelers.push(cancel);
    return cancel;
  };
  const { host, hostname } = options;
  const timeoutHandler = (delay2, event) => {
    setTimeout(() => {
      if (!handled.has(event)) {
        request.destroy(new TimeoutError2(delay2, event));
      }
    }, 0);
  };
  const cancelTimeouts = () => {
    for (const cancel of cancelers) {
      cancel();
    }
    unhandleAll();
  };
  request.once("error", (error) => {
    cancelTimeouts();
    if (request.listenerCount("error") === 0) {
      throw error;
    }
  });
  if (delays.request !== void 0) {
    const cancelTimeout = addTimeout(delays.request, timeoutHandler, "request");
    once(request, "response", (response) => {
      once(response, "end", cancelTimeout);
    });
  }
  if (delays.socket !== void 0) {
    const { socket } = delays;
    const socketTimeoutHandler = () => {
      timeoutHandler(socket, "socket");
    };
    request.setTimeout(socket, socketTimeoutHandler);
    cancelers.push(() => {
      request.removeListener("timeout", socketTimeoutHandler);
    });
  }
  const hasLookup = delays.lookup !== void 0;
  const hasConnect = delays.connect !== void 0;
  const hasSecureConnect = delays.secureConnect !== void 0;
  const hasSend = delays.send !== void 0;
  if (hasLookup || hasConnect || hasSecureConnect || hasSend) {
    once(request, "socket", (socket) => {
      const { socketPath } = request;
      if (socket.connecting) {
        const hasPath = Boolean(socketPath ?? import_node_net.default.isIP(hostname ?? host ?? "") !== 0);
        if (hasLookup && !hasPath && socket.address().address === void 0) {
          const cancelTimeout = addTimeout(delays.lookup, timeoutHandler, "lookup");
          once(socket, "lookup", cancelTimeout);
        }
        if (hasConnect) {
          const timeConnect = () => addTimeout(delays.connect, timeoutHandler, "connect");
          if (hasPath) {
            once(socket, "connect", timeConnect());
          } else {
            once(socket, "lookup", (error) => {
              if (error === null) {
                once(socket, "connect", timeConnect());
              }
            });
          }
        }
        if (hasSecureConnect && options.protocol === "https:") {
          once(socket, "connect", () => {
            const cancelTimeout = addTimeout(delays.secureConnect, timeoutHandler, "secureConnect");
            once(socket, "secureConnect", cancelTimeout);
          });
        }
      }
      if (hasSend) {
        const timeRequest = () => addTimeout(delays.send, timeoutHandler, "send");
        if (socket.connecting) {
          once(socket, "connect", () => {
            once(request, "upload-complete", timeRequest());
          });
        } else {
          once(request, "upload-complete", timeRequest());
        }
      }
    });
  }
  if (delays.response !== void 0) {
    once(request, "upload-complete", () => {
      const cancelTimeout = addTimeout(delays.response, timeoutHandler, "response");
      once(request, "response", cancelTimeout);
    });
  }
  if (delays.read !== void 0) {
    once(request, "response", (response) => {
      const cancelTimeout = addTimeout(delays.read, timeoutHandler, "read");
      once(response, "end", cancelTimeout);
    });
  }
  return cancelTimeouts;
}

// node_modules/got/dist/source/core/utils/weakable-map.js
var WeakableMap = class {
  weakMap = /* @__PURE__ */ new WeakMap();
  map = /* @__PURE__ */ new Map();
  set(key, value) {
    if (typeof key === "object") {
      this.weakMap.set(key, value);
    } else {
      this.map.set(key, value);
    }
  }
  get(key) {
    if (typeof key === "object") {
      return this.weakMap.get(key);
    }
    return this.map.get(key);
  }
  has(key) {
    if (typeof key === "object") {
      return this.weakMap.has(key);
    }
    return this.map.has(key);
  }
};

// node_modules/got/dist/source/core/calculate-retry-delay.js
var calculateRetryDelay = ({ attemptCount, retryOptions, error, retryAfter, computedValue }) => {
  if (error.name === "RetryError") {
    return 1;
  }
  if (attemptCount > retryOptions.limit) {
    return 0;
  }
  const hasMethod = retryOptions.methods.includes(error.options.method);
  const hasErrorCode = retryOptions.errorCodes.includes(error.code);
  const hasStatusCode = error.response && retryOptions.statusCodes.includes(error.response.statusCode);
  if (!hasMethod || !hasErrorCode && !hasStatusCode) {
    return 0;
  }
  if (error.response) {
    if (retryAfter) {
      return retryAfter > computedValue ? 0 : retryAfter;
    }
    if (error.response.statusCode === 413) {
      return 0;
    }
  }
  const noise = Math.random() * retryOptions.noise;
  return Math.min(2 ** (attemptCount - 1) * 1e3, retryOptions.backoffLimit) + noise;
};
var calculate_retry_delay_default = calculateRetryDelay;

// node_modules/got/dist/source/core/options.js
var import_node_process = __toESM(require("node:process"), 1);
var import_node_util3 = require("node:util");
var import_node_tls = require("node:tls");
var import_node_https = __toESM(require("node:https"), 1);
var import_node_http = __toESM(require("node:http"), 1);

// node_modules/lowercase-keys/index.js
function lowercaseKeys2(object, { onConflict } = {}) {
  if (typeof object !== "object" || object === null) {
    throw new TypeError(`Expected an object, got ${object === null ? "null" : typeof object}`);
  }
  const result = {};
  for (const [key, value] of Object.entries(object)) {
    const lowercasedKey = key.toLowerCase();
    const hasExistingKey = Object.hasOwn(result, lowercasedKey);
    const existingValue = hasExistingKey ? result[lowercasedKey] : void 0;
    const resolvedValue = onConflict && hasExistingKey ? onConflict({ key: lowercasedKey, newValue: value, existingValue }) : value;
    Object.defineProperty(result, lowercasedKey, {
      value: resolvedValue,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  return result;
}

// node_modules/cacheable-lookup/source/index.js
var import_node_dns = require("node:dns");
var import_node_util2 = require("node:util");
var import_node_os = __toESM(require("node:os"), 1);
var { Resolver: AsyncResolver } = import_node_dns.promises;
var kCacheableLookupCreateConnection = Symbol("cacheableLookupCreateConnection");
var kCacheableLookupInstance = Symbol("cacheableLookupInstance");
var kExpires = Symbol("expires");
var supportsALL = typeof import_node_dns.ALL === "number";
var verifyAgent = (agent) => {
  if (!(agent && typeof agent.createConnection === "function")) {
    throw new Error("Expected an Agent instance as the first argument");
  }
};
var map4to6 = (entries2) => {
  for (const entry of entries2) {
    if (entry.family === 6) {
      continue;
    }
    entry.address = `::ffff:${entry.address}`;
    entry.family = 6;
  }
};
var getIfaceInfo = () => {
  let has4 = false;
  let has6 = false;
  for (const device of Object.values(import_node_os.default.networkInterfaces())) {
    for (const iface of device) {
      if (iface.internal) {
        continue;
      }
      if (iface.family === "IPv6") {
        has6 = true;
      } else {
        has4 = true;
      }
      if (has4 && has6) {
        return { has4, has6 };
      }
    }
  }
  return { has4, has6 };
};
var isIterable2 = (map) => {
  return Symbol.iterator in map;
};
var ignoreNoResultErrors = (dnsPromise) => {
  return dnsPromise.catch((error) => {
    if (error.code === "ENODATA" || error.code === "ENOTFOUND" || error.code === "ENOENT") {
      return [];
    }
    throw error;
  });
};
var ttl = { ttl: true };
var all = { all: true };
var all4 = { all: true, family: 4 };
var all6 = { all: true, family: 6 };
var CacheableLookup = class {
  constructor({
    cache = /* @__PURE__ */ new Map(),
    maxTtl = Infinity,
    fallbackDuration = 3600,
    errorTtl = 0.15,
    resolver = new AsyncResolver(),
    lookup = import_node_dns.lookup
  } = {}) {
    this.maxTtl = maxTtl;
    this.errorTtl = errorTtl;
    this._cache = cache;
    this._resolver = resolver;
    this._dnsLookup = lookup && (0, import_node_util2.promisify)(lookup);
    this.stats = {
      cache: 0,
      query: 0
    };
    if (this._resolver instanceof AsyncResolver) {
      this._resolve4 = this._resolver.resolve4.bind(this._resolver);
      this._resolve6 = this._resolver.resolve6.bind(this._resolver);
    } else {
      this._resolve4 = (0, import_node_util2.promisify)(this._resolver.resolve4.bind(this._resolver));
      this._resolve6 = (0, import_node_util2.promisify)(this._resolver.resolve6.bind(this._resolver));
    }
    this._iface = getIfaceInfo();
    this._pending = {};
    this._nextRemovalTime = false;
    this._hostnamesToFallback = /* @__PURE__ */ new Set();
    this.fallbackDuration = fallbackDuration;
    if (fallbackDuration > 0) {
      const interval = setInterval(() => {
        this._hostnamesToFallback.clear();
      }, fallbackDuration * 1e3);
      if (interval.unref) {
        interval.unref();
      }
      this._fallbackInterval = interval;
    }
    this.lookup = this.lookup.bind(this);
    this.lookupAsync = this.lookupAsync.bind(this);
  }
  set servers(servers) {
    this.clear();
    this._resolver.setServers(servers);
  }
  get servers() {
    return this._resolver.getServers();
  }
  lookup(hostname, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if (typeof options === "number") {
      options = {
        family: options
      };
    }
    if (!callback) {
      throw new Error("Callback must be a function.");
    }
    this.lookupAsync(hostname, options).then((result) => {
      if (options.all) {
        callback(null, result);
      } else {
        callback(null, result.address, result.family, result.expires, result.ttl, result.source);
      }
    }, callback);
  }
  async lookupAsync(hostname, options = {}) {
    if (typeof options === "number") {
      options = {
        family: options
      };
    }
    let cached = await this.query(hostname);
    if (options.family === 6) {
      const filtered = cached.filter((entry) => entry.family === 6);
      if (options.hints & import_node_dns.V4MAPPED) {
        if (supportsALL && options.hints & import_node_dns.ALL || filtered.length === 0) {
          map4to6(cached);
        } else {
          cached = filtered;
        }
      } else {
        cached = filtered;
      }
    } else if (options.family === 4) {
      cached = cached.filter((entry) => entry.family === 4);
    }
    if (options.hints & import_node_dns.ADDRCONFIG) {
      const { _iface } = this;
      cached = cached.filter((entry) => entry.family === 6 ? _iface.has6 : _iface.has4);
    }
    if (cached.length === 0) {
      const error = new Error(`cacheableLookup ENOTFOUND ${hostname}`);
      error.code = "ENOTFOUND";
      error.hostname = hostname;
      throw error;
    }
    if (options.all) {
      return cached;
    }
    return cached[0];
  }
  async query(hostname) {
    let source = "cache";
    let cached = await this._cache.get(hostname);
    if (cached) {
      this.stats.cache++;
    }
    if (!cached) {
      const pending = this._pending[hostname];
      if (pending) {
        this.stats.cache++;
        cached = await pending;
      } else {
        source = "query";
        const newPromise = this.queryAndCache(hostname);
        this._pending[hostname] = newPromise;
        this.stats.query++;
        try {
          cached = await newPromise;
        } finally {
          delete this._pending[hostname];
        }
      }
    }
    cached = cached.map((entry) => {
      return { ...entry, source };
    });
    return cached;
  }
  async _resolve(hostname) {
    const [A, AAAA] = await Promise.all([
      ignoreNoResultErrors(this._resolve4(hostname, ttl)),
      ignoreNoResultErrors(this._resolve6(hostname, ttl))
    ]);
    let aTtl = 0;
    let aaaaTtl = 0;
    let cacheTtl = 0;
    const now = Date.now();
    for (const entry of A) {
      entry.family = 4;
      entry.expires = now + entry.ttl * 1e3;
      aTtl = Math.max(aTtl, entry.ttl);
    }
    for (const entry of AAAA) {
      entry.family = 6;
      entry.expires = now + entry.ttl * 1e3;
      aaaaTtl = Math.max(aaaaTtl, entry.ttl);
    }
    if (A.length > 0) {
      if (AAAA.length > 0) {
        cacheTtl = Math.min(aTtl, aaaaTtl);
      } else {
        cacheTtl = aTtl;
      }
    } else {
      cacheTtl = aaaaTtl;
    }
    return {
      entries: [
        ...A,
        ...AAAA
      ],
      cacheTtl
    };
  }
  async _lookup(hostname) {
    try {
      const [A, AAAA] = await Promise.all([
        // Passing {all: true} doesn't return all IPv4 and IPv6 entries.
        // See https://github.com/szmarczak/cacheable-lookup/issues/42
        ignoreNoResultErrors(this._dnsLookup(hostname, all4)),
        ignoreNoResultErrors(this._dnsLookup(hostname, all6))
      ]);
      return {
        entries: [
          ...A,
          ...AAAA
        ],
        cacheTtl: 0
      };
    } catch {
      return {
        entries: [],
        cacheTtl: 0
      };
    }
  }
  async _set(hostname, data, cacheTtl) {
    if (this.maxTtl > 0 && cacheTtl > 0) {
      cacheTtl = Math.min(cacheTtl, this.maxTtl) * 1e3;
      data[kExpires] = Date.now() + cacheTtl;
      try {
        await this._cache.set(hostname, data, cacheTtl);
      } catch (error) {
        this.lookupAsync = async () => {
          const cacheError = new Error("Cache Error. Please recreate the CacheableLookup instance.");
          cacheError.cause = error;
          throw cacheError;
        };
      }
      if (isIterable2(this._cache)) {
        this._tick(cacheTtl);
      }
    }
  }
  async queryAndCache(hostname) {
    if (this._hostnamesToFallback.has(hostname)) {
      return this._dnsLookup(hostname, all);
    }
    let query = await this._resolve(hostname);
    if (query.entries.length === 0 && this._dnsLookup) {
      query = await this._lookup(hostname);
      if (query.entries.length !== 0 && this.fallbackDuration > 0) {
        this._hostnamesToFallback.add(hostname);
      }
    }
    const cacheTtl = query.entries.length === 0 ? this.errorTtl : query.cacheTtl;
    await this._set(hostname, query.entries, cacheTtl);
    return query.entries;
  }
  _tick(ms) {
    const nextRemovalTime = this._nextRemovalTime;
    if (!nextRemovalTime || ms < nextRemovalTime) {
      clearTimeout(this._removalTimeout);
      this._nextRemovalTime = ms;
      this._removalTimeout = setTimeout(() => {
        this._nextRemovalTime = false;
        let nextExpiry = Infinity;
        const now = Date.now();
        for (const [hostname, entries2] of this._cache) {
          const expires = entries2[kExpires];
          if (now >= expires) {
            this._cache.delete(hostname);
          } else if (expires < nextExpiry) {
            nextExpiry = expires;
          }
        }
        if (nextExpiry !== Infinity) {
          this._tick(nextExpiry - now);
        }
      }, ms);
      if (this._removalTimeout.unref) {
        this._removalTimeout.unref();
      }
    }
  }
  install(agent) {
    verifyAgent(agent);
    if (kCacheableLookupCreateConnection in agent) {
      throw new Error("CacheableLookup has been already installed");
    }
    agent[kCacheableLookupCreateConnection] = agent.createConnection;
    agent[kCacheableLookupInstance] = this;
    agent.createConnection = (options, callback) => {
      if (!("lookup" in options)) {
        options.lookup = this.lookup;
      }
      return agent[kCacheableLookupCreateConnection](options, callback);
    };
  }
  uninstall(agent) {
    verifyAgent(agent);
    if (agent[kCacheableLookupCreateConnection]) {
      if (agent[kCacheableLookupInstance] !== this) {
        throw new Error("The agent is not owned by this CacheableLookup instance");
      }
      agent.createConnection = agent[kCacheableLookupCreateConnection];
      delete agent[kCacheableLookupCreateConnection];
      delete agent[kCacheableLookupInstance];
    }
  }
  updateInterfaceInfo() {
    const { _iface } = this;
    this._iface = getIfaceInfo();
    if (_iface.has4 && !this._iface.has4 || _iface.has6 && !this._iface.has6) {
      this._cache.clear();
    }
  }
  clear(hostname) {
    if (hostname) {
      this._cache.delete(hostname);
      return;
    }
    this._cache.clear();
  }
};

// node_modules/got/dist/source/core/options.js
var import_http2_wrapper = __toESM(require_source(), 1);

// node_modules/got/dist/source/core/parse-link-header.js
var splitHeaderValue = (value, separator) => {
  const values = [];
  let current = "";
  let inQuotes = false;
  let inReference = false;
  let isEscaped = false;
  for (const character of value) {
    if (inQuotes && isEscaped) {
      current += character;
      isEscaped = false;
      continue;
    }
    if (inQuotes && character === "\\") {
      current += character;
      isEscaped = true;
      continue;
    }
    if (character === '"') {
      inQuotes = !inQuotes;
      current += character;
      continue;
    }
    if (!inQuotes && character === "<") {
      inReference = true;
      current += character;
      continue;
    }
    if (!inQuotes && character === ">") {
      inReference = false;
      current += character;
      continue;
    }
    if (!inQuotes && !inReference && character === separator) {
      values.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  if (inQuotes || isEscaped) {
    throw new Error(`Failed to parse Link header: ${value}`);
  }
  values.push(current);
  return values;
};
function parseLinkHeader(link) {
  const parsed = [];
  const items = splitHeaderValue(link, ",");
  for (const item of items) {
    const [rawUriReference, ...rawLinkParameters] = splitHeaderValue(item, ";");
    const trimmedUriReference = rawUriReference.trim();
    if (trimmedUriReference[0] !== "<" || trimmedUriReference.at(-1) !== ">") {
      throw new Error(`Invalid format of the Link header reference: ${trimmedUriReference}`);
    }
    const reference = trimmedUriReference.slice(1, -1);
    const parameters = {};
    if (reference.includes("<") || reference.includes(">")) {
      throw new Error(`Invalid format of the Link header reference: ${trimmedUriReference}`);
    }
    if (rawLinkParameters.length === 0) {
      throw new Error(`Unexpected end of Link header parameters: ${rawLinkParameters.join(";")}`);
    }
    for (const rawParameter of rawLinkParameters) {
      const trimmedRawParameter = rawParameter.trim();
      const center = trimmedRawParameter.indexOf("=");
      if (center === -1) {
        throw new Error(`Failed to parse Link header: ${link}`);
      }
      const name = trimmedRawParameter.slice(0, center).trim();
      const value = trimmedRawParameter.slice(center + 1).trim();
      parameters[name] = value;
    }
    parsed.push({
      reference,
      parameters
    });
  }
  return parsed;
}

// node_modules/got/dist/source/core/utils/is-unix-socket-url.js
function isUnixSocketUrl(url) {
  return url.protocol === "unix:" || url.hostname === "unix";
}
function getUnixSocketPath(url) {
  if (!isUnixSocketUrl(url)) {
    return void 0;
  }
  return new RegExp("^(?<socketPath>[^:]+):", "v").exec(`${url.pathname}${url.search}`)?.groups?.socketPath;
}

// node_modules/got/dist/source/core/options.js
var [major, minor] = import_node_process.default.versions.node.split(".").map(Number);
function wrapAssertionWithContext(optionName, assertionFn) {
  try {
    assertionFn();
  } catch (error) {
    if (error instanceof Error) {
      error.message = `Option '${optionName}': ${error.message}`;
    }
    throw error;
  }
}
function assertAny2(optionName, validators, value) {
  wrapAssertionWithContext(optionName, () => {
    assert.any(validators, value);
  });
}
function assertPlainObject2(optionName, value) {
  wrapAssertionWithContext(optionName, () => {
    assert.plainObject(value);
  });
}
function isSameOrigin(previousUrl, nextUrl) {
  return previousUrl.origin === nextUrl.origin && getUnixSocketPath(previousUrl) === getUnixSocketPath(nextUrl);
}
var crossOriginStripHeaders = ["host", "cookie", "cookie2", "authorization", "proxy-authorization"];
var bodyHeaderNames = ["content-length", "content-encoding", "content-language", "content-location", "content-type", "transfer-encoding"];
function usesUnixSocket(url) {
  return url.protocol === "unix:" || getUnixSocketPath(url) !== void 0;
}
function hasCredentialInUrl(url, credential) {
  if (url instanceof URL) {
    return url[credential] !== "";
  }
  if (!distribution_default.string(url)) {
    return false;
  }
  try {
    return new URL(url)[credential] !== "";
  } catch {
    return false;
  }
}
var hasExplicitCredentialInUrlChange = (changedState, url, credential) => changedState.has(credential) || changedState.has("url") && url?.[credential] !== "";
var hasProtocolSlashes = (value) => new RegExp("^[a-z][\\d+\\-.a-z]*:\\/\\/", "iv").test(value);
var hasHttpProtocolWithoutSlashes = (value) => new RegExp("^https?:(?!\\/\\/)", "iv").test(value);
function applyUrlOverride(options, url, { username, password } = {}) {
  if (distribution_default.string(url) && options.url) {
    url = new URL(url, options.url).toString();
  }
  options.prefixUrl = "";
  options.url = url;
  if (username !== void 0) {
    options.username = username;
  }
  if (password !== void 0) {
    options.password = password;
  }
  return options.url;
}
function assertValidHeaderName(name) {
  if (name.startsWith(":")) {
    throw new TypeError(`HTTP/2 pseudo-headers are not supported in \`options.headers\`: ${name}`);
  }
}
function safeObjectAssign(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (key === "__proto__") {
      continue;
    }
    Reflect.set(target, key, value);
  }
}
var isToughCookieJar = (cookieJar) => cookieJar.setCookie.length === 4 && cookieJar.getCookieString.length === 0;
function validateSearchParameters(searchParameters) {
  for (const key of Object.keys(searchParameters)) {
    if (key === "__proto__") {
      continue;
    }
    const value = searchParameters[key];
    assertAny2(`searchParams.${key}`, [distribution_default.string, distribution_default.number, distribution_default.boolean, distribution_default.null, distribution_default.undefined], value);
  }
}
var globalCache = /* @__PURE__ */ new Map();
var globalDnsCache;
var getGlobalDnsCache = () => {
  if (globalDnsCache) {
    return globalDnsCache;
  }
  globalDnsCache = new CacheableLookup();
  return globalDnsCache;
};
var wrapQuickLruIfNeeded = (value) => {
  if (value?.[Symbol.toStringTag] === "QuickLRU" && typeof value.evict === "function") {
    return {
      get(key) {
        return value.get(key);
      },
      set(key, cacheValue, ttl2) {
        if (ttl2 === void 0) {
          value.set(key, cacheValue);
        } else {
          value.set(key, cacheValue, { maxAge: ttl2 });
        }
        return true;
      },
      delete(key) {
        return value.delete(key);
      },
      clear() {
        return value.clear();
      },
      has(key) {
        return value.has(key);
      }
    };
  }
  return value;
};
var defaultInternals = {
  request: void 0,
  agent: {
    http: void 0,
    https: void 0,
    http2: void 0
  },
  h2session: void 0,
  decompress: true,
  timeout: {
    connect: void 0,
    lookup: void 0,
    read: void 0,
    request: void 0,
    response: void 0,
    secureConnect: void 0,
    send: void 0,
    socket: void 0
  },
  prefixUrl: "",
  body: void 0,
  form: void 0,
  json: void 0,
  cookieJar: void 0,
  ignoreInvalidCookies: false,
  searchParams: void 0,
  dnsLookup: void 0,
  dnsCache: void 0,
  context: {},
  hooks: {
    init: [],
    beforeRequest: [],
    beforeError: [],
    beforeRedirect: [],
    beforeRetry: [],
    beforeCache: [],
    afterResponse: []
  },
  followRedirect: true,
  maxRedirects: 10,
  cache: void 0,
  throwHttpErrors: true,
  username: "",
  password: "",
  http2: false,
  allowGetBody: false,
  copyPipedHeaders: false,
  headers: {
    "user-agent": "got (https://github.com/sindresorhus/got)"
  },
  methodRewriting: false,
  dnsLookupIpVersion: void 0,
  parseJson: JSON.parse,
  stringifyJson: JSON.stringify,
  retry: {
    limit: 2,
    methods: [
      "GET",
      "PUT",
      "HEAD",
      "DELETE",
      "OPTIONS",
      "TRACE"
    ],
    statusCodes: [
      408,
      413,
      429,
      500,
      502,
      503,
      504,
      521,
      522,
      524
    ],
    errorCodes: [
      "ETIMEDOUT",
      "ECONNRESET",
      "EADDRINUSE",
      "ECONNREFUSED",
      "EPIPE",
      "ENOTFOUND",
      "ENETUNREACH",
      "EAI_AGAIN"
    ],
    maxRetryAfter: void 0,
    calculateDelay: ({ computedValue }) => computedValue,
    backoffLimit: Number.POSITIVE_INFINITY,
    noise: 100,
    enforceRetryRules: true
  },
  localAddress: void 0,
  method: "GET",
  createConnection: void 0,
  cacheOptions: {
    shared: void 0,
    cacheHeuristic: void 0,
    immutableMinTimeToLive: void 0,
    ignoreCargoCult: void 0
  },
  https: {
    alpnProtocols: void 0,
    rejectUnauthorized: void 0,
    checkServerIdentity: void 0,
    serverName: void 0,
    certificateAuthority: void 0,
    key: void 0,
    certificate: void 0,
    passphrase: void 0,
    pfx: void 0,
    ciphers: void 0,
    honorCipherOrder: void 0,
    minVersion: void 0,
    maxVersion: void 0,
    signatureAlgorithms: void 0,
    tlsSessionLifetime: void 0,
    dhparam: void 0,
    ecdhCurve: void 0,
    certificateRevocationLists: void 0,
    secureOptions: void 0
  },
  encoding: void 0,
  resolveBodyOnly: false,
  isStream: false,
  responseType: "text",
  url: void 0,
  pagination: {
    transform(response) {
      if (response.request.options.responseType === "json") {
        return response.body;
      }
      return JSON.parse(response.body);
    },
    paginate({ response }) {
      const rawLinkHeader = response.headers.link;
      if (typeof rawLinkHeader !== "string" || rawLinkHeader.trim() === "") {
        return false;
      }
      const parsed = parseLinkHeader(rawLinkHeader);
      const next = parsed.find((entry) => entry.parameters.rel === "next" || entry.parameters.rel === '"next"');
      if (next) {
        const baseUrl = response.request.options.url ?? response.url;
        return {
          url: new URL(next.reference, baseUrl)
        };
      }
      return false;
    },
    filter: () => true,
    shouldContinue: () => true,
    countLimit: Number.POSITIVE_INFINITY,
    backoff: 0,
    requestLimit: 1e4,
    stackAllItems: false
  },
  setHost: true,
  maxHeaderSize: void 0,
  signal: void 0,
  enableUnixSockets: false,
  strictContentLength: true
};
var cloneInternals = (internals) => {
  const { hooks, retry } = internals;
  const result = {
    ...internals,
    context: { ...internals.context },
    cacheOptions: { ...internals.cacheOptions },
    https: { ...internals.https },
    agent: { ...internals.agent },
    headers: { ...internals.headers },
    retry: {
      ...retry,
      errorCodes: [...retry.errorCodes],
      methods: [...retry.methods],
      statusCodes: [...retry.statusCodes]
    },
    timeout: { ...internals.timeout },
    hooks: {
      init: [...hooks.init],
      beforeRequest: [...hooks.beforeRequest],
      beforeError: [...hooks.beforeError],
      beforeRedirect: [...hooks.beforeRedirect],
      beforeRetry: [...hooks.beforeRetry],
      beforeCache: [...hooks.beforeCache],
      afterResponse: [...hooks.afterResponse]
    },
    searchParams: internals.searchParams ? new URLSearchParams(internals.searchParams) : void 0,
    pagination: { ...internals.pagination }
  };
  return result;
};
var cloneRaw = (raw) => {
  const result = { ...raw };
  if (Object.hasOwn(raw, "context") && distribution_default.object(raw.context)) {
    result.context = { ...raw.context };
  }
  if (Object.hasOwn(raw, "cacheOptions") && distribution_default.object(raw.cacheOptions)) {
    result.cacheOptions = { ...raw.cacheOptions };
  }
  if (Object.hasOwn(raw, "https") && distribution_default.object(raw.https)) {
    result.https = { ...raw.https };
  }
  if (Object.hasOwn(raw, "agent") && distribution_default.object(raw.agent)) {
    result.agent = { ...raw.agent };
  }
  if (Object.hasOwn(raw, "headers") && distribution_default.object(raw.headers)) {
    result.headers = { ...raw.headers };
  }
  if (Object.hasOwn(raw, "retry") && distribution_default.object(raw.retry)) {
    const { retry } = raw;
    result.retry = { ...retry };
    if (distribution_default.array(retry.errorCodes)) {
      result.retry.errorCodes = [...retry.errorCodes];
    }
    if (distribution_default.array(retry.methods)) {
      result.retry.methods = [...retry.methods];
    }
    if (distribution_default.array(retry.statusCodes)) {
      result.retry.statusCodes = [...retry.statusCodes];
    }
  }
  if (Object.hasOwn(raw, "timeout") && distribution_default.object(raw.timeout)) {
    result.timeout = { ...raw.timeout };
  }
  if (Object.hasOwn(raw, "hooks") && distribution_default.object(raw.hooks)) {
    const { hooks } = raw;
    result.hooks = {
      ...hooks
    };
    if (distribution_default.array(hooks.init)) {
      result.hooks.init = [...hooks.init];
    }
    if (distribution_default.array(hooks.beforeRequest)) {
      result.hooks.beforeRequest = [...hooks.beforeRequest];
    }
    if (distribution_default.array(hooks.beforeError)) {
      result.hooks.beforeError = [...hooks.beforeError];
    }
    if (distribution_default.array(hooks.beforeRedirect)) {
      result.hooks.beforeRedirect = [...hooks.beforeRedirect];
    }
    if (distribution_default.array(hooks.beforeRetry)) {
      result.hooks.beforeRetry = [...hooks.beforeRetry];
    }
    if (distribution_default.array(hooks.beforeCache)) {
      result.hooks.beforeCache = [...hooks.beforeCache];
    }
    if (distribution_default.array(hooks.afterResponse)) {
      result.hooks.afterResponse = [...hooks.afterResponse];
    }
  }
  if (Object.hasOwn(raw, "searchParams") && raw.searchParams) {
    if (distribution_default.string(raw.searchParams)) {
      result.searchParams = raw.searchParams;
    } else if (raw.searchParams instanceof URLSearchParams) {
      result.searchParams = new URLSearchParams(raw.searchParams);
    } else if (distribution_default.object(raw.searchParams)) {
      result.searchParams = { ...raw.searchParams };
    }
  }
  if (Object.hasOwn(raw, "pagination") && distribution_default.object(raw.pagination)) {
    result.pagination = { ...raw.pagination };
  }
  return result;
};
var getHttp2TimeoutOption = (internals) => {
  const delays = [internals.timeout.socket, internals.timeout.connect, internals.timeout.lookup, internals.timeout.request, internals.timeout.secureConnect].filter((delay2) => typeof delay2 === "number");
  return delays.length > 0 ? Math.min(...delays) : void 0;
};
var trackStateMutation = (trackedStateMutations, name) => {
  trackedStateMutations?.add(name);
};
var addExplicitHeader = (explicitHeaders, name) => {
  explicitHeaders.add(name);
};
var markHeaderAsExplicit = (explicitHeaders, trackedStateMutations, name) => {
  addExplicitHeader(explicitHeaders, name);
  trackStateMutation(trackedStateMutations, name);
};
var trackReplacedHeaderMutations = (trackedStateMutations, previousHeaders, nextHeaders) => {
  if (!trackedStateMutations) {
    return;
  }
  for (const header of /* @__PURE__ */ new Set([...Object.keys(previousHeaders), ...Object.keys(nextHeaders)])) {
    if (previousHeaders[header] !== nextHeaders[header]) {
      trackStateMutation(trackedStateMutations, header);
    }
  }
};
var init = (options, withOptions, self) => {
  const initHooks = options.hooks?.init;
  if (initHooks) {
    for (const hook of initHooks) {
      hook(withOptions, self);
    }
  }
};
var nonMergeableKeys = /* @__PURE__ */ new Set(["mutableDefaults", "handlers", "url", "preserveHooks", "isStream", "__proto__"]);
var Options = class _Options {
  #internals;
  #headersProxy;
  #merging = false;
  #init;
  #explicitHeaders;
  #trackedStateMutations;
  constructor(input, options, defaults2) {
    assertAny2("input", [distribution_default.string, distribution_default.urlInstance, distribution_default.object, distribution_default.undefined], input);
    assertAny2("options", [distribution_default.object, distribution_default.undefined], options);
    assertAny2("defaults", [distribution_default.object, distribution_default.undefined], defaults2);
    if (input instanceof _Options || options instanceof _Options) {
      throw new TypeError("The defaults must be passed as the third argument");
    }
    if (defaults2) {
      this.#internals = cloneInternals(defaults2.#internals);
      this.#init = [...defaults2.#init];
      this.#explicitHeaders = new Set(defaults2.#explicitHeaders);
    } else {
      this.#internals = cloneInternals(defaultInternals);
      this.#init = [];
      this.#explicitHeaders = /* @__PURE__ */ new Set();
    }
    this.#headersProxy = this.#createHeadersProxy();
    try {
      if (distribution_default.plainObject(input)) {
        try {
          this.merge(input);
          this.merge(options);
        } finally {
          this.url = input.url;
        }
      } else {
        try {
          this.merge(options);
        } finally {
          if (options?.url !== void 0) {
            if (input === void 0) {
              this.url = options.url;
            } else {
              throw new TypeError("The `url` option is mutually exclusive with the `input` argument");
            }
          } else if (input !== void 0) {
            this.url = input;
          }
        }
      }
    } catch (error) {
      error.options = this;
      throw error;
    }
  }
  merge(options) {
    if (!options) {
      return;
    }
    if (options instanceof _Options) {
      const initArray = [...options.#init];
      for (const init2 of initArray) {
        this.merge(init2);
      }
      return;
    }
    options = cloneRaw(options);
    init(this, options, this);
    init(options, options, this);
    this.#merging = true;
    try {
      let push = false;
      for (const key of Object.keys(options)) {
        if (nonMergeableKeys.has(key)) {
          continue;
        }
        if (!(key in this)) {
          throw new Error(`Unexpected option: ${key}`);
        }
        const value = options[key];
        if (value === void 0) {
          continue;
        }
        this[key] = value;
        push = true;
      }
      if (push) {
        this.#init.push(options);
      }
    } finally {
      this.#merging = false;
    }
  }
  /**
      Custom request function.
      The main purpose of this is to [support HTTP2 using a wrapper](https://github.com/szmarczak/http2-wrapper).
  
      @default http.request | https.request
      */
  get request() {
    return this.#internals.request;
  }
  set request(value) {
    assertAny2("request", [distribution_default.function, distribution_default.undefined], value);
    this.#internals.request = value;
  }
  /**
      An object representing `http`, `https` and `http2` keys for [`http.Agent`](https://nodejs.org/api/http.html#http_class_http_agent), [`https.Agent`](https://nodejs.org/api/https.html#https_class_https_agent) and [`http2wrapper.Agent`](https://github.com/szmarczak/http2-wrapper#new-http2agentoptions) instance.
      This is necessary because a request to one protocol might redirect to another.
      In such a scenario, Got will switch over to the right protocol agent for you.
  
      If a key is not present, it will default to a global agent.
  
      @example
      ```
      import got from 'got';
      import HttpAgent from 'agentkeepalive';
  
      const {HttpsAgent} = HttpAgent;
  
      await got('https://sindresorhus.com', {
          agent: {
              http: new HttpAgent(),
              https: new HttpsAgent()
          }
      });
      ```
      */
  get agent() {
    return this.#internals.agent;
  }
  set agent(value) {
    assertPlainObject2("agent", value);
    for (const key of Object.keys(value)) {
      if (key === "__proto__") {
        continue;
      }
      if (!(key in this.#internals.agent)) {
        throw new TypeError(`Unexpected agent option: ${key}`);
      }
      assertAny2(`agent.${key}`, [distribution_default.object, distribution_default.undefined, (v) => v === false], value[key]);
    }
    if (this.#merging) {
      safeObjectAssign(this.#internals.agent, value);
    } else {
      this.#internals.agent = { ...value };
    }
  }
  get h2session() {
    return this.#internals.h2session;
  }
  set h2session(value) {
    this.#internals.h2session = value;
  }
  /**
      Decompress the response automatically.
  
      This will set the `accept-encoding` header to `gzip, deflate, br` unless you set it yourself.
  
      If this is disabled, a compressed response is returned as a `Uint8Array`.
      This may be useful if you want to handle decompression yourself or stream the raw compressed data.
  
      @default true
      */
  get decompress() {
    return this.#internals.decompress;
  }
  set decompress(value) {
    assert.boolean(value);
    this.#internals.decompress = value;
  }
  /**
      Milliseconds to wait for the server to end the response before aborting the request with `got.TimeoutError` error (a.k.a. `request` property).
      By default, there's no timeout.
  
      This also accepts an `object` with the following fields to constrain the duration of each phase of the request lifecycle:
  
      - `lookup` starts when a socket is assigned and ends when the hostname has been resolved.
          Does not apply when using a Unix domain socket.
      - `connect` starts when `lookup` completes (or when the socket is assigned if lookup does not apply to the request) and ends when the socket is connected.
      - `secureConnect` starts when `connect` completes and ends when the handshaking process completes (HTTPS only).
      - `socket` starts when the socket is connected. See [request.setTimeout](https://nodejs.org/api/http.html#http_request_settimeout_timeout_callback).
      - `response` starts when the request has been written to the socket and ends when the response headers are received.
      - `send` starts when the socket is connected and ends with the request has been written to the socket.
      - `request` starts when the request is initiated and ends when the response's end event fires.
      */
  get timeout() {
    return this.#internals.timeout;
  }
  set timeout(value) {
    assertPlainObject2("timeout", value);
    for (const key of Object.keys(value)) {
      if (key === "__proto__") {
        continue;
      }
      if (!(key in this.#internals.timeout)) {
        throw new Error(`Unexpected timeout option: ${key}`);
      }
      assertAny2(`timeout.${key}`, [distribution_default.number, distribution_default.undefined], value[key]);
    }
    if (this.#merging) {
      safeObjectAssign(this.#internals.timeout, value);
    } else {
      this.#internals.timeout = { ...value };
    }
  }
  /**
      When specified, `prefixUrl` will be prepended to `url`.
      The prefix can be any valid URL, either relative or absolute.
      A trailing slash `/` is optional - one will be added automatically.
  
      __Note__: `prefixUrl` will be ignored if the `url` argument is a URL instance.
  
      __Note__: Leading slashes in `input` are disallowed when using this option to enforce consistency and avoid confusion.
      For example, when the prefix URL is `https://example.com/foo` and the input is `/bar`, there's ambiguity whether the resulting URL would become `https://example.com/foo/bar` or `https://example.com/bar`.
      The latter is used by browsers.
  
      __Tip__: Useful when used with `got.extend()` to create niche-specific Got instances.
  
      __Tip__: You can change `prefixUrl` using hooks as long as the URL still includes the `prefixUrl`.
      If the URL doesn't include it anymore, it will throw.
  
      @example
      ```
      import got from 'got';
  
      await got('unicorn', {prefixUrl: 'https://cats.com'});
      //=> 'https://cats.com/unicorn'
  
      const instance = got.extend({
          prefixUrl: 'https://google.com'
      });
  
      await instance('unicorn', {
          hooks: {
              beforeRequest: [
                  options => {
                      options.prefixUrl = 'https://cats.com';
                  }
              ]
          }
      });
      //=> 'https://cats.com/unicorn'
      ```
      */
  get prefixUrl() {
    return this.#internals.prefixUrl;
  }
  set prefixUrl(value) {
    assertAny2("prefixUrl", [distribution_default.string, distribution_default.urlInstance], value);
    if (value === "") {
      this.#internals.prefixUrl = "";
      return;
    }
    value = value.toString();
    if (!value.endsWith("/")) {
      value += "/";
    }
    if (this.#internals.prefixUrl && this.#internals.url) {
      const { href } = this.#internals.url;
      this.#internals.url.href = value + href.slice(this.#internals.prefixUrl.length);
    }
    this.#internals.prefixUrl = value;
  }
  /**
      __Note #1__: The `body` option cannot be used with the `json` or `form` option.
  
      __Note #2__: If you provide this option, `got.stream()` will be read-only.
  
      __Note #3__: If you provide a payload with the `GET` or `HEAD` method, it will throw a `TypeError` unless the method is `GET` and the `allowGetBody` option is set to `true`.
  
      __Note #4__: This option is not enumerable and will not be merged with the instance defaults.
  
      The `content-length` header will be automatically set if `body` is a `string` / `Uint8Array` / typed array, and `content-length` and `transfer-encoding` are not manually set in `options.headers`.
  
      Since Got 12, the `content-length` is not automatically set when `body` is a `fs.createReadStream`.
  
      You can use `Iterable` and `AsyncIterable` objects as request body, including Web [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream):
  
      @example
      ```
      import got from 'got';
  
      // Using an async generator
      async function* generateData() {
          yield 'Hello, ';
          yield 'world!';
      }
  
      await got.post('https://httpbin.org/anything', {
          body: generateData()
      });
      ```
      */
  get body() {
    return this.#internals.body;
  }
  set body(value) {
    assertAny2("body", [distribution_default.string, distribution_default.buffer, distribution_default.nodeStream, distribution_default.generator, distribution_default.asyncGenerator, distribution_default.iterable, distribution_default.asyncIterable, distribution_default.typedArray, distribution_default.undefined], value);
    if (distribution_default.nodeStream(value)) {
      assert.truthy(value.readable);
    }
    if (value !== void 0) {
      assert.undefined(this.#internals.form);
      assert.undefined(this.#internals.json);
    }
    this.#internals.body = value;
    trackStateMutation(this.#trackedStateMutations, "body");
  }
  /**
      The form body is converted to a query string using [`(new URLSearchParams(object)).toString()`](https://nodejs.org/api/url.html#url_constructor_new_urlsearchparams_obj).
  
      If the `Content-Type` header is not present, it will be set to `application/x-www-form-urlencoded`.
  
      __Note #1__: If you provide this option, `got.stream()` will be read-only.
  
      __Note #2__: This option is not enumerable and will not be merged with the instance defaults.
      */
  get form() {
    return this.#internals.form;
  }
  set form(value) {
    assertAny2("form", [distribution_default.plainObject, distribution_default.undefined], value);
    if (value !== void 0) {
      assert.undefined(this.#internals.body);
      assert.undefined(this.#internals.json);
    }
    this.#internals.form = value;
    trackStateMutation(this.#trackedStateMutations, "form");
  }
  /**
      JSON request body. If the `content-type` header is not set, it will be set to `application/json`.
  
      __Important__: This option only affects the request body you send to the server. To parse the response as JSON, you must either call `.json()` on the promise or set `responseType: 'json'` in the options.
  
      __Note #1__: If you provide this option, `got.stream()` will be read-only.
  
      __Note #2__: This option is not enumerable and will not be merged with the instance defaults.
      */
  get json() {
    return this.#internals.json;
  }
  set json(value) {
    if (value !== void 0) {
      assert.undefined(this.#internals.body);
      assert.undefined(this.#internals.form);
    }
    this.#internals.json = value;
    trackStateMutation(this.#trackedStateMutations, "json");
  }
  /**
      The URL to request, as a string, a [`https.request` options object](https://nodejs.org/api/https.html#https_https_request_options_callback), or a [WHATWG `URL`](https://nodejs.org/api/url.html#url_class_url).
  
      Properties from `options` will override properties in the parsed `url`.
  
      If no protocol is specified, it will throw a `TypeError`.
  
      __Note__: The query string is **not** parsed as search params.
  
      @example
      ```
      await got('https://example.com/?query=a b'); //=> https://example.com/?query=a%20b
      await got('https://example.com/', {searchParams: {query: 'a b'}}); //=> https://example.com/?query=a+b
  
      // The query string is overridden by `searchParams`
      await got('https://example.com/?query=a b', {searchParams: {query: 'a b'}}); //=> https://example.com/?query=a+b
      ```
      */
  get url() {
    return this.#internals.url;
  }
  set url(value) {
    assertAny2("url", [distribution_default.string, distribution_default.urlInstance, distribution_default.undefined], value);
    if (value === void 0) {
      this.#internals.url = void 0;
      trackStateMutation(this.#trackedStateMutations, "url");
      return;
    }
    if (distribution_default.string(value) && value.startsWith("/")) {
      throw new Error("`url` must not start with a slash");
    }
    const valueString = value.toString();
    if (distribution_default.string(value) && !this.prefixUrl && hasHttpProtocolWithoutSlashes(valueString)) {
      throw new Error("`url` protocol must be followed by `//`");
    }
    const isAbsolute = distribution_default.urlInstance(value) || hasProtocolSlashes(valueString);
    const urlString = isAbsolute ? valueString : `${this.prefixUrl}${valueString}`;
    const url = new URL(urlString);
    this.#internals.url = url;
    trackStateMutation(this.#trackedStateMutations, "url");
    if (usesUnixSocket(url) && !this.#internals.enableUnixSockets) {
      throw new Error("Using UNIX domain sockets but option `enableUnixSockets` is not enabled");
    }
    if (url.protocol === "unix:") {
      url.href = `http://unix${url.pathname}${url.search}`;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      const error = new Error(`Unsupported protocol: ${url.protocol}`);
      error.code = "ERR_UNSUPPORTED_PROTOCOL";
      throw error;
    }
    if (this.#internals.username) {
      url.username = this.#internals.username;
      this.#internals.username = "";
    }
    if (this.#internals.password) {
      url.password = this.#internals.password;
      this.#internals.password = "";
    }
    if (this.#internals.searchParams) {
      url.search = this.#internals.searchParams.toString();
      this.#internals.searchParams = void 0;
    }
  }
  /**
      Cookie support. You don't have to care about parsing or how to store them.
  
      __Note__: If you provide this option, `options.headers.cookie` will be overridden.
      */
  get cookieJar() {
    return this.#internals.cookieJar;
  }
  set cookieJar(value) {
    assertAny2("cookieJar", [distribution_default.object, distribution_default.undefined], value);
    if (value === void 0) {
      this.#internals.cookieJar = void 0;
      return;
    }
    const { setCookie, getCookieString } = value;
    assert.function(setCookie);
    assert.function(getCookieString);
    if (isToughCookieJar(value)) {
      this.#internals.cookieJar = {
        setCookie: (0, import_node_util3.promisify)(value.setCookie.bind(value)),
        getCookieString: (0, import_node_util3.promisify)(value.getCookieString.bind(value))
      };
    } else {
      this.#internals.cookieJar = value;
    }
  }
  /**
      You can abort the `request` using [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
  
      @example
      ```
      import got from 'got';
  
      const abortController = new AbortController();
  
      const request = got('https://httpbin.org/anything', {
          signal: abortController.signal
      });
  
      setTimeout(() => {
          abortController.abort();
      }, 100);
      ```
      */
  get signal() {
    return this.#internals.signal;
  }
  set signal(value) {
    assertAny2("signal", [distribution_default.object, distribution_default.undefined], value);
    this.#internals.signal = value;
  }
  /**
      Ignore invalid cookies instead of throwing an error.
      Only useful when the `cookieJar` option has been set. Not recommended.
  
      @default false
      */
  get ignoreInvalidCookies() {
    return this.#internals.ignoreInvalidCookies;
  }
  set ignoreInvalidCookies(value) {
    assert.boolean(value);
    this.#internals.ignoreInvalidCookies = value;
  }
  /**
      Query string that will be added to the request URL.
      This will override the query string in `url`.
  
      If you need to pass in an array, you can do it using a `URLSearchParams` instance.
  
      @example
      ```
      import got from 'got';
  
      const searchParams = new URLSearchParams([['key', 'a'], ['key', 'b']]);
  
      await got('https://example.com', {searchParams});
  
      console.log(searchParams.toString());
      //=> 'key=a&key=b'
      ```
      */
  get searchParams() {
    if (this.#internals.url) {
      return this.#internals.url.searchParams;
    }
    this.#internals.searchParams ??= new URLSearchParams();
    return this.#internals.searchParams;
  }
  set searchParams(value) {
    assertAny2("searchParams", [distribution_default.string, distribution_default.object, distribution_default.undefined], value);
    const url = this.#internals.url;
    if (value === void 0) {
      this.#internals.searchParams = void 0;
      if (url) {
        url.search = "";
      }
      return;
    }
    const searchParameters = this.searchParams;
    let updated;
    if (distribution_default.string(value)) {
      updated = new URLSearchParams(value);
    } else if (value instanceof URLSearchParams) {
      updated = value;
    } else {
      validateSearchParameters(value);
      updated = new URLSearchParams();
      for (const key of Object.keys(value)) {
        if (key === "__proto__") {
          continue;
        }
        const entry = value[key];
        if (entry === null) {
          updated.append(key, "");
        } else if (entry === void 0) {
          searchParameters.delete(key);
        } else {
          updated.append(key, entry);
        }
      }
    }
    if (this.#merging) {
      for (const key of updated.keys()) {
        searchParameters.delete(key);
      }
      for (const [key, value2] of updated) {
        searchParameters.append(key, value2);
      }
    } else if (url) {
      url.search = searchParameters.toString();
    } else {
      this.#internals.searchParams = searchParameters;
    }
  }
  get searchParameters() {
    throw new Error("The `searchParameters` option does not exist. Use `searchParams` instead.");
  }
  set searchParameters(_value) {
    throw new Error("The `searchParameters` option does not exist. Use `searchParams` instead.");
  }
  get dnsLookup() {
    return this.#internals.dnsLookup;
  }
  set dnsLookup(value) {
    assertAny2("dnsLookup", [distribution_default.function, distribution_default.undefined], value);
    this.#internals.dnsLookup = value;
  }
  /**
      An instance of [`CacheableLookup`](https://github.com/szmarczak/cacheable-lookup) used for making DNS lookups.
      Useful when making lots of requests to different *public* hostnames.
  
      `CacheableLookup` uses `dns.resolver4(..)` and `dns.resolver6(...)` under the hood and fall backs to `dns.lookup(...)` when the first two fail, which may lead to additional delay.
  
      __Note__: This should stay disabled when making requests to internal hostnames such as `localhost`, `database.local` etc.
  
      @default false
      */
  get dnsCache() {
    return this.#internals.dnsCache;
  }
  set dnsCache(value) {
    assertAny2("dnsCache", [distribution_default.object, distribution_default.boolean, distribution_default.undefined], value);
    if (value === true) {
      this.#internals.dnsCache = getGlobalDnsCache();
    } else if (value === false) {
      this.#internals.dnsCache = void 0;
    } else {
      this.#internals.dnsCache = value;
    }
  }
  /**
      User data. `context` is shallow merged and enumerable. If it contains non-enumerable properties they will NOT be merged.
  
      @example
      ```
      import got from 'got';
  
      const instance = got.extend({
          hooks: {
              beforeRequest: [
                  options => {
                      if (!options.context || !options.context.token) {
                          throw new Error('Token required');
                      }
  
                      options.headers.token = options.context.token;
                  }
              ]
          }
      });
  
      const context = {
          token: 'secret'
      };
  
      const response = await instance('https://httpbin.org/headers', {context});
  
      // Let's see the headers
      console.log(response.body);
      ```
      */
  get context() {
    return this.#internals.context;
  }
  set context(value) {
    assert.object(value);
    if (this.#merging) {
      safeObjectAssign(this.#internals.context, value);
    } else {
      this.#internals.context = { ...value };
    }
  }
  /**
  Hooks allow modifications during the request lifecycle.
  Hook functions may be async and are run serially.
  */
  get hooks() {
    return this.#internals.hooks;
  }
  set hooks(value) {
    assert.object(value);
    for (const knownHookEvent of Object.keys(value)) {
      if (knownHookEvent === "__proto__") {
        continue;
      }
      if (!(knownHookEvent in this.#internals.hooks)) {
        throw new Error(`Unexpected hook event: ${knownHookEvent}`);
      }
      const typedKnownHookEvent = knownHookEvent;
      const hooks = value[typedKnownHookEvent];
      assertAny2(`hooks.${knownHookEvent}`, [distribution_default.array, distribution_default.undefined], hooks);
      if (hooks) {
        for (const hook of hooks) {
          assert.function(hook);
        }
      }
      if (this.#merging) {
        if (hooks) {
          this.#internals.hooks[typedKnownHookEvent].push(...hooks);
        }
      } else {
        if (!hooks) {
          throw new Error(`Missing hook event: ${knownHookEvent}`);
        }
        this.#internals.hooks[knownHookEvent] = [...hooks];
      }
    }
  }
  /**
      Whether redirect responses should be followed automatically.
  
      Optionally, pass a function to dynamically decide based on the response object.
  
      Note that if a `303` is sent by the server in response to any request type (`POST`, `DELETE`, etc.), Got will automatically request the resource pointed to in the location header via `GET`.
      This is in accordance with [the spec](https://tools.ietf.org/html/rfc7231#section-6.4.4). You can optionally turn on this behavior also for other redirect codes - see `methodRewriting`.
      On cross-origin redirects, Got strips `host`, `cookie`, `cookie2`, `authorization`, and `proxy-authorization`. When a redirect rewrites the request to `GET`, Got also strips request body headers. Use `hooks.beforeRedirect` for app-specific sensitive headers.
  
      @default true
      */
  get followRedirect() {
    return this.#internals.followRedirect;
  }
  set followRedirect(value) {
    assertAny2("followRedirect", [distribution_default.boolean, distribution_default.function], value);
    this.#internals.followRedirect = value;
  }
  get followRedirects() {
    throw new TypeError("The `followRedirects` option does not exist. Use `followRedirect` instead.");
  }
  set followRedirects(_value) {
    throw new TypeError("The `followRedirects` option does not exist. Use `followRedirect` instead.");
  }
  /**
      If exceeded, the request will be aborted and a `MaxRedirectsError` will be thrown.
  
      @default 10
      */
  get maxRedirects() {
    return this.#internals.maxRedirects;
  }
  set maxRedirects(value) {
    assert.number(value);
    this.#internals.maxRedirects = value;
  }
  /**
      A cache adapter instance for storing cached response data.
  
      @default false
      */
  get cache() {
    return this.#internals.cache;
  }
  set cache(value) {
    assertAny2("cache", [distribution_default.object, distribution_default.string, distribution_default.boolean, distribution_default.undefined], value);
    if (value === true) {
      this.#internals.cache = globalCache;
    } else if (value === false) {
      this.#internals.cache = void 0;
    } else {
      this.#internals.cache = wrapQuickLruIfNeeded(value);
    }
  }
  /**
      Determines if a `got.HTTPError` is thrown for unsuccessful responses.
  
      If this is disabled, requests that encounter an error status code will be resolved with the `response` instead of throwing.
      This may be useful if you are checking for resource availability and are expecting error responses.
  
      @default true
      */
  get throwHttpErrors() {
    return this.#internals.throwHttpErrors;
  }
  set throwHttpErrors(value) {
    assert.boolean(value);
    this.#internals.throwHttpErrors = value;
  }
  get username() {
    const url = this.#internals.url;
    const value = url ? url.username : this.#internals.username;
    return decodeURIComponent(value);
  }
  set username(value) {
    assert.string(value);
    const url = this.#internals.url;
    const fixedValue = encodeURIComponent(value);
    if (url) {
      url.username = fixedValue;
    } else {
      this.#internals.username = fixedValue;
    }
    trackStateMutation(this.#trackedStateMutations, "username");
  }
  get password() {
    const url = this.#internals.url;
    const value = url ? url.password : this.#internals.password;
    return decodeURIComponent(value);
  }
  set password(value) {
    assert.string(value);
    const url = this.#internals.url;
    const fixedValue = encodeURIComponent(value);
    if (url) {
      url.password = fixedValue;
    } else {
      this.#internals.password = fixedValue;
    }
    trackStateMutation(this.#trackedStateMutations, "password");
  }
  /**
      If set to `true`, Got will additionally accept HTTP2 requests.
  
      It will choose either HTTP/1.1 or HTTP/2 depending on the ALPN protocol.
  
      __Note__: This option requires Node.js 15.10.0 or newer as HTTP/2 support on older Node.js versions is very buggy.
  
      __Note__: Overriding `options.request` will disable HTTP2 support.
  
      @default false
  
      @example
      ```
      import got from 'got';
  
      const {headers} = await got('https://nghttp2.org/httpbin/anything', {http2: true});
  
      console.log(headers.via);
      //=> '2 nghttpx'
      ```
      */
  get http2() {
    return this.#internals.http2;
  }
  set http2(value) {
    assert.boolean(value);
    this.#internals.http2 = value;
  }
  /**
      Set this to `true` to allow sending body for the `GET` method.
      However, the [HTTP/2 specification](https://tools.ietf.org/html/rfc7540#section-8.1.3) says that `An HTTP GET request includes request header fields and no payload body`, therefore when using the HTTP/2 protocol this option will have no effect.
      This option is only meant to interact with non-compliant servers when you have no other choice.
  
      __Note__: The [RFC 7231](https://tools.ietf.org/html/rfc7231#section-4.3.1) doesn't specify any particular behavior for the GET method having a payload, therefore __it's considered an [anti-pattern](https://en.wikipedia.org/wiki/Anti-pattern)__.
  
      @default false
      */
  get allowGetBody() {
    return this.#internals.allowGetBody;
  }
  set allowGetBody(value) {
    assert.boolean(value);
    this.#internals.allowGetBody = value;
  }
  /**
      Automatically copy headers from piped streams.
  
      When piping a request into a Got stream (e.g., `request.pipe(got.stream(url))`), this controls whether headers from the source stream are automatically merged into the Got request headers.
  
      Note: Explicitly set headers take precedence over piped headers. Piped headers are only copied when a header is not already explicitly set.
  
      Useful for proxy scenarios when explicitly enabled, but you may still want to filter out headers like `Host`, `Connection`, `Authorization`, etc.
  
      @default false
  
      @example
      ```
      import got from 'got';
      import {pipeline} from 'node:stream/promises';
  
      // Opt in to automatic header copying for proxy scenarios
      server.get('/proxy', async (request, response) => {
          const gotStream = got.stream('https://example.com', {
              copyPipedHeaders: true,
              // Explicit headers win over piped headers
              headers: {
                  host: 'example.com',
              }
          });
  
          await pipeline(request, gotStream, response);
      });
      ```
  
      @example
      ```
      import got from 'got';
      import {pipeline} from 'node:stream/promises';
  
      // Keep it disabled and manually copy only safe headers
      server.get('/proxy', async (request, response) => {
          const gotStream = got.stream('https://example.com', {
              headers: {
                  'user-agent': request.headers['user-agent'],
                  'accept': request.headers['accept'],
                  // Explicitly NOT copying host, connection, authorization, etc.
              }
          });
  
          await pipeline(request, gotStream, response);
      });
      ```
      */
  get copyPipedHeaders() {
    return this.#internals.copyPipedHeaders;
  }
  set copyPipedHeaders(value) {
    assert.boolean(value);
    this.#internals.copyPipedHeaders = value;
  }
  isHeaderExplicitlySet(name) {
    return this.#explicitHeaders.has(name.toLowerCase());
  }
  shouldCopyPipedHeader(name) {
    return !this.isHeaderExplicitlySet(name);
  }
  setPipedHeader(name, value) {
    assertValidHeaderName(name);
    this.#internals.headers[name.toLowerCase()] = value;
  }
  getInternalHeaders() {
    return this.#internals.headers;
  }
  setInternalHeader(name, value) {
    assertValidHeaderName(name);
    this.#internals.headers[name.toLowerCase()] = value;
  }
  deleteInternalHeader(name) {
    delete this.#internals.headers[name.toLowerCase()];
  }
  async trackStateMutations(operation) {
    const changedState = /* @__PURE__ */ new Set();
    this.#trackedStateMutations = changedState;
    try {
      return await operation(changedState);
    } finally {
      this.#trackedStateMutations = void 0;
    }
  }
  clearBody() {
    this.body = void 0;
    this.json = void 0;
    this.form = void 0;
    for (const header of bodyHeaderNames) {
      this.deleteInternalHeader(header);
    }
  }
  clearUnchangedCookieHeader(previousState, changedState) {
    if (previousState?.hadCookieJar && this.cookieJar === void 0 && !this.isHeaderExplicitlySet("cookie") && !changedState?.has("cookie") && this.headers.cookie === previousState.headers.cookie) {
      this.deleteInternalHeader("cookie");
    }
  }
  restoreCookieHeader(previousState, headers) {
    if (!previousState) {
      return;
    }
    if (Object.hasOwn(headers ?? {}, "cookie")) {
      return;
    }
    if (previousState.cookieWasExplicitlySet) {
      this.headers.cookie = previousState.headers.cookie;
      return;
    }
    delete this.headers.cookie;
    if (previousState.headers.cookie !== void 0) {
      this.setInternalHeader("cookie", previousState.headers.cookie);
    }
  }
  syncCookieHeaderAfterMerge(previousState, headers) {
    this.restoreCookieHeader(previousState, headers);
    this.clearUnchangedCookieHeader(previousState);
  }
  stripUnchangedCrossOriginState(previousState, changedState, { clearBody = true } = {}) {
    const headers = this.getInternalHeaders();
    const url = this.#internals.url;
    for (const header of crossOriginStripHeaders) {
      if (!changedState.has(header) && headers[header] === previousState.headers[header]) {
        this.deleteInternalHeader(header);
      }
    }
    if (!hasExplicitCredentialInUrlChange(changedState, url, "username")) {
      this.username = "";
    }
    if (!hasExplicitCredentialInUrlChange(changedState, url, "password")) {
      this.password = "";
    }
    if (clearBody && !changedState.has("body") && !changedState.has("json") && !changedState.has("form") && isBodyUnchanged(this, previousState)) {
      this.clearBody();
    }
  }
  /**
  Strip sensitive headers and credentials when navigating to a different origin.
  Headers and credentials explicitly provided in `userOptions` are preserved.
  */
  stripSensitiveHeaders(previousUrl, nextUrl, userOptions) {
    if (isSameOrigin(previousUrl, nextUrl)) {
      return;
    }
    const headers = lowercaseKeys2(userOptions.headers ?? {});
    for (const header of crossOriginStripHeaders) {
      if (headers[header] === void 0) {
        this.deleteInternalHeader(header);
      }
    }
    const explicitUsername = Object.hasOwn(userOptions, "username") ? userOptions.username : void 0;
    const explicitPassword = Object.hasOwn(userOptions, "password") ? userOptions.password : void 0;
    const hasExplicitUsername = explicitUsername !== void 0 || hasCredentialInUrl(userOptions.url, "username") || isCrossOriginCredentialChanged(previousUrl, nextUrl, "username");
    const hasExplicitPassword = explicitPassword !== void 0 || hasCredentialInUrl(userOptions.url, "password") || isCrossOriginCredentialChanged(previousUrl, nextUrl, "password");
    if (!hasExplicitUsername && this.username) {
      this.username = "";
    }
    if (!hasExplicitPassword && this.password) {
      this.password = "";
    }
  }
  /**
      Request headers.
  
      Existing headers will be overwritten. Headers set to `undefined` will be omitted.
  
      @default {}
      */
  get headers() {
    return this.#headersProxy;
  }
  set headers(value) {
    assertPlainObject2("headers", value);
    const normalizedHeaders = lowercaseKeys2(value);
    for (const header of Object.keys(normalizedHeaders)) {
      assertValidHeaderName(header);
    }
    if (this.#merging) {
      safeObjectAssign(this.#internals.headers, normalizedHeaders);
    } else {
      const previousHeaders = this.#internals.headers;
      this.#internals.headers = normalizedHeaders;
      this.#headersProxy = this.#createHeadersProxy();
      this.#explicitHeaders.clear();
      trackReplacedHeaderMutations(this.#trackedStateMutations, previousHeaders, normalizedHeaders);
    }
    for (const header of Object.keys(normalizedHeaders)) {
      if (this.#merging) {
        markHeaderAsExplicit(this.#explicitHeaders, this.#trackedStateMutations, header);
      } else {
        addExplicitHeader(this.#explicitHeaders, header);
      }
    }
  }
  /**
      Specifies if the HTTP request method should be [rewritten as `GET`](https://tools.ietf.org/html/rfc7231#section-6.4) on redirects.
  
      As the [specification](https://tools.ietf.org/html/rfc7231#section-6.4) prefers to rewrite the HTTP method only on `303` responses, this is Got's default behavior. Cross-origin `301` and `302` redirects also rewrite `POST` requests to `GET` by default to avoid forwarding request bodies to another origin.
      Setting `methodRewriting` to `true` will also rewrite same-origin `301` and `302` responses, as allowed by the spec. This is the behavior followed by `curl` and browsers.
  
      __Note__: Got never performs method rewriting on `307` and `308` responses, as this is [explicitly prohibited by the specification](https://www.rfc-editor.org/rfc/rfc7231#section-6.4.7).
  
      @default false
      */
  get methodRewriting() {
    return this.#internals.methodRewriting;
  }
  set methodRewriting(value) {
    assert.boolean(value);
    this.#internals.methodRewriting = value;
  }
  /**
      Indicates which DNS record family to use.
  
      Values:
      - `undefined`: IPv4 (if present) or IPv6
      - `4`: Only IPv4
      - `6`: Only IPv6
  
      @default undefined
      */
  get dnsLookupIpVersion() {
    return this.#internals.dnsLookupIpVersion;
  }
  set dnsLookupIpVersion(value) {
    if (value !== void 0 && value !== 4 && value !== 6) {
      throw new TypeError(`Invalid DNS lookup IP version: ${value}`);
    }
    this.#internals.dnsLookupIpVersion = value;
  }
  /**
      A function used to parse JSON responses.
  
      @example
      ```
      import got from 'got';
      import Bourne from '@hapi/bourne';
  
      const parsed = await got('https://example.com', {
          parseJson: text => Bourne.parse(text)
      }).json();
  
      console.log(parsed);
      ```
      */
  get parseJson() {
    return this.#internals.parseJson;
  }
  set parseJson(value) {
    assert.function(value);
    this.#internals.parseJson = value;
  }
  /**
      A function used to stringify the body of JSON requests.
  
      @example
      ```
      import got from 'got';
  
      await got.post('https://example.com', {
          stringifyJson: object => JSON.stringify(object, (key, value) => {
              if (key.startsWith('_')) {
                  return;
              }
  
              return value;
          }),
          json: {
              some: 'payload',
              _ignoreMe: 1234
          }
      });
      ```
  
      @example
      ```
      import got from 'got';
  
      await got.post('https://example.com', {
          stringifyJson: object => JSON.stringify(object, (key, value) => {
              if (typeof value === 'number') {
                  return value.toString();
              }
  
              return value;
          }),
          json: {
              some: 'payload',
              number: 1
          }
      });
      ```
      */
  get stringifyJson() {
    return this.#internals.stringifyJson;
  }
  set stringifyJson(value) {
    assert.function(value);
    this.#internals.stringifyJson = value;
  }
  /**
      An object representing `limit`, `calculateDelay`, `methods`, `statusCodes`, `maxRetryAfter` and `errorCodes` fields for maximum retry count, retry handler, allowed methods, allowed status codes, maximum [`Retry-After`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) time and allowed error codes.
  
      Delays between retries counts with function `1000 * Math.pow(2, retry) + Math.random() * 100`, where `retry` is attempt number (starts from 1).
  
      The `calculateDelay` property is a `function` that receives an object with `attemptCount`, `retryOptions`, `error` and `computedValue` properties for current retry count, the retry options, error and default computed value.
      The function must return a delay in milliseconds (or a Promise resolving with it) (`0` return value cancels retry).
  
      The `enforceRetryRules` property is a `boolean` that, when set to `true` (default), enforces the `limit`, `methods`, `statusCodes`, and `errorCodes` options before calling `calculateDelay`. Your `calculateDelay` function is only invoked when a retry is allowed based on these criteria. When `false`, `calculateDelay` receives the computed value but can override all retry logic.
  
      __Note:__ When `enforceRetryRules` is `false`, you must check `computedValue` in your `calculateDelay` function to respect retry rules. When `true` (default), the retry rules are enforced automatically.
  
      By default, it retries *only* on the specified methods, status codes, and on these network errors:
  
      - `ETIMEDOUT`: One of the [timeout](#timeout) limits were reached.
      - `ECONNRESET`: Connection was forcibly closed by a peer.
      - `EADDRINUSE`: Could not bind to any free port.
      - `ECONNREFUSED`: Connection was refused by the server.
      - `EPIPE`: The remote side of the stream being written has been closed.
      - `ENOTFOUND`: Couldn't resolve the hostname to an IP address.
      - `ENETUNREACH`: No internet connection.
      - `EAI_AGAIN`: DNS lookup timed out.
  
      __Note__: If `maxRetryAfter` is set to `undefined`, it will use `options.timeout`.
      __Note__: If [`Retry-After`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After) header is greater than `maxRetryAfter`, it will cancel the request.
      */
  get retry() {
    return this.#internals.retry;
  }
  set retry(value) {
    assertPlainObject2("retry", value);
    assertAny2("retry.calculateDelay", [distribution_default.function, distribution_default.undefined], value.calculateDelay);
    assertAny2("retry.maxRetryAfter", [distribution_default.number, distribution_default.undefined], value.maxRetryAfter);
    assertAny2("retry.limit", [distribution_default.number, distribution_default.undefined], value.limit);
    assertAny2("retry.methods", [distribution_default.array, distribution_default.undefined], value.methods);
    assertAny2("retry.statusCodes", [distribution_default.array, distribution_default.undefined], value.statusCodes);
    assertAny2("retry.errorCodes", [distribution_default.array, distribution_default.undefined], value.errorCodes);
    assertAny2("retry.noise", [distribution_default.number, distribution_default.undefined], value.noise);
    assertAny2("retry.enforceRetryRules", [distribution_default.boolean, distribution_default.undefined], value.enforceRetryRules);
    if (value.noise && Math.abs(value.noise) > 100) {
      throw new Error(`The maximum acceptable retry noise is +/- 100ms, got ${value.noise}`);
    }
    for (const key of Object.keys(value)) {
      if (key === "__proto__") {
        continue;
      }
      if (!(key in this.#internals.retry)) {
        throw new Error(`Unexpected retry option: ${key}`);
      }
    }
    if (this.#merging) {
      safeObjectAssign(this.#internals.retry, value);
    } else {
      this.#internals.retry = { ...value };
    }
    const { retry } = this.#internals;
    retry.methods = [...new Set(retry.methods.map((method) => method.toUpperCase()))];
    retry.statusCodes = [...new Set(retry.statusCodes)];
    retry.errorCodes = [...new Set(retry.errorCodes)];
  }
  /**
      From `http.RequestOptions`.
  
      The IP address used to send the request from.
      */
  get localAddress() {
    return this.#internals.localAddress;
  }
  set localAddress(value) {
    assertAny2("localAddress", [distribution_default.string, distribution_default.undefined], value);
    this.#internals.localAddress = value;
  }
  /**
      The HTTP method used to make the request.
  
      @default 'GET'
      */
  get method() {
    return this.#internals.method;
  }
  set method(value) {
    assert.string(value);
    this.#internals.method = value.toUpperCase();
  }
  get createConnection() {
    return this.#internals.createConnection;
  }
  set createConnection(value) {
    assertAny2("createConnection", [distribution_default.function, distribution_default.undefined], value);
    this.#internals.createConnection = value;
  }
  /**
      From `http-cache-semantics`
  
      @default {}
      */
  get cacheOptions() {
    return this.#internals.cacheOptions;
  }
  set cacheOptions(value) {
    assertPlainObject2("cacheOptions", value);
    assertAny2("cacheOptions.shared", [distribution_default.boolean, distribution_default.undefined], value.shared);
    assertAny2("cacheOptions.cacheHeuristic", [distribution_default.number, distribution_default.undefined], value.cacheHeuristic);
    assertAny2("cacheOptions.immutableMinTimeToLive", [distribution_default.number, distribution_default.undefined], value.immutableMinTimeToLive);
    assertAny2("cacheOptions.ignoreCargoCult", [distribution_default.boolean, distribution_default.undefined], value.ignoreCargoCult);
    for (const key of Object.keys(value)) {
      if (key === "__proto__") {
        continue;
      }
      if (!(key in this.#internals.cacheOptions)) {
        throw new Error(`Cache option \`${key}\` does not exist`);
      }
    }
    if (this.#merging) {
      safeObjectAssign(this.#internals.cacheOptions, value);
    } else {
      this.#internals.cacheOptions = { ...value };
    }
  }
  /**
  Options for the advanced HTTPS API.
  */
  get https() {
    return this.#internals.https;
  }
  set https(value) {
    assertPlainObject2("https", value);
    assertAny2("https.rejectUnauthorized", [distribution_default.boolean, distribution_default.undefined], value.rejectUnauthorized);
    assertAny2("https.checkServerIdentity", [distribution_default.function, distribution_default.undefined], value.checkServerIdentity);
    assertAny2("https.serverName", [distribution_default.string, distribution_default.undefined], value.serverName);
    assertAny2("https.certificateAuthority", [distribution_default.string, distribution_default.object, distribution_default.array, distribution_default.undefined], value.certificateAuthority);
    assertAny2("https.key", [distribution_default.string, distribution_default.object, distribution_default.array, distribution_default.undefined], value.key);
    assertAny2("https.certificate", [distribution_default.string, distribution_default.object, distribution_default.array, distribution_default.undefined], value.certificate);
    assertAny2("https.passphrase", [distribution_default.string, distribution_default.undefined], value.passphrase);
    assertAny2("https.pfx", [distribution_default.string, distribution_default.buffer, distribution_default.array, distribution_default.undefined], value.pfx);
    assertAny2("https.alpnProtocols", [distribution_default.array, distribution_default.undefined], value.alpnProtocols);
    assertAny2("https.ciphers", [distribution_default.string, distribution_default.undefined], value.ciphers);
    assertAny2("https.dhparam", [distribution_default.string, distribution_default.buffer, distribution_default.undefined], value.dhparam);
    assertAny2("https.signatureAlgorithms", [distribution_default.string, distribution_default.undefined], value.signatureAlgorithms);
    assertAny2("https.minVersion", [distribution_default.string, distribution_default.undefined], value.minVersion);
    assertAny2("https.maxVersion", [distribution_default.string, distribution_default.undefined], value.maxVersion);
    assertAny2("https.honorCipherOrder", [distribution_default.boolean, distribution_default.undefined], value.honorCipherOrder);
    assertAny2("https.tlsSessionLifetime", [distribution_default.number, distribution_default.undefined], value.tlsSessionLifetime);
    assertAny2("https.ecdhCurve", [distribution_default.string, distribution_default.undefined], value.ecdhCurve);
    assertAny2("https.certificateRevocationLists", [distribution_default.string, distribution_default.buffer, distribution_default.array, distribution_default.undefined], value.certificateRevocationLists);
    assertAny2("https.secureOptions", [distribution_default.number, distribution_default.undefined], value.secureOptions);
    for (const key of Object.keys(value)) {
      if (key === "__proto__") {
        continue;
      }
      if (!(key in this.#internals.https)) {
        throw new Error(`HTTPS option \`${key}\` does not exist`);
      }
    }
    if (this.#merging) {
      safeObjectAssign(this.#internals.https, value);
    } else {
      this.#internals.https = { ...value };
    }
  }
  /**
      [Encoding](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings) to be used on `setEncoding` of the response data.
  
      To get a [`Uint8Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array), you need to set `responseType` to `buffer` instead.
      Don't set this option to `null`.
  
      __Note__: This doesn't affect streams! Instead, you need to do `got.stream(...).setEncoding(encoding)`.
  
      @default 'utf-8'
      */
  get encoding() {
    return this.#internals.encoding;
  }
  set encoding(value) {
    if (value === null) {
      throw new TypeError("To get a Uint8Array, set `options.responseType` to `buffer` instead");
    }
    assertAny2("encoding", [distribution_default.string, distribution_default.undefined], value);
    this.#internals.encoding = value;
  }
  /**
      When set to `true` the promise will return the Response body instead of the Response object.
  
      @default false
      */
  get resolveBodyOnly() {
    return this.#internals.resolveBodyOnly;
  }
  set resolveBodyOnly(value) {
    assert.boolean(value);
    this.#internals.resolveBodyOnly = value;
  }
  /**
      Returns a `Stream` instead of a `Promise`.
      Set internally by `got.stream()`.
  
      @default false
      @internal
      */
  get isStream() {
    return this.#internals.isStream;
  }
  set isStream(value) {
    assert.boolean(value);
    this.#internals.isStream = value;
  }
  /**
      The parsing method.
  
      The promise also has `.text()`, `.json()` and `.buffer()` methods which return another Got promise for the parsed body.
  
      It's like setting the options to `{responseType: 'json', resolveBodyOnly: true}` but without affecting the main Got promise.
  
      __Note__: When using streams, this option is ignored.
  
      @example
      ```
      const responsePromise = got(url);
      const bufferPromise = responsePromise.buffer();
      const jsonPromise = responsePromise.json();
  
      const [response, buffer, json] = Promise.all([responsePromise, bufferPromise, jsonPromise]);
      // `response` is an instance of Got Response
      // `buffer` is an instance of Uint8Array
      // `json` is an object
      ```
  
      @example
      ```
      // This
      const body = await got(url).json();
  
      // is semantically the same as this
      const body = await got(url, {responseType: 'json', resolveBodyOnly: true});
      ```
      */
  get responseType() {
    return this.#internals.responseType;
  }
  set responseType(value) {
    if (value === void 0) {
      this.#internals.responseType = "text";
      return;
    }
    if (value !== "text" && value !== "buffer" && value !== "json") {
      throw new Error(`Invalid \`responseType\` option: ${value}`);
    }
    this.#internals.responseType = value;
  }
  get pagination() {
    return this.#internals.pagination;
  }
  set pagination(value) {
    assert.object(value);
    if (this.#merging) {
      safeObjectAssign(this.#internals.pagination, value);
    } else {
      this.#internals.pagination = value;
    }
  }
  get auth() {
    throw new Error("Parameter `auth` is deprecated. Use `username` / `password` instead.");
  }
  set auth(_value) {
    throw new Error("Parameter `auth` is deprecated. Use `username` / `password` instead.");
  }
  get setHost() {
    return this.#internals.setHost;
  }
  set setHost(value) {
    assert.boolean(value);
    this.#internals.setHost = value;
  }
  get maxHeaderSize() {
    return this.#internals.maxHeaderSize;
  }
  set maxHeaderSize(value) {
    assertAny2("maxHeaderSize", [distribution_default.number, distribution_default.undefined], value);
    this.#internals.maxHeaderSize = value;
  }
  get enableUnixSockets() {
    return this.#internals.enableUnixSockets;
  }
  set enableUnixSockets(value) {
    assert.boolean(value);
    this.#internals.enableUnixSockets = value;
  }
  /**
      Throw an error if the server response's `content-length` header value doesn't match the number of bytes received.
  
      This is useful for detecting truncated responses and follows RFC 9112 requirements for message completeness.
  
      __Note__: Responses without a `content-length` header are not validated.
      __Note__: When enabled and validation fails, a `ReadError` with code `ERR_HTTP_CONTENT_LENGTH_MISMATCH` will be thrown.
  
      @default true
      */
  get strictContentLength() {
    return this.#internals.strictContentLength;
  }
  set strictContentLength(value) {
    assert.boolean(value);
    this.#internals.strictContentLength = value;
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  toJSON() {
    return { ...this.#internals };
  }
  [Symbol.for("nodejs.util.inspect.custom")](_depth, options) {
    return (0, import_node_util3.inspect)(this.#internals, options);
  }
  createNativeRequestOptions() {
    const internals = this.#internals;
    const url = internals.url;
    let agent;
    if (url.protocol === "https:") {
      if (internals.http2) {
        agent = {
          ...internals.agent,
          http2: internals.agent.http2 ?? import_http2_wrapper.default.globalAgent
        };
      } else {
        agent = internals.agent.https;
      }
    } else {
      agent = internals.agent.http;
    }
    const { https: https2 } = internals;
    let { pfx } = https2;
    if (distribution_default.array(pfx) && distribution_default.plainObject(pfx[0])) {
      pfx = pfx.map((object) => ({
        buf: object.buffer,
        passphrase: object.passphrase
      }));
    }
    const unixSocketPath = getUnixSocketPath(url);
    if (usesUnixSocket(url) && !internals.enableUnixSockets) {
      throw new Error("Using UNIX domain sockets but option `enableUnixSockets` is not enabled");
    }
    let unixSocketGroups;
    if (unixSocketPath !== void 0) {
      unixSocketGroups = new RegExp("^(?<socketPath>[^:]+):(?<path>.+)$", "v").exec(`${url.pathname}${url.search}`)?.groups;
    }
    const unixOptions = unixSocketGroups ? { socketPath: unixSocketGroups.socketPath, path: unixSocketGroups.path, host: "" } : void 0;
    return {
      ...internals.cacheOptions,
      ...unixOptions,
      // HTTPS options
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ALPNProtocols: https2.alpnProtocols,
      ca: https2.certificateAuthority,
      cert: https2.certificate,
      key: https2.key,
      passphrase: https2.passphrase,
      pfx,
      rejectUnauthorized: https2.rejectUnauthorized,
      checkServerIdentity: https2.checkServerIdentity ?? import_node_tls.checkServerIdentity,
      servername: https2.serverName,
      ciphers: https2.ciphers,
      honorCipherOrder: https2.honorCipherOrder,
      minVersion: https2.minVersion,
      maxVersion: https2.maxVersion,
      sigalgs: https2.signatureAlgorithms,
      sessionTimeout: https2.tlsSessionLifetime,
      dhparam: https2.dhparam,
      ecdhCurve: https2.ecdhCurve,
      crl: https2.certificateRevocationLists,
      secureOptions: https2.secureOptions,
      // HTTP options
      lookup: internals.dnsLookup ?? internals.dnsCache?.lookup,
      family: internals.dnsLookupIpVersion,
      agent,
      setHost: internals.setHost,
      method: internals.method,
      maxHeaderSize: internals.maxHeaderSize,
      localAddress: internals.localAddress,
      headers: internals.headers,
      createConnection: internals.createConnection,
      timeout: internals.http2 ? getHttp2TimeoutOption(internals) : void 0,
      // HTTP/2 options
      h2session: internals.h2session
    };
  }
  getRequestFunction() {
    const { request: customRequest } = this.#internals;
    if (!customRequest) {
      return this.#getFallbackRequestFunction();
    }
    const requestWithFallback = (url, options, callback) => {
      const result = customRequest(url, options, callback);
      if (distribution_default.promise(result)) {
        return this.#resolveRequestWithFallback(result, url, options, callback);
      }
      if (result !== void 0) {
        return result;
      }
      return this.#callFallbackRequest(url, options, callback);
    };
    return requestWithFallback;
  }
  freeze() {
    const options = this.#internals;
    Object.freeze(options);
    Object.freeze(options.hooks);
    Object.freeze(options.hooks.afterResponse);
    Object.freeze(options.hooks.beforeError);
    Object.freeze(options.hooks.beforeRedirect);
    Object.freeze(options.hooks.beforeRequest);
    Object.freeze(options.hooks.beforeRetry);
    Object.freeze(options.hooks.init);
    Object.freeze(options.https);
    Object.freeze(options.cacheOptions);
    Object.freeze(options.agent);
    Object.freeze(options.headers);
    Object.freeze(options.timeout);
    Object.freeze(options.retry);
    Object.freeze(options.retry.errorCodes);
    Object.freeze(options.retry.methods);
    Object.freeze(options.retry.statusCodes);
  }
  #createHeadersProxy() {
    return new Proxy(this.#internals.headers, {
      get(target, property, receiver) {
        if (typeof property === "string") {
          if (Reflect.has(target, property)) {
            return Reflect.get(target, property, receiver);
          }
          const normalizedProperty = property.toLowerCase();
          return Reflect.get(target, normalizedProperty, receiver);
        }
        return Reflect.get(target, property, receiver);
      },
      set: (target, property, value) => {
        if (typeof property === "string") {
          const normalizedProperty = property.toLowerCase();
          assertValidHeaderName(normalizedProperty);
          const isSuccess = Reflect.set(target, normalizedProperty, value);
          if (isSuccess) {
            markHeaderAsExplicit(this.#explicitHeaders, this.#trackedStateMutations, normalizedProperty);
          }
          return isSuccess;
        }
        return Reflect.set(target, property, value);
      },
      deleteProperty: (target, property) => {
        if (typeof property === "string") {
          const normalizedProperty = property.toLowerCase();
          const isSuccess = Reflect.deleteProperty(target, normalizedProperty);
          if (isSuccess) {
            this.#explicitHeaders.delete(normalizedProperty);
            trackStateMutation(this.#trackedStateMutations, normalizedProperty);
          }
          return isSuccess;
        }
        return Reflect.deleteProperty(target, property);
      }
    });
  }
  #getFallbackRequestFunction() {
    const url = this.#internals.url;
    if (!url) {
      return;
    }
    if (url.protocol === "https:") {
      if (this.#internals.http2) {
        if (major < 15 || major === 15 && minor < 10) {
          const error = new Error("To use the `http2` option, install Node.js 15.10.0 or above");
          error.code = "EUNSUPPORTED";
          throw error;
        }
        return import_http2_wrapper.default.auto;
      }
      return import_node_https.default.request;
    }
    return import_node_http.default.request;
  }
  #callFallbackRequest(url, options, callback) {
    const fallbackRequest = this.#getFallbackRequestFunction();
    if (!fallbackRequest) {
      throw new TypeError("The request function must return a value");
    }
    const fallbackResult = fallbackRequest(url, options, callback);
    if (fallbackResult === void 0) {
      throw new TypeError("The request function must return a value");
    }
    if (distribution_default.promise(fallbackResult)) {
      return this.#resolveFallbackRequestResult(fallbackResult);
    }
    return fallbackResult;
  }
  async #resolveRequestWithFallback(requestResult, url, options, callback) {
    const result = await requestResult;
    if (result !== void 0) {
      return result;
    }
    return this.#callFallbackRequest(url, options, callback);
  }
  async #resolveFallbackRequestResult(fallbackResult) {
    const resolvedFallbackResult = await fallbackResult;
    if (resolvedFallbackResult === void 0) {
      throw new TypeError("The request function must return a value");
    }
    return resolvedFallbackResult;
  }
};
var snapshotCrossOriginState = (options) => ({
  headers: { ...options.getInternalHeaders() },
  hadCookieJar: options.cookieJar !== void 0,
  cookieWasExplicitlySet: options.isHeaderExplicitlySet("cookie"),
  username: options.username,
  password: options.password,
  body: options.body,
  json: options.json,
  form: options.form,
  bodySnapshot: cloneCrossOriginBodyValue(options.body),
  jsonSnapshot: cloneCrossOriginBodyValue(options.json),
  formSnapshot: cloneCrossOriginBodyValue(options.form)
});
var cloneCrossOriginBodyValue = (value) => {
  if (value === void 0 || value === null || typeof value !== "object") {
    return value;
  }
  try {
    return structuredClone(value);
  } catch {
    return void 0;
  }
};
var isUnchangedCrossOriginBodyValue = (currentValue, previousValue, previousSnapshot) => {
  if (currentValue !== previousValue) {
    return false;
  }
  if (currentValue === void 0 || currentValue === null || typeof currentValue !== "object") {
    return true;
  }
  if (previousSnapshot === void 0) {
    return true;
  }
  return (0, import_node_util3.isDeepStrictEqual)(currentValue, previousSnapshot);
};
var isCrossOriginCredentialChanged = (previousUrl, nextUrl, credential) => nextUrl[credential] !== "" && nextUrl[credential] !== previousUrl[credential];
var isBodyUnchanged = (options, previousState) => isUnchangedCrossOriginBodyValue(options.body, previousState.body, previousState.bodySnapshot) && isUnchangedCrossOriginBodyValue(options.json, previousState.json, previousState.jsonSnapshot) && isUnchangedCrossOriginBodyValue(options.form, previousState.form, previousState.formSnapshot);

// node_modules/got/dist/source/core/response.js
var import_node_buffer = require("node:buffer");
var decodedBodyCache = /* @__PURE__ */ new WeakMap();
var textDecoder = new TextDecoder();
var isUtf8Encoding = (encoding) => encoding === void 0 || encoding.toLowerCase().replace("-", "") === "utf8";
var decodeUint8Array = (data, encoding) => {
  if (isUtf8Encoding(encoding)) {
    return textDecoder.decode(data);
  }
  return import_node_buffer.Buffer.from(data).toString(encoding);
};
var isResponseOk = (response) => {
  const { statusCode } = response;
  const { followRedirect } = response.request.options;
  const shouldFollow = typeof followRedirect === "function" ? followRedirect(response) : followRedirect;
  const limitStatusCode = shouldFollow ? 299 : 399;
  return statusCode >= 200 && statusCode <= limitStatusCode || statusCode === 304;
};
var ParseError = class extends RequestError {
  name = "ParseError";
  code = "ERR_BODY_PARSE_FAILURE";
  constructor(error, response) {
    const { options } = response.request;
    super(`${error.message} in "${stripUrlAuth(options.url)}"`, error, response.request);
  }
};
var cacheDecodedBody = (response, decodedBody) => {
  decodedBodyCache.set(response, decodedBody);
};
var parseBody = (response, responseType, parseJson, encoding) => {
  const { rawBody } = response;
  const cachedDecodedBody = decodedBodyCache.get(response);
  try {
    if (responseType === "text") {
      if (cachedDecodedBody !== void 0) {
        return cachedDecodedBody;
      }
      return decodeUint8Array(rawBody, encoding);
    }
    if (responseType === "json") {
      if (rawBody.length === 0) {
        return "";
      }
      const text = cachedDecodedBody ?? decodeUint8Array(rawBody, encoding);
      return parseJson(text);
    }
    if (responseType === "buffer") {
      return rawBody;
    }
  } catch (error) {
    throw new ParseError(error, response);
  }
  throw new ParseError({
    message: `Unknown body type '${responseType}'`,
    name: "Error"
  }, response);
};

// node_modules/got/dist/source/core/utils/is-client-request.js
function isClientRequest(clientRequest) {
  return clientRequest.writable && !clientRequest.writableEnded;
}
var is_client_request_default = isClientRequest;

// node_modules/got/dist/source/core/diagnostics-channel.js
var import_node_crypto2 = require("node:crypto");
var import_node_diagnostics_channel = __toESM(require("node:diagnostics_channel"), 1);
var channels = {
  requestCreate: import_node_diagnostics_channel.default.channel("got:request:create"),
  requestStart: import_node_diagnostics_channel.default.channel("got:request:start"),
  responseStart: import_node_diagnostics_channel.default.channel("got:response:start"),
  responseEnd: import_node_diagnostics_channel.default.channel("got:response:end"),
  retry: import_node_diagnostics_channel.default.channel("got:request:retry"),
  error: import_node_diagnostics_channel.default.channel("got:request:error"),
  redirect: import_node_diagnostics_channel.default.channel("got:response:redirect")
};
function generateRequestId() {
  return (0, import_node_crypto2.randomUUID)();
}
var publishToChannel = (channel, message) => {
  if (channel.hasSubscribers) {
    channel.publish(message);
  }
};
function publishRequestCreate(message) {
  publishToChannel(channels.requestCreate, message);
}
function publishRequestStart(message) {
  publishToChannel(channels.requestStart, message);
}
function publishResponseStart(message) {
  publishToChannel(channels.responseStart, message);
}
function publishResponseEnd(message) {
  publishToChannel(channels.responseEnd, message);
}
function publishRetry(message) {
  publishToChannel(channels.retry, message);
}
function publishError(message) {
  publishToChannel(channels.error, message);
}
function publishRedirect(message) {
  publishToChannel(channels.redirect, message);
}

// node_modules/got/dist/source/core/index.js
var supportsBrotli = distribution_default.string(import_node_process2.default.versions.brotli);
var supportsZstd2 = distribution_default.string(import_node_process2.default.versions.zstd);
var methodsWithoutBody = /* @__PURE__ */ new Set(["GET", "HEAD"]);
var singleValueRequestHeaders = /* @__PURE__ */ new Set([
  "authorization",
  "content-length",
  "proxy-authorization"
]);
var cacheableStore = new WeakableMap();
var redirectCodes = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
var transientWriteErrorCodes = /* @__PURE__ */ new Set(["EPIPE", "ECONNRESET"]);
var omittedPipedHeaders = /* @__PURE__ */ new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);
var errorsProcessedByHooks = /* @__PURE__ */ new WeakSet();
var proxiedRequestEvents = [
  "socket",
  "connect",
  "continue",
  "information",
  "upgrade"
];
var noop3 = () => {
};
var isTransientWriteError = (error) => {
  const { code } = error;
  return typeof code === "string" && transientWriteErrorCodes.has(code);
};
var getConnectionListedHeaders = (headers) => {
  const connectionListedHeaders = /* @__PURE__ */ new Set();
  for (const [header, connectionHeader] of Object.entries(headers)) {
    const normalizedHeader = header.toLowerCase();
    if (normalizedHeader !== "connection" && normalizedHeader !== "proxy-connection") {
      continue;
    }
    const connectionHeaderValues = Array.isArray(connectionHeader) ? connectionHeader : [connectionHeader];
    for (const value of connectionHeaderValues) {
      if (typeof value !== "string") {
        continue;
      }
      for (const token of value.split(",")) {
        const normalizedToken = token.trim().toLowerCase();
        if (normalizedToken.length > 0) {
          connectionListedHeaders.add(normalizedToken);
        }
      }
    }
  }
  return connectionListedHeaders;
};
var normalizeError = (error) => {
  if (error instanceof globalThis.Error) {
    return error;
  }
  if (distribution_default.object(error)) {
    const errorLike = error;
    const message = typeof errorLike.message === "string" ? errorLike.message : "Non-error object thrown";
    const normalizedError = new globalThis.Error(message, { cause: error });
    if (typeof errorLike.stack === "string") {
      normalizedError.stack = errorLike.stack;
    }
    if (typeof errorLike.code === "string") {
      normalizedError.code = errorLike.code;
    }
    if (typeof errorLike.input === "string") {
      normalizedError.input = errorLike.input;
    }
    return normalizedError;
  }
  return new globalThis.Error(String(error));
};
var getSanitizedUrl = (options) => options?.url ? stripUrlAuth(options.url) : "";
var makeProgress = (transferred, total) => {
  let percent = 0;
  if (total) {
    percent = transferred / total;
  } else if (total === transferred) {
    percent = 1;
  }
  return { percent, transferred, total };
};
var Request = class _Request extends import_node_stream4.Duplex {
  // @ts-expect-error - Ignoring for now.
  ["constructor"];
  _noPipe;
  // @ts-expect-error https://github.com/microsoft/TypeScript/issues/9568
  options;
  response;
  requestUrl;
  redirectUrls = [];
  retryCount = 0;
  _stopReading = false;
  _stopRetry;
  _downloadedSize = 0;
  _uploadedSize = 0;
  _pipedServerResponses = /* @__PURE__ */ new Set();
  _request;
  _responseSize;
  _bodySize;
  _unproxyEvents;
  _triggerRead = false;
  _jobs = [];
  _cancelTimeouts;
  _abortListenerDisposer;
  _flushed = false;
  _aborted = false;
  _expectedContentLength;
  _compressedBytesCount;
  _skipRequestEndInFinal = false;
  _incrementalDecode;
  _requestId = generateRequestId();
  // We need this because `this._request` if `undefined` when using cache
  _requestInitialized = false;
  constructor(url, options, defaults2) {
    super({
      // Don't destroy immediately, as the error may be emitted on unsuccessful retry
      autoDestroy: false,
      // It needs to be zero because we're just proxying the data to another stream
      highWaterMark: 0
    });
    this.on("pipe", (source) => {
      if (this.options.copyPipedHeaders && source?.headers) {
        const connectionListedHeaders = getConnectionListedHeaders(source.headers);
        for (const [header, value] of Object.entries(source.headers)) {
          const normalizedHeader = header.toLowerCase();
          if (omittedPipedHeaders.has(normalizedHeader) || connectionListedHeaders.has(normalizedHeader)) {
            continue;
          }
          if (!this.options.shouldCopyPipedHeader(normalizedHeader)) {
            continue;
          }
          this.options.setPipedHeader(normalizedHeader, value);
        }
      }
    });
    this.on("newListener", (event) => {
      if (event === "retry" && this.listenerCount("retry") > 0) {
        throw new Error("A retry listener has been attached already.");
      }
    });
    try {
      this.options = new Options(url, options, defaults2);
      if (!this.options.url) {
        if (this.options.prefixUrl === "") {
          throw new TypeError("Missing `url` property");
        }
        this.options.url = "";
      }
      this.requestUrl = this.options.url;
      publishRequestCreate({
        requestId: this._requestId,
        url: getSanitizedUrl(this.options),
        method: this.options.method
      });
    } catch (error) {
      const { options: options2 } = error;
      if (options2) {
        this.options = options2;
      }
      this.flush = async () => {
        this.flush = async () => {
        };
        import_node_process2.default.nextTick(() => {
          if (this.options) {
            this._beforeError(normalizeError(error));
          } else {
            const normalizedError = normalizeError(error);
            const requestError = normalizedError instanceof RequestError ? normalizedError : new RequestError(normalizedError.message, normalizedError, this);
            this.destroy(requestError);
          }
        });
      };
      return;
    }
    const { body } = this.options;
    if (distribution_default.nodeStream(body)) {
      body.once("error", this._onBodyError);
    }
    if (this.options.signal) {
      const abort = () => {
        if (this.options.signal?.reason?.name === "TimeoutError") {
          this.destroy(new TimeoutError(this.options.signal.reason, this.timings, this));
        } else {
          this.destroy(new AbortError(this));
        }
      };
      if (this.options.signal.aborted) {
        abort();
      } else {
        const abortListenerDisposer = (0, import_node_events4.addAbortListener)(this.options.signal, abort);
        this._abortListenerDisposer = abortListenerDisposer;
      }
    }
  }
  async flush() {
    if (this._flushed) {
      return;
    }
    this._flushed = true;
    try {
      await this._finalizeBody();
      if (this.destroyed) {
        return;
      }
      await this._makeRequest();
      if (this.destroyed) {
        this._request?.destroy();
        return;
      }
      for (const job of this._jobs) {
        job();
      }
      this._jobs.length = 0;
      this._requestInitialized = true;
    } catch (error) {
      this._beforeError(normalizeError(error));
    }
  }
  _beforeError(error) {
    if (this._stopReading) {
      return;
    }
    const { response, options } = this;
    const attemptCount = this.retryCount + (error.name === "RetryError" ? 0 : 1);
    this._stopReading = true;
    if (!(error instanceof RequestError)) {
      error = new RequestError(error.message, error, this);
    }
    const typedError = error;
    void (async () => {
      if (response?.readable && !response.rawBody && !this._request?.socket?.destroyed) {
        response.setEncoding(this.readableEncoding);
        const success = await this._setRawBody(response);
        if (success) {
          response.body = decodeUint8Array(response.rawBody);
        }
      }
      if (this.listenerCount("retry") !== 0) {
        let backoff;
        try {
          let retryAfter;
          if (response && "retry-after" in response.headers) {
            retryAfter = Number(response.headers["retry-after"]);
            if (Number.isNaN(retryAfter)) {
              retryAfter = Date.parse(response.headers["retry-after"]) - Date.now();
              if (retryAfter <= 0) {
                retryAfter = 1;
              }
            } else {
              retryAfter *= 1e3;
            }
          }
          const retryOptions = options.retry;
          const computedValue = calculate_retry_delay_default({
            attemptCount,
            retryOptions,
            error: typedError,
            retryAfter,
            computedValue: retryOptions.maxRetryAfter ?? options.timeout.request ?? Number.POSITIVE_INFINITY
          });
          if (retryOptions.enforceRetryRules && computedValue === 0) {
            backoff = 0;
          } else {
            backoff = await retryOptions.calculateDelay({
              attemptCount,
              retryOptions,
              error: typedError,
              retryAfter,
              computedValue
            });
          }
        } catch (error_) {
          const normalizedError = normalizeError(error_);
          void this._error(new RequestError(normalizedError.message, normalizedError, this));
          return;
        }
        if (backoff) {
          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, backoff);
            this._stopRetry = () => {
              clearTimeout(timeout);
              resolve();
            };
          });
          if (this.destroyed) {
            return;
          }
          const bodyBeforeHooks = this.options.body;
          try {
            for (const hook of this.options.hooks.beforeRetry) {
              await hook(typedError, this.retryCount + 1);
            }
          } catch (error_) {
            const normalizedError = normalizeError(error_);
            void this._error(new RequestError(normalizedError.message, normalizedError, this));
            return;
          }
          if (this.destroyed) {
            return;
          }
          const bodyAfterHooks = this.options.body;
          const bodyWasReassigned = bodyBeforeHooks !== bodyAfterHooks;
          try {
            if (bodyWasReassigned) {
              const oldBody = bodyBeforeHooks;
              this.options.body = void 0;
              this.destroy();
              if (distribution_default.nodeStream(oldBody) && oldBody !== bodyAfterHooks) {
                oldBody.destroy();
              }
              if (distribution_default.nodeStream(bodyAfterHooks) && (bodyAfterHooks.readableEnded || bodyAfterHooks.destroyed)) {
                throw new TypeError("The reassigned stream body must be readable. Ensure you provide a fresh, readable stream in the beforeRetry hook.");
              }
              this.options.body = bodyAfterHooks;
            } else {
              this.destroy();
            }
          } catch (error_) {
            const normalizedError = normalizeError(error_);
            void this._error(new RequestError(normalizedError.message, normalizedError, this));
            return;
          }
          publishRetry({
            requestId: this._requestId,
            retryCount: this.retryCount + 1,
            error: typedError,
            delay: backoff
          });
          this.emit("retry", this.retryCount + 1, error, (updatedOptions) => {
            const request = new _Request(options.url, updatedOptions, options);
            request.retryCount = this.retryCount + 1;
            import_node_process2.default.nextTick(() => {
              void request.flush();
            });
            return request;
          });
          return;
        }
      }
      void this._error(typedError);
    })();
  }
  _read() {
    this._triggerRead = true;
    const { response } = this;
    if (response && !this._stopReading) {
      if (response.readableLength) {
        this._triggerRead = false;
      }
      let data;
      while ((data = response.read()) !== null) {
        this._downloadedSize += data.length;
        if (this._incrementalDecode) {
          try {
            const decodedChunk = typeof data === "string" ? data : this._incrementalDecode.decoder.decode(data, { stream: true });
            if (decodedChunk.length > 0) {
              this._incrementalDecode.chunks.push(decodedChunk);
            }
          } catch {
            this._incrementalDecode = void 0;
          }
        }
        const progress = this.downloadProgress;
        if (progress.percent < 1) {
          this.emit("downloadProgress", progress);
        }
        this.push(data);
      }
    }
  }
  _write(chunk2, encoding, callback) {
    const write = () => {
      this._writeRequest(chunk2, encoding, callback);
    };
    if (this._requestInitialized) {
      write();
    } else {
      this._jobs.push(write);
    }
  }
  _final(callback) {
    const endRequest = () => {
      if (this._skipRequestEndInFinal) {
        this._skipRequestEndInFinal = false;
        callback();
        return;
      }
      const request = this._request;
      if (!request || request.destroyed) {
        callback();
        return;
      }
      request.end((error) => {
        if (request?._writableState?.errored) {
          return;
        }
        if (!error) {
          this._emitUploadComplete(request);
        }
        callback(error);
      });
    };
    if (this._requestInitialized) {
      endRequest();
    } else {
      this._jobs.push(endRequest);
    }
  }
  _destroy(error, callback) {
    this._stopReading = true;
    this.flush = async () => {
    };
    this._stopRetry?.();
    this._cancelTimeouts?.();
    this._abortListenerDisposer?.[Symbol.dispose]();
    if (this.options) {
      const { body } = this.options;
      if (distribution_default.nodeStream(body)) {
        body.destroy();
      }
    }
    if (this._request) {
      this._request.destroy();
    }
    const timings = this._request?.timings;
    if (timings && distribution_default.undefined(timings.end) && !distribution_default.undefined(timings.response) && distribution_default.undefined(timings.error) && distribution_default.undefined(timings.abort)) {
      timings.end = Date.now();
      if (distribution_default.undefined(timings.phases.total)) {
        timings.phases.download = timings.end - timings.response;
        timings.phases.total = timings.end - timings.start;
      }
    }
    if (error !== null && !distribution_default.undefined(error)) {
      const processedByHooks = error instanceof Error && errorsProcessedByHooks.has(error);
      if (!processedByHooks && !(error instanceof RequestError)) {
        error = error instanceof Error ? new RequestError(error.message, error, this) : new RequestError(String(error), {}, this);
      }
    }
    callback(error);
  }
  pipe(destination, options) {
    if (destination instanceof import_node_http2.ServerResponse) {
      this._pipedServerResponses.add(destination);
    }
    return super.pipe(destination, options);
  }
  unpipe(destination) {
    if (destination instanceof import_node_http2.ServerResponse) {
      this._pipedServerResponses.delete(destination);
    }
    super.unpipe(destination);
    return this;
  }
  _shouldIncrementallyDecodeBody() {
    const { responseType, encoding } = this.options;
    return Boolean(this._noPipe) && (responseType === "text" || responseType === "json") && isUtf8Encoding(encoding) && typeof globalThis.TextDecoder === "function";
  }
  _checkContentLengthMismatch() {
    if (this.options.strictContentLength && this._expectedContentLength !== void 0) {
      const actualSize = this._compressedBytesCount ?? this._downloadedSize;
      if (actualSize !== this._expectedContentLength) {
        this._beforeError(new ReadError({
          message: `Content-Length mismatch: expected ${this._expectedContentLength} bytes, received ${actualSize} bytes`,
          name: "Error",
          code: "ERR_HTTP_CONTENT_LENGTH_MISMATCH"
        }, this));
        return true;
      }
    }
    return false;
  }
  async _finalizeBody() {
    const { options } = this;
    const headers = options.getInternalHeaders();
    const isForm = !distribution_default.undefined(options.form);
    const isJSON = !distribution_default.undefined(options.json);
    const isBody = !distribution_default.undefined(options.body);
    const cannotHaveBody = methodsWithoutBody.has(options.method) && !(options.method === "GET" && options.allowGetBody);
    if (isForm || isJSON || isBody) {
      if (cannotHaveBody) {
        throw new TypeError(`The \`${options.method}\` method cannot be used with a body`);
      }
      const noContentType = !distribution_default.string(headers["content-type"]);
      if (isBody) {
        if (options.body instanceof FormData) {
          const response = new Response(options.body);
          if (noContentType) {
            headers["content-type"] = response.headers.get("content-type") ?? "multipart/form-data";
          }
          options.body = response.body;
        } else if (Object.prototype.toString.call(options.body) === "[object FormData]") {
          throw new TypeError("Non-native FormData is not supported. Use globalThis.FormData instead.");
        }
      } else if (isForm) {
        if (noContentType) {
          headers["content-type"] = "application/x-www-form-urlencoded";
        }
        const { form } = options;
        options.form = void 0;
        options.body = new URLSearchParams(form).toString();
      } else {
        if (noContentType) {
          headers["content-type"] = "application/json";
        }
        const { json } = options;
        options.json = void 0;
        options.body = options.stringifyJson(json);
      }
      const uploadBodySize = getBodySize(options.body, headers);
      if (distribution_default.undefined(headers["content-length"]) && distribution_default.undefined(headers["transfer-encoding"]) && !cannotHaveBody && !distribution_default.undefined(uploadBodySize)) {
        headers["content-length"] = String(uploadBodySize);
      }
    }
    if (options.responseType === "json" && !("accept" in headers)) {
      headers.accept = "application/json";
    }
    this._bodySize = Number(headers["content-length"]) || void 0;
  }
  async _onResponseBase(response) {
    if (this.isAborted) {
      return;
    }
    const { options } = this;
    const { url } = options;
    const nativeResponse = response;
    const statusCode = response.statusCode;
    const { method } = options;
    const redirectLocationHeader = response.headers.location;
    const redirectLocation = Array.isArray(redirectLocationHeader) ? redirectLocationHeader[0] : redirectLocationHeader;
    const isRedirect = Boolean(redirectLocation && redirectCodes.has(statusCode));
    const hasNoBody = method === "HEAD" || statusCode >= 100 && statusCode < 200 || statusCode === 204 || statusCode === 205 || statusCode === 304;
    const prepareResponse = (response2) => {
      if (!Object.hasOwn(response2, "headers")) {
        Object.defineProperty(response2, "headers", {
          value: response2.headers,
          enumerable: true,
          writable: true,
          configurable: true
        });
      }
      response2.statusMessage ||= import_node_http2.default.STATUS_CODES[statusCode];
      response2.url = stripUrlAuth(options.url);
      response2.requestUrl = this.requestUrl;
      response2.redirectUrls = this.redirectUrls;
      response2.request = this;
      response2.isFromCache = nativeResponse.fromCache ?? false;
      response2.ip = this.ip;
      response2.retryCount = this.retryCount;
      response2.ok = isResponseOk(response2);
      return response2;
    };
    let typedResponse = prepareResponse(response);
    const shouldFollowRedirect = isRedirect && (typeof options.followRedirect === "function" ? options.followRedirect(typedResponse) : options.followRedirect);
    if (options.decompress && !hasNoBody && !shouldFollowRedirect) {
      if (options.strictContentLength) {
        this._compressedBytesCount = 0;
        nativeResponse.on("data", (chunk2) => {
          this._compressedBytesCount += byteLength(chunk2);
        });
      }
      response = decompressResponse(response);
      typedResponse = prepareResponse(response);
    }
    const wasDecompressed = response !== nativeResponse;
    this._responseSize = Number(response.headers["content-length"]) || void 0;
    this.response = typedResponse;
    this._incrementalDecode = this._shouldIncrementallyDecodeBody() ? { decoder: new globalThis.TextDecoder("utf8", { ignoreBOM: true }), chunks: [] } : void 0;
    publishResponseStart({
      requestId: this._requestId,
      url: typedResponse.url,
      statusCode,
      headers: response.headers,
      isFromCache: typedResponse.isFromCache
    });
    response.once("error", (error) => {
      if (!wasDecompressed && response.complete && this._responseSize === void 0 && error.code === "ECONNRESET") {
        return;
      }
      this._aborted = true;
      this._beforeError(new ReadError(error, this));
    });
    response.once("aborted", () => {
      if (this._responseSize === void 0 && nativeResponse.complete) {
        return;
      }
      this._aborted = true;
      if (!this._checkContentLengthMismatch()) {
        this._beforeError(new ReadError({
          name: "Error",
          message: "The server aborted pending request",
          code: "ECONNRESET"
        }, this));
      }
    });
    let canFinalizeResponse = false;
    const handleResponseEnd = () => {
      if (!canFinalizeResponse || !response.readableEnded) {
        return;
      }
      canFinalizeResponse = false;
      if (this._stopReading) {
        return;
      }
      if (this._checkContentLengthMismatch()) {
        return;
      }
      this._responseSize = this._downloadedSize;
      this.emit("downloadProgress", this.downloadProgress);
      publishResponseEnd({
        requestId: this._requestId,
        url: typedResponse.url,
        statusCode,
        bodySize: this._downloadedSize,
        timings: this.timings
      });
      this.push(null);
    };
    if (!shouldFollowRedirect) {
      response.once("end", handleResponseEnd);
    }
    const noPipeCookieJarRawBodyPromise = this._noPipe && distribution_default.object(options.cookieJar) && !isRedirect ? this._setRawBody(response) : void 0;
    const rawCookies = response.headers["set-cookie"];
    if (distribution_default.object(options.cookieJar) && rawCookies) {
      let promises = rawCookies.map(async (rawCookie) => options.cookieJar.setCookie(rawCookie, url.toString()));
      if (options.ignoreInvalidCookies) {
        promises = promises.map(async (promise) => {
          try {
            await promise;
          } catch {
          }
        });
      }
      try {
        await Promise.all(promises);
      } catch (error) {
        this._beforeError(normalizeError(error));
        return;
      }
    }
    if (this.isAborted) {
      return;
    }
    if (shouldFollowRedirect) {
      response.resume();
      this._cancelTimeouts?.();
      this._unproxyEvents?.();
      if (this.redirectUrls.length >= options.maxRedirects) {
        this._beforeError(new MaxRedirectsError(this));
        return;
      }
      this._request = void 0;
      this._downloadedSize = 0;
      this._uploadedSize = 0;
      const updatedOptions = new Options(void 0, void 0, this.options);
      try {
        const redirectBuffer = import_node_buffer2.Buffer.from(redirectLocation, "binary").toString();
        const redirectUrl = new URL(redirectBuffer, url);
        const currentUnixSocketPath = getUnixSocketPath(url);
        const redirectUnixSocketPath = getUnixSocketPath(redirectUrl);
        if (redirectUrl.protocol === "unix:" && redirectUnixSocketPath === void 0) {
          this._beforeError(new RequestError("Cannot redirect to UNIX socket", {}, this));
          return;
        }
        if (redirectUnixSocketPath !== void 0 && currentUnixSocketPath !== redirectUnixSocketPath) {
          this._beforeError(new RequestError("Cannot redirect to UNIX socket", {}, this));
          return;
        }
        const isDifferentOrigin = redirectUrl.origin !== url.origin || currentUnixSocketPath !== redirectUnixSocketPath;
        const serverRequestedGet = statusCode === 303 && updatedOptions.method !== "GET" && updatedOptions.method !== "HEAD";
        const crossOriginRequestedGet = isDifferentOrigin && (statusCode === 301 || statusCode === 302) && updatedOptions.method === "POST";
        const canRewrite = statusCode !== 307 && statusCode !== 308;
        const userRequestedGet = updatedOptions.methodRewriting && canRewrite;
        const shouldDropBody = serverRequestedGet || crossOriginRequestedGet || userRequestedGet;
        if (shouldDropBody) {
          updatedOptions.method = "GET";
          this._dropBody(updatedOptions);
        }
        if (isDifferentOrigin) {
          this._stripCrossOriginState(updatedOptions, redirectUrl, shouldDropBody);
        } else {
          redirectUrl.username = updatedOptions.username;
          redirectUrl.password = updatedOptions.password;
        }
        updatedOptions.url = redirectUrl;
        this.redirectUrls.push(redirectUrl);
        const preHookState = isDifferentOrigin ? void 0 : {
          ...snapshotCrossOriginState(updatedOptions),
          url: new URL(updatedOptions.url)
        };
        const changedState = await updatedOptions.trackStateMutations(async (changedState2) => {
          for (const hook of updatedOptions.hooks.beforeRedirect) {
            await hook(updatedOptions, typedResponse);
          }
          return changedState2;
        });
        updatedOptions.clearUnchangedCookieHeader(preHookState, changedState);
        if (!isDifferentOrigin) {
          const state = preHookState;
          const hookUrl = updatedOptions.url;
          if (!isSameOrigin(state.url, hookUrl)) {
            this._stripUnchangedCrossOriginState(updatedOptions, hookUrl, shouldDropBody, {
              ...state,
              changedState,
              preserveUsername: hasExplicitCredentialInUrlChange(changedState, hookUrl, "username") || isCrossOriginCredentialChanged(state.url, hookUrl, "username"),
              preservePassword: hasExplicitCredentialInUrlChange(changedState, hookUrl, "password") || isCrossOriginCredentialChanged(state.url, hookUrl, "password")
            });
          }
        }
        publishRedirect({
          requestId: this._requestId,
          fromUrl: url.toString(),
          toUrl: updatedOptions.url.toString(),
          statusCode
        });
        this.emit("redirect", updatedOptions, typedResponse);
        this.options = updatedOptions;
        await this._makeRequest();
      } catch (error) {
        this._beforeError(normalizeError(error));
        return;
      }
      return;
    }
    canFinalizeResponse = true;
    handleResponseEnd();
    if (options.isStream && options.throwHttpErrors && !isResponseOk(typedResponse)) {
      this._beforeError(new HTTPError(typedResponse));
      return;
    }
    if (!hasNoBody && (!wasDecompressed || options.strictContentLength)) {
      const contentLengthHeader = nativeResponse.headers["content-length"];
      if (contentLengthHeader !== void 0) {
        const expectedLength = Number(contentLengthHeader);
        if (!Number.isNaN(expectedLength) && expectedLength >= 0) {
          this._expectedContentLength = expectedLength;
        }
      }
    }
    this.emit("downloadProgress", this.downloadProgress);
    response.on("readable", () => {
      if (this._triggerRead) {
        this._read();
      }
    });
    this.on("resume", () => {
      response.resume();
    });
    this.on("pause", () => {
      response.pause();
    });
    if (this._noPipe) {
      const captureFromResponse = response.readableEnded || noPipeCookieJarRawBodyPromise !== void 0;
      const success = noPipeCookieJarRawBodyPromise ? await noPipeCookieJarRawBodyPromise : await this._setRawBody(captureFromResponse ? response : this);
      if (captureFromResponse) {
        handleResponseEnd();
      }
      if (success) {
        this.emit("response", response);
      }
      return;
    }
    this.emit("response", response);
    for (const destination of this._pipedServerResponses) {
      if (destination.headersSent) {
        continue;
      }
      for (const key in response.headers) {
        if (Object.hasOwn(response.headers, key)) {
          const value = response.headers[key];
          if (wasDecompressed && (key === "content-encoding" || key === "content-length")) {
            continue;
          }
          if (value !== void 0) {
            destination.setHeader(key, value);
          }
        }
      }
      destination.statusCode = statusCode;
    }
  }
  async _setRawBody(from = this) {
    try {
      const fromArray = await from.toArray();
      const hasNonStringChunk = fromArray.some((chunk2) => typeof chunk2 !== "string");
      const rawBody = hasNonStringChunk ? concatUint8Arrays(fromArray.map((chunk2) => typeof chunk2 === "string" ? stringToUint8Array(chunk2) : chunk2)) : stringToUint8Array(fromArray.join(""));
      const shouldUseIncrementalDecodedBody = from === this && this._incrementalDecode !== void 0;
      if (!this.isAborted && this.response) {
        this.response.rawBody = rawBody;
        if (from !== this) {
          this._downloadedSize = rawBody.byteLength;
        }
        if (shouldUseIncrementalDecodedBody) {
          try {
            const { decoder, chunks } = this._incrementalDecode;
            const finalDecodedChunk = decoder.decode();
            if (finalDecodedChunk.length > 0) {
              chunks.push(finalDecodedChunk);
            }
            cacheDecodedBody(this.response, chunks.join(""));
          } catch {
          }
        }
        return true;
      }
    } catch {
    } finally {
      this._incrementalDecode = void 0;
    }
    return false;
  }
  async _onResponse(response) {
    try {
      await this._onResponseBase(response);
    } catch (error) {
      this._beforeError(normalizeError(error));
    }
  }
  _onRequest(request) {
    const { options } = this;
    const { timeout, url } = options;
    publishRequestStart({
      requestId: this._requestId,
      url: getSanitizedUrl(this.options),
      method: options.method,
      headers: options.headers
    });
    timer_default(request);
    this._cancelTimeouts = timedOut(request, timeout, url);
    if (this.options.http2) {
      request.removeAllListeners("timeout");
      request.once("socket", (socket) => {
        socket.removeAllListeners("timeout");
      });
    }
    let lastRequestError;
    const responseEventName = options.cache ? "cacheableResponse" : "response";
    request.once(responseEventName, (response) => {
      void this._onResponse(response);
    });
    const emitRequestError = (error) => {
      this._aborted = true;
      request.destroy();
      const wrappedError = error instanceof TimeoutError2 ? new TimeoutError(error, this.timings, this) : new RequestError(error.message, error, this);
      this._beforeError(wrappedError);
    };
    request.once("error", (error) => {
      lastRequestError = error;
      if (this._request !== request) {
        return;
      }
      if (isTransientWriteError(error)) {
        queueMicrotask(() => {
          if (this._isRequestStale(request)) {
            return;
          }
          emitRequestError(error);
        });
        return;
      }
      emitRequestError(error);
    });
    if (!options.cache) {
      request.once("close", () => {
        if (this._request !== request || Boolean(request.res) || this._stopReading) {
          return;
        }
        this._beforeError(lastRequestError ?? new ReadError({
          name: "Error",
          message: "The server aborted pending request",
          code: "ECONNRESET"
        }, this));
      });
    }
    this._unproxyEvents = proxyEvents(request, this, proxiedRequestEvents);
    this._request = request;
    this.emit("uploadProgress", this.uploadProgress);
    this._sendBody();
    this.emit("request", request);
  }
  _isRequestStale(request) {
    return this._request !== request || Boolean(request.res) || request.destroyed || request.writableEnded;
  }
  async _asyncWrite(chunk2, request = this) {
    return new Promise((resolve, reject) => {
      if (request === this) {
        super.write(chunk2, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
        return;
      }
      this._writeRequest(chunk2, void 0, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }, request);
    });
  }
  _sendBody() {
    const { body } = this.options;
    const currentRequest = this.redirectUrls.length === 0 ? this : this._request ?? this;
    if (distribution_default.nodeStream(body)) {
      body.pipe(currentRequest);
    } else if (distribution_default.buffer(body)) {
      this._writeBodyInChunks(body, currentRequest);
    } else if (distribution_default.typedArray(body)) {
      const typedArray = body;
      const uint8View = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
      this._writeBodyInChunks(uint8View, currentRequest);
    } else if (distribution_default.asyncIterable(body) || distribution_default.iterable(body) && !distribution_default.string(body) && !isBuffer(body)) {
      (async () => {
        const isInitialRequest = currentRequest === this;
        try {
          for await (const chunk2 of body) {
            if (this.options.body !== body) {
              return;
            }
            await this._asyncWrite(chunk2, currentRequest);
            if (this.options.body !== body) {
              return;
            }
          }
          if (this.options.body === body) {
            if (isInitialRequest) {
              super.end();
              return;
            }
            await this._endWritableRequest(currentRequest);
          }
        } catch (error) {
          if (this.options.body !== body) {
            return;
          }
          this._beforeError(normalizeError(error));
        }
      })();
    } else if (distribution_default.undefined(body)) {
      const cannotHaveBody = methodsWithoutBody.has(this.options.method) && !(this.options.method === "GET" && this.options.allowGetBody);
      if ((this._noPipe ?? false) || cannotHaveBody || currentRequest !== this) {
        currentRequest.end();
      }
    } else {
      this._writeBodyInChunks(stringToUint8Array(body), currentRequest);
    }
  }
  /*
      Write a body buffer in chunks to enable granular `uploadProgress` events.
  
      Without chunking, string/Uint8Array/TypedArray bodies are written in a single call, causing `uploadProgress` to only emit 0% and 100% with nothing in between.
  
      The 64 KB chunk size matches Node.js fs stream defaults.
      */
  _writeBodyInChunks(buffer, currentRequest) {
    const isInitialRequest = currentRequest === this;
    (async () => {
      let request;
      try {
        request = isInitialRequest ? this._request : currentRequest;
        const activeRequest = request;
        if (!activeRequest) {
          if (isInitialRequest) {
            super.end();
          }
          return;
        }
        if (activeRequest.destroyed) {
          return;
        }
        await this._writeChunksToRequest(buffer, activeRequest);
        if (this._isRequestStale(activeRequest)) {
          this._finalizeStaleChunkedWrite(activeRequest, isInitialRequest);
          return;
        }
        if (isInitialRequest) {
          super.end();
          return;
        }
        await this._endWritableRequest(activeRequest);
      } catch (error) {
        const normalizedError = normalizeError(error);
        if (isTransientWriteError(normalizedError)) {
          if (isInitialRequest && request) {
            const initialRequest = request;
            let didFinalize = false;
            const finalizeIfStale = () => {
              if (didFinalize || !this._isRequestStale(initialRequest)) {
                return;
              }
              didFinalize = true;
              this._finalizeStaleChunkedWrite(initialRequest, true);
            };
            finalizeIfStale();
            if (!didFinalize) {
              initialRequest.once("response", finalizeIfStale);
              queueMicrotask(finalizeIfStale);
            }
          }
          return;
        }
        if (!isInitialRequest && this._isRequestStale(currentRequest)) {
          return;
        }
        this._beforeError(normalizedError);
      }
    })();
  }
  _finalizeStaleChunkedWrite(request, isInitialRequest) {
    if (!request.destroyed && !request.writableEnded) {
      request.destroy();
    }
    if (isInitialRequest) {
      this._skipRequestEndInFinal = true;
      super.end();
    }
  }
  _emitUploadComplete(request) {
    this._bodySize = this._uploadedSize;
    this.emit("uploadProgress", this.uploadProgress);
    request.emit("upload-complete");
  }
  async _endWritableRequest(request) {
    await new Promise((resolve, reject) => {
      request.end((error) => {
        if (error) {
          reject(error);
          return;
        }
        if (this._request === request && !request.destroyed) {
          this._emitUploadComplete(request);
        }
        resolve();
      });
    });
  }
  _stripCrossOriginState(options, urlToClear, bodyAlreadyDropped) {
    for (const header of crossOriginStripHeaders) {
      options.deleteInternalHeader(header);
    }
    options.username = "";
    options.password = "";
    urlToClear.username = "";
    urlToClear.password = "";
    if (!bodyAlreadyDropped) {
      this._dropBody(options);
    }
  }
  _stripUnchangedCrossOriginState(options, urlToClear, bodyAlreadyDropped, state) {
    const headers = options.getInternalHeaders();
    for (const header of crossOriginStripHeaders) {
      if (!state.changedState.has(header) && headers[header] === state.headers[header]) {
        options.deleteInternalHeader(header);
      }
    }
    if (!state.preserveUsername) {
      options.username = "";
      urlToClear.username = "";
    }
    if (!state.preservePassword) {
      options.password = "";
      urlToClear.password = "";
    }
    if (!bodyAlreadyDropped && !state.changedState.has("body") && !state.changedState.has("json") && !state.changedState.has("form") && isBodyUnchanged(options, state)) {
      this._dropBody(options);
    }
  }
  _dropBody(updatedOptions) {
    const { body } = this.options;
    const hadOptionBody = !distribution_default.undefined(body) || !distribution_default.undefined(this.options.json) || !distribution_default.undefined(this.options.form);
    this.options.clearBody();
    if (distribution_default.nodeStream(body)) {
      body.off("error", this._onBodyError);
      body.unpipe();
      body.on("error", noop3);
      body.destroy();
    } else if (distribution_default.asyncIterable(body) || distribution_default.iterable(body) && !distribution_default.string(body) && !isBuffer(body)) {
      const iterableBody = body;
      if (typeof iterableBody.return === "function") {
        try {
          const result = iterableBody.return();
          if (result instanceof Promise) {
            result.catch(noop3);
          }
        } catch {
        }
      }
    } else if (!hadOptionBody && !this.writableEnded) {
      this._skipRequestEndInFinal = true;
      super.end();
    }
    updatedOptions.clearBody();
    this._bodySize = void 0;
  }
  _onBodyError = (error) => {
    if (this._flushed) {
      this._beforeError(new UploadError(error, this));
    } else {
      this.flush = async () => {
        this.flush = async () => {
        };
        this._beforeError(new UploadError(error, this));
      };
    }
  };
  async _writeChunksToRequest(buffer, request) {
    const chunkSize = 65536;
    const isStale = () => this._isRequestStale(request);
    for (const part of chunk(buffer, chunkSize)) {
      if (isStale()) {
        return;
      }
      await new Promise((resolve, reject) => {
        this._writeRequest(part, void 0, (error) => {
          if (isStale()) {
            resolve();
            return;
          }
          if (error) {
            reject(error);
          } else {
            setImmediate(resolve);
          }
        }, request);
      });
    }
  }
  _prepareCache(cache) {
    if (cacheableStore.has(cache)) {
      return;
    }
    const cacheableRequest = new dist_default(((requestOptions, handler) => {
      const wrappedHandler = handler ? (response) => {
        const { beforeCacheHooks, gotRequest } = requestOptions;
        if (!beforeCacheHooks || beforeCacheHooks.length === 0) {
          handler(response);
          return;
        }
        try {
          for (const hook of beforeCacheHooks) {
            const result2 = hook(response);
            if (result2 === false) {
              response.headers["cache-control"] = "no-cache, no-store, must-revalidate";
              response.headers.pragma = "no-cache";
              response.headers.expires = "0";
              handler(response);
              return;
            }
            if (distribution_default.promise(result2)) {
              throw new TypeError("beforeCache hooks must be synchronous. The hook returned a Promise, but this hook must return synchronously. If you need async logic, use beforeRequest hook instead.");
            }
            if (result2 !== void 0) {
              throw new TypeError("beforeCache hook must return false or undefined. To modify the response, mutate it directly.");
            }
          }
        } catch (error) {
          const normalizedError = normalizeError(error);
          if (gotRequest) {
            gotRequest._beforeError(normalizedError instanceof RequestError ? normalizedError : new RequestError(normalizedError.message, normalizedError, gotRequest));
            return;
          }
          console.error("Got: beforeCache hook error (request context unavailable):", normalizedError);
          handler(response);
          return;
        }
        handler(response);
      } : handler;
      const result = requestOptions._request(requestOptions, wrappedHandler);
      if (distribution_default.promise(result)) {
        result.once = (event, handler2) => {
          if (event === "error") {
            (async () => {
              try {
                await result;
              } catch (error) {
                handler2(error);
              }
            })();
          } else if (event === "abort" || event === "destroy") {
            (async () => {
              try {
                const request = await result;
                request.once(event, handler2);
              } catch {
              }
            })();
          } else {
            throw new Error(`Unknown HTTP2 promise event: ${event}`);
          }
          return result;
        };
      }
      return result;
    }), cache);
    cacheableStore.set(cache, cacheableRequest.request());
  }
  async _createCacheableRequest(url, options) {
    return new Promise((resolve, reject) => {
      Object.assign(options, {
        protocol: url.protocol,
        hostname: distribution_default.string(url.hostname) && url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname,
        host: url.host,
        hash: url.hash === "" ? "" : url.hash ?? null,
        search: url.search === "" ? "" : url.search ?? null,
        pathname: url.pathname,
        href: url.href,
        path: `${url.pathname || ""}${url.search || ""}`,
        ...distribution_default.string(url.port) && url.port.length > 0 ? { port: Number(url.port) } : {},
        ...url.username || url.password ? { auth: `${url.username || ""}:${url.password || ""}` } : {}
      });
      let request;
      const cacheRequest = cacheableStore.get(options.cache)(options, (response) => {
        void (async () => {
          response._readableState.autoDestroy = false;
          if (request) {
            const fix = () => {
              if (response.req) {
                response.complete = response.req.res.complete;
              } else if (response.complete === void 0) {
                response.complete = true;
              }
            };
            response.prependOnceListener("end", fix);
            fix();
            (await request).emit("cacheableResponse", response);
          }
          resolve(response);
        })();
      });
      cacheRequest.once("error", reject);
      cacheRequest.once("request", (requestOrPromise) => {
        request = requestOrPromise;
        resolve(request);
      });
    });
  }
  async _makeRequest() {
    const { options } = this;
    const shouldDeleteGeneratedHeader = (currentHeader, generatedHeader) => currentHeader === generatedHeader || distribution_default.undefined(currentHeader);
    const syncGeneratedHeader = (name, { currentHeader, explicitHeader, nextHeader, staleGeneratedHeader }) => {
      if (!distribution_default.undefined(nextHeader)) {
        options.setInternalHeader(name, nextHeader);
      } else if (!distribution_default.undefined(explicitHeader) && currentHeader === staleGeneratedHeader) {
        options.setInternalHeader(name, explicitHeader);
      } else if (shouldDeleteGeneratedHeader(currentHeader, staleGeneratedHeader)) {
        options.deleteInternalHeader(name);
      }
    };
    const getAuthorizationHeader = (username2, password2, isExplicitlyOmitted) => !isExplicitlyOmitted && (username2 || password2) ? `Basic ${stringToBase64(`${username2}:${password2}`)}` : void 0;
    const sanitizeHeaders = () => {
      const currentHeaders = options.getInternalHeaders();
      for (const key in currentHeaders) {
        if (distribution_default.undefined(currentHeaders[key])) {
          options.deleteInternalHeader(key);
        } else if (distribution_default.null(currentHeaders[key])) {
          throw new TypeError(`Use \`undefined\` instead of \`null\` to delete the \`${key}\` header`);
        } else if (Array.isArray(currentHeaders[key]) && key === "transfer-encoding") {
          if (currentHeaders[key].length !== 1) {
            throw new TypeError(`The \`${key}\` header must be a single value`);
          }
          options.setInternalHeader(key, currentHeaders[key][0]);
        } else if (Array.isArray(currentHeaders[key]) && singleValueRequestHeaders.has(key)) {
          if (currentHeaders[key].length !== 1) {
            throw new TypeError(`The \`${key}\` header must be a single value`);
          }
          options.setInternalHeader(key, currentHeaders[key][0]);
        }
      }
      return currentHeaders;
    };
    const getCookieHeader = async (cookieJar2) => {
      if (!cookieJar2) {
        return void 0;
      }
      const cookieString = await cookieJar2.getCookieString(options.url.toString());
      return distribution_default.nonEmptyString(cookieString) ? cookieString : void 0;
    };
    const headers = sanitizeHeaders();
    const initialHeaders = options.getInternalHeaders();
    const authorizationWasInitiallyExplicit = options.isHeaderExplicitlySet("authorization");
    const explicitAuthorizationHeader = authorizationWasInitiallyExplicit ? initialHeaders.authorization : void 0;
    const explicitCookieHeader = options.isHeaderExplicitlySet("cookie") ? initialHeaders.cookie : void 0;
    const authorizationWasInitiallyOmitted = options.isHeaderExplicitlySet("authorization") && distribution_default.undefined(initialHeaders.authorization);
    const cookieWasInitiallyOmitted = options.isHeaderExplicitlySet("cookie") && distribution_default.undefined(initialHeaders.cookie);
    if (options.decompress && distribution_default.undefined(headers["accept-encoding"])) {
      const encodings = ["gzip", "deflate"];
      if (supportsBrotli) {
        encodings.push("br");
      }
      if (supportsZstd2) {
        encodings.push("zstd");
      }
      options.setInternalHeader("accept-encoding", encodings.join(", "));
    }
    const { username, password } = options;
    const cookieJar = options.cookieJar;
    const generatedAuthorizationHeader = distribution_default.undefined(explicitAuthorizationHeader) ? getAuthorizationHeader(username, password, authorizationWasInitiallyOmitted) : void 0;
    let generatedCookieHeader;
    if (!distribution_default.undefined(generatedAuthorizationHeader)) {
      options.setInternalHeader("authorization", generatedAuthorizationHeader);
    }
    if (!cookieWasInitiallyOmitted) {
      generatedCookieHeader = await getCookieHeader(cookieJar);
      if (!distribution_default.undefined(generatedCookieHeader)) {
        options.setInternalHeader("cookie", generatedCookieHeader);
      }
    }
    let request;
    let shouldOmitRequestUrlCredentials = false;
    const changedState = await options.trackStateMutations(async (changedState2) => {
      for (const hook of options.hooks.beforeRequest) {
        const result = await hook(options, { retryCount: this.retryCount });
        if (!distribution_default.undefined(result)) {
          request = () => result;
          break;
        }
      }
      return changedState2;
    });
    if (request === void 0) {
      const currentHeaders = options.getInternalHeaders();
      const isHeaderExplicitlyOmitted = (header) => options.isHeaderExplicitlySet(header) && Object.hasOwn(currentHeaders, header) && distribution_default.undefined(currentHeaders[header]);
      const currentAuthorizationHeader = currentHeaders.authorization;
      const currentCookieHeader = currentHeaders.cookie;
      const authorizationWasExplicitlyOmitted = isHeaderExplicitlyOmitted("authorization") || authorizationWasInitiallyExplicit && distribution_default.undefined(currentAuthorizationHeader);
      const cookieWasExplicitlyOmitted = distribution_default.undefined(currentCookieHeader) && (cookieWasInitiallyOmitted || isHeaderExplicitlyOmitted("cookie"));
      sanitizeHeaders();
      if (!distribution_default.undefined(currentHeaders["transfer-encoding"]) && !distribution_default.undefined(currentHeaders["content-length"])) {
        options.deleteInternalHeader("content-length");
      }
      if (authorizationWasExplicitlyOmitted) {
        shouldOmitRequestUrlCredentials = true;
        options.deleteInternalHeader("authorization");
        if (changedState.has("authorization") && distribution_default.undefined(explicitAuthorizationHeader) && !authorizationWasInitiallyOmitted) {
          delete options.headers.authorization;
        }
      }
      const authorizationHeader = !authorizationWasInitiallyExplicit && !authorizationWasInitiallyOmitted && !authorizationWasExplicitlyOmitted ? getAuthorizationHeader(options.username, options.password, authorizationWasExplicitlyOmitted) : void 0;
      const cookieJar2 = options.cookieJar;
      if (changedState.has("authorization") && !distribution_default.undefined(currentAuthorizationHeader)) {
      } else {
        const restorableAuthorizationHeader = changedState.has("authorization") && distribution_default.undefined(currentAuthorizationHeader) ? void 0 : explicitAuthorizationHeader;
        syncGeneratedHeader("authorization", {
          currentHeader: currentAuthorizationHeader,
          explicitHeader: restorableAuthorizationHeader,
          nextHeader: authorizationHeader,
          staleGeneratedHeader: generatedAuthorizationHeader
        });
      }
      if (cookieWasExplicitlyOmitted) {
        options.deleteInternalHeader("cookie");
        if (changedState.has("cookie") && distribution_default.undefined(explicitCookieHeader) && !cookieWasInitiallyOmitted) {
          delete options.headers.cookie;
        }
      } else if (changedState.has("cookie")) {
      } else {
        const cookieHeader = !cookieWasInitiallyOmitted && !cookieWasExplicitlyOmitted ? await getCookieHeader(cookieJar2) : void 0;
        syncGeneratedHeader("cookie", {
          currentHeader: currentCookieHeader,
          explicitHeader: explicitCookieHeader,
          nextHeader: cookieHeader,
          staleGeneratedHeader: generatedCookieHeader
        });
      }
    }
    request ??= options.getRequestFunction();
    const url = shouldOmitRequestUrlCredentials ? new URL(stripUrlAuth(options.url)) : options.url;
    this._requestOptions = options.createNativeRequestOptions();
    if (shouldOmitRequestUrlCredentials) {
      this._requestOptions.auth = void 0;
    }
    if (options.cache) {
      this._requestOptions._request = request;
      this._requestOptions.cache = options.cache;
      this._requestOptions.body = options.body;
      this._requestOptions.beforeCacheHooks = options.hooks.beforeCache;
      this._requestOptions.gotRequest = this;
      try {
        this._prepareCache(options.cache);
      } catch (error) {
        throw new CacheError(normalizeError(error), this);
      }
    }
    const function_ = options.cache ? this._createCacheableRequest : request;
    try {
      let requestOrResponse = function_(url, this._requestOptions);
      if (distribution_default.promise(requestOrResponse)) {
        requestOrResponse = await requestOrResponse;
      }
      if (is_client_request_default(requestOrResponse)) {
        this._onRequest(requestOrResponse);
      } else if (this.writableEnded) {
        void this._onResponse(requestOrResponse);
      } else {
        this.once("finish", () => {
          void this._onResponse(requestOrResponse);
        });
        this._sendBody();
      }
    } catch (error) {
      if (error instanceof CacheError2) {
        throw new CacheError(error, this);
      }
      throw error;
    }
  }
  async _error(error) {
    try {
      if (this.options && (!(error instanceof HTTPError) || this.options.throwHttpErrors)) {
        const hooks = this.options.hooks.beforeError;
        if (hooks.length > 0) {
          for (const hook of hooks) {
            error = await hook(error);
            if (!(error instanceof Error)) {
              throw new TypeError(`The \`beforeError\` hook must return an Error instance. Received ${distribution_default.string(error) ? "string" : String(typeof error)}.`);
            }
          }
          if (!(error instanceof RequestError)) {
            errorsProcessedByHooks.add(error);
          }
        }
      }
    } catch (error_) {
      const normalizedError = normalizeError(error_);
      error = new RequestError(normalizedError.message, normalizedError, this);
    }
    publishError({
      requestId: this._requestId,
      url: getSanitizedUrl(this.options),
      error,
      timings: this.timings
    });
    this.destroy(error);
    if (this._noPipe) {
      import_node_process2.default.nextTick(() => {
        this.emit("error", error);
      });
    }
  }
  _writeRequest(chunk2, encoding, callback, request = this._request) {
    if (!request || request.destroyed) {
      callback();
      return;
    }
    request.write(chunk2, encoding, (error) => {
      if (!error && !request.destroyed && this._request === request) {
        const bytes = typeof chunk2 === "string" ? import_node_buffer2.Buffer.from(chunk2, encoding) : chunk2;
        this._uploadedSize += byteLength(bytes);
        const progress = this.uploadProgress;
        if (progress.percent < 1) {
          this.emit("uploadProgress", progress);
        }
      }
      callback(error);
    });
  }
  /**
  The remote IP address.
  */
  get ip() {
    return this.socket?.remoteAddress;
  }
  /**
  Indicates whether the request has been aborted or not.
  */
  get isAborted() {
    return this._aborted;
  }
  get socket() {
    return this._request?.socket ?? void 0;
  }
  /**
  Progress event for downloading (receiving a response).
  */
  get downloadProgress() {
    return makeProgress(this._downloadedSize, this._responseSize);
  }
  /**
  Progress event for uploading (sending a request).
  */
  get uploadProgress() {
    return makeProgress(this._uploadedSize, this._bodySize);
  }
  /**
      The object contains the following properties:
  
      - `start` - Time when the request started.
      - `socket` - Time when a socket was assigned to the request.
      - `lookup` - Time when the DNS lookup finished.
      - `connect` - Time when the socket successfully connected.
      - `secureConnect` - Time when the socket securely connected.
      - `upload` - Time when the request finished uploading.
      - `response` - Time when the request fired `response` event.
      - `end` - Time when the response fired `end` event.
      - `error` - Time when the request fired `error` event.
      - `abort` - Time when the request fired `abort` event.
      - `phases`
          - `wait` - `timings.socket - timings.start`
          - `dns` - `timings.lookup - timings.socket`
          - `tcp` - `timings.connect - timings.lookup`
          - `tls` - `timings.secureConnect - timings.connect`
          - `request` - `timings.upload - (timings.secureConnect || timings.connect)`
          - `firstByte` - `timings.response - timings.upload`
          - `download` - `timings.end - timings.response`
          - `total` - `(timings.end || timings.error || timings.abort) - timings.start`
  
      If something has not been measured yet, it will be `undefined`.
  
      __Note__: The time is a `number` representing the milliseconds elapsed since the UNIX epoch.
      */
  get timings() {
    return this._request?.timings;
  }
  /**
  Whether the response was retrieved from the cache.
  */
  get isFromCache() {
    return this.response?.isFromCache;
  }
  get reusedSocket() {
    return this._request?.reusedSocket;
  }
  /**
  Whether the stream is read-only. Returns `true` when `body`, `json`, or `form` options are provided.
  */
  get isReadonly() {
    return !distribution_default.undefined(this.options?.body) || !distribution_default.undefined(this.options?.json) || !distribution_default.undefined(this.options?.form);
  }
};

// node_modules/got/dist/source/as-promise/index.js
var compressedEncodings = /* @__PURE__ */ new Set(["gzip", "deflate", "br", "zstd"]);
var proxiedRequestEvents2 = [
  "request",
  "response",
  "redirect",
  "uploadProgress",
  "downloadProgress"
];
function asPromise(firstRequest) {
  let globalRequest;
  let globalResponse;
  const emitter = new import_node_events5.EventEmitter();
  let promiseSettled = false;
  const promise = new Promise((resolve, reject) => {
    const makeRequest = (retryCount, defaultOptions) => {
      const request = firstRequest ?? new Request(void 0, void 0, defaultOptions);
      request.retryCount = retryCount;
      request._noPipe = true;
      globalRequest = request;
      request.once("response", (response) => {
        void (async () => {
          const contentEncoding = (response.headers["content-encoding"] ?? "").toLowerCase();
          const isCompressed = compressedEncodings.has(contentEncoding);
          const { options } = request;
          if (isCompressed && !options.decompress) {
            response.body = response.rawBody;
          } else {
            try {
              response.body = parseBody(response, options.responseType, options.parseJson, options.encoding);
            } catch (error) {
              try {
                response.body = decodeUint8Array(response.rawBody);
              } catch (error2) {
                request._beforeError(new ParseError(normalizeError(error2), response));
                return;
              }
              if (isResponseOk(response)) {
                request._beforeError(normalizeError(error));
                return;
              }
            }
          }
          try {
            const hooks = options.hooks.afterResponse;
            for (const [index, hook] of hooks.entries()) {
              const previousUrl = options.url ? new URL(options.url) : void 0;
              const previousState = previousUrl ? snapshotCrossOriginState(options) : void 0;
              const requestOptions = response.request.options;
              const responseSnapshot = response;
              response = await requestOptions.trackStateMutations(async (changedState) => hook(responseSnapshot, async (updatedOptions) => {
                const preserveHooks = updatedOptions.preserveHooks ?? false;
                const reusesRequestOptions = updatedOptions === requestOptions;
                const hasExplicitBody = reusesRequestOptions ? changedState.has("body") || changedState.has("json") || changedState.has("form") : Object.hasOwn(updatedOptions, "body") && updatedOptions.body !== void 0 || Object.hasOwn(updatedOptions, "json") && updatedOptions.json !== void 0 || Object.hasOwn(updatedOptions, "form") && updatedOptions.form !== void 0;
                const clearsCookieJar = Object.hasOwn(updatedOptions, "cookieJar") && updatedOptions.cookieJar === void 0;
                if (hasExplicitBody && !reusesRequestOptions) {
                  options.clearBody();
                }
                if (!reusesRequestOptions && clearsCookieJar) {
                  options.cookieJar = void 0;
                }
                if (!reusesRequestOptions) {
                  options.merge(updatedOptions);
                  options.syncCookieHeaderAfterMerge(previousState, updatedOptions.headers);
                }
                options.clearUnchangedCookieHeader(previousState, reusesRequestOptions ? changedState : void 0);
                if (updatedOptions.url) {
                  const nextUrl = reusesRequestOptions ? options.url : applyUrlOverride(options, updatedOptions.url, updatedOptions);
                  if (previousUrl) {
                    if (reusesRequestOptions && !isSameOrigin(previousUrl, nextUrl)) {
                      options.stripUnchangedCrossOriginState(previousState, changedState, { clearBody: !hasExplicitBody });
                    } else {
                      options.stripSensitiveHeaders(previousUrl, nextUrl, updatedOptions);
                      if (!isSameOrigin(previousUrl, nextUrl) && !hasExplicitBody) {
                        options.clearBody();
                      }
                    }
                  }
                }
                if (!preserveHooks) {
                  options.hooks.afterResponse = options.hooks.afterResponse.slice(0, index);
                }
                throw new RetryError(request);
              }));
              if (!(distribution_default.object(response) && distribution_default.number(response.statusCode) && "body" in response)) {
                throw new TypeError("The `afterResponse` hook returned an invalid value");
              }
            }
          } catch (error) {
            request._beforeError(normalizeError(error));
            return;
          }
          globalResponse = response;
          if (!isResponseOk(response)) {
            request._beforeError(new HTTPError(response));
            return;
          }
          request.destroy();
          promiseSettled = true;
          resolve(request.options.resolveBodyOnly ? response.body : response);
        })();
      });
      let handledFinalError = false;
      const onError = (error) => {
        if (!request._stopReading) {
          request._beforeError(error);
          return;
        }
        if (handledFinalError) {
          return;
        }
        handledFinalError = true;
        promiseSettled = true;
        const { options } = request;
        if (error instanceof HTTPError && !options.throwHttpErrors) {
          const { response } = error;
          request.destroy();
          resolve(request.options.resolveBodyOnly ? response.body : response);
          return;
        }
        reject(error);
      };
      request.on("error", onError);
      const previousBody = request.options?.body;
      request.once("retry", (newRetryCount, error) => {
        firstRequest = void 0;
        if (promiseSettled) {
          return;
        }
        const newBody = request.options.body;
        if (previousBody === newBody && (distribution_default.nodeStream(newBody) || newBody instanceof ReadableStream)) {
          error.message = "Cannot retry with consumed body stream";
          onError(error);
          return;
        }
        makeRequest(newRetryCount, request.options);
      });
      proxyEvents(request, emitter, proxiedRequestEvents2);
      if (distribution_default.undefined(firstRequest)) {
        void request.flush();
      }
    };
    makeRequest(0);
  });
  promise.on = function(event, function_) {
    emitter.on(event, function_);
    return this;
  };
  promise.once = function(event, function_) {
    emitter.once(event, function_);
    return this;
  };
  promise.off = function(event, function_) {
    emitter.off(event, function_);
    return this;
  };
  const shortcut = (promiseToAwait, responseType) => {
    const newPromise = (async () => {
      await promiseToAwait;
      const { options } = globalResponse.request;
      if (responseType === "text") {
        const text = decodeUint8Array(globalResponse.rawBody, options.encoding);
        return isUtf8Encoding(options.encoding) ? text.replace(new RegExp("^\\u{FEFF}", "v"), "") : text;
      }
      return parseBody(globalResponse, responseType, options.parseJson, options.encoding);
    })();
    Object.defineProperties(newPromise, Object.getOwnPropertyDescriptors(promiseToAwait));
    return newPromise;
  };
  promise.json = function() {
    if (globalRequest.options) {
      const { headers } = globalRequest.options;
      if (!globalRequest.writableFinished && !("accept" in headers)) {
        headers.accept = "application/json";
      }
    }
    return shortcut(this, "json");
  };
  promise.buffer = function() {
    return shortcut(this, "buffer");
  };
  promise.text = function() {
    return shortcut(this, "text");
  };
  return promise;
}

// node_modules/got/dist/source/create.js
var isGotInstance = (value) => distribution_default.function(value);
var aliases = [
  "get",
  "post",
  "put",
  "patch",
  "head",
  "delete"
];
var optionsObjectUrlErrorMessage = "The `url` option is not supported in options objects. Pass it as the first argument instead.";
var assertNoUrlInOptionsObject = (options) => {
  if (Object.hasOwn(options, "url")) {
    throw new TypeError(optionsObjectUrlErrorMessage);
  }
};
var cloneWithProperty = (value, property, propertyValue) => {
  const clone = Object.create(Object.getPrototypeOf(value), Object.getOwnPropertyDescriptors(value));
  Object.defineProperty(clone, property, {
    value: propertyValue,
    enumerable: true,
    configurable: true,
    writable: true
  });
  return clone;
};
var create = (defaults2) => {
  defaults2 = {
    options: new Options(void 0, void 0, defaults2.options),
    handlers: [...defaults2.handlers],
    mutableDefaults: defaults2.mutableDefaults
  };
  Object.defineProperty(defaults2, "mutableDefaults", {
    enumerable: true,
    configurable: false,
    writable: false
  });
  const makeRequest = (url, options, defaultOptions, isStream2) => {
    if (distribution_default.plainObject(url)) {
      assertNoUrlInOptionsObject(url);
    }
    if (distribution_default.plainObject(options)) {
      assertNoUrlInOptionsObject(options);
    }
    const requestUrl = isStream2 && distribution_default.plainObject(url) ? cloneWithProperty(url, "isStream", true) : url;
    const requestOptions = isStream2 && !distribution_default.plainObject(url) && options ? cloneWithProperty(options, "isStream", true) : options;
    const request = new Request(requestUrl, requestOptions, defaultOptions);
    if (isStream2 && request.options) {
      request.options.isStream = true;
    }
    let promise;
    const lastHandler = (normalized) => {
      request.options = normalized;
      const shouldReturnStream = normalized?.isStream ?? isStream2;
      request._noPipe = !shouldReturnStream;
      void request.flush();
      if (shouldReturnStream) {
        return request;
      }
      promise ??= asPromise(request);
      return promise;
    };
    let iteration = 0;
    const iterateHandlers = (newOptions) => {
      const handler = defaults2.handlers[iteration++] ?? lastHandler;
      const result = handler(newOptions, iterateHandlers);
      if (distribution_default.promise(result) && !request.options?.isStream) {
        promise ??= asPromise(request);
        if (result !== promise) {
          const descriptors = Object.getOwnPropertyDescriptors(promise);
          for (const key in descriptors) {
            if (key in result) {
              delete descriptors[key];
            }
          }
          Object.defineProperties(result, descriptors);
        }
      }
      return result;
    };
    return iterateHandlers(request.options);
  };
  const got2 = ((url, options, defaultOptions = defaults2.options) => makeRequest(url, options, defaultOptions, false));
  got2.extend = (...instancesOrOptions) => {
    const options = new Options(void 0, void 0, defaults2.options);
    const handlers = [...defaults2.handlers];
    let mutableDefaults;
    for (const value of instancesOrOptions) {
      if (isGotInstance(value)) {
        options.merge(value.defaults.options);
        handlers.push(...value.defaults.handlers);
        mutableDefaults = value.defaults.mutableDefaults;
      } else {
        assertNoUrlInOptionsObject(value);
        options.merge(value);
        if (value.handlers) {
          handlers.push(...value.handlers);
        }
        mutableDefaults = value.mutableDefaults;
      }
    }
    return create({
      options,
      handlers,
      mutableDefaults: Boolean(mutableDefaults)
    });
  };
  const paginateEach = (async function* (url, options) {
    if (distribution_default.plainObject(url)) {
      assertNoUrlInOptionsObject(url);
    }
    if (distribution_default.plainObject(options)) {
      assertNoUrlInOptionsObject(options);
    }
    let normalizedOptions = new Options(url, options, defaults2.options);
    normalizedOptions.resolveBodyOnly = false;
    const { pagination } = normalizedOptions;
    assert.function(pagination.transform);
    assert.function(pagination.shouldContinue);
    assert.function(pagination.filter);
    assert.function(pagination.paginate);
    assert.number(pagination.countLimit);
    assert.number(pagination.requestLimit);
    assert.number(pagination.backoff);
    const allItems = [];
    let { countLimit } = pagination;
    let numberOfRequests = 0;
    while (numberOfRequests < pagination.requestLimit) {
      if (numberOfRequests !== 0) {
        await (0, import_promises2.setTimeout)(pagination.backoff);
      }
      const response = await got2(void 0, void 0, normalizedOptions);
      const parsed = await pagination.transform(response);
      const currentItems = [];
      assert.array(parsed);
      for (const item of parsed) {
        if (pagination.filter({ item, currentItems, allItems })) {
          if (!pagination.shouldContinue({ item, currentItems, allItems })) {
            return;
          }
          yield item;
          if (pagination.stackAllItems) {
            allItems.push(item);
          }
          currentItems.push(item);
          if (--countLimit <= 0) {
            return;
          }
        }
      }
      const requestOptions = response.request.options;
      const previousUrl = requestOptions.url ? new URL(requestOptions.url) : void 0;
      const previousState = previousUrl ? snapshotCrossOriginState(requestOptions) : void 0;
      const [optionsToMerge, changedState] = await requestOptions.trackStateMutations(async (changedState2) => [
        pagination.paginate({
          response,
          currentItems,
          allItems
        }),
        changedState2
      ]);
      if (optionsToMerge === false) {
        return;
      }
      if (optionsToMerge === response.request.options) {
        normalizedOptions = response.request.options;
        normalizedOptions.clearUnchangedCookieHeader(previousState, changedState);
        if (previousUrl) {
          const nextUrl = normalizedOptions.url;
          if (nextUrl && !isSameOrigin(previousUrl, nextUrl)) {
            normalizedOptions.prefixUrl = "";
            normalizedOptions.stripUnchangedCrossOriginState(previousState, changedState);
          }
        }
      } else {
        const hasExplicitBody = Object.hasOwn(optionsToMerge, "body") && optionsToMerge.body !== void 0 || Object.hasOwn(optionsToMerge, "json") && optionsToMerge.json !== void 0 || Object.hasOwn(optionsToMerge, "form") && optionsToMerge.form !== void 0;
        const clearsCookieJar = Object.hasOwn(optionsToMerge, "cookieJar") && optionsToMerge.cookieJar === void 0;
        if (hasExplicitBody) {
          normalizedOptions.clearBody();
        }
        if (clearsCookieJar) {
          normalizedOptions.cookieJar = void 0;
        }
        normalizedOptions.merge(optionsToMerge);
        normalizedOptions.syncCookieHeaderAfterMerge(previousState, optionsToMerge.headers);
        try {
          assert.any([distribution_default.string, distribution_default.urlInstance, distribution_default.undefined], optionsToMerge.url);
        } catch (error) {
          if (error instanceof Error) {
            error.message = `Option 'pagination.paginate.url': ${error.message}`;
          }
          throw error;
        }
        if (optionsToMerge.url !== void 0) {
          const nextUrl = applyUrlOverride(normalizedOptions, optionsToMerge.url, optionsToMerge);
          if (previousUrl) {
            normalizedOptions.stripSensitiveHeaders(previousUrl, nextUrl, optionsToMerge);
            if (!isSameOrigin(previousUrl, nextUrl) && !hasExplicitBody) {
              normalizedOptions.clearBody();
            }
          }
        }
      }
      numberOfRequests++;
    }
  });
  got2.paginate = paginateEach;
  got2.paginate.all = (async (url, options) => Array.fromAsync(paginateEach(url, options)));
  got2.paginate.each = paginateEach;
  got2.stream = ((url, options) => makeRequest(url, options, defaults2.options, true));
  for (const method of aliases) {
    got2[method] = ((url, options) => got2(url, { ...options, method }));
    got2.stream[method] = ((url, options) => makeRequest(url, { ...options, method }, defaults2.options, true));
  }
  if (!defaults2.mutableDefaults) {
    Object.freeze(defaults2.handlers);
    defaults2.options.freeze();
  }
  Object.defineProperty(got2, "defaults", {
    value: defaults2,
    writable: false,
    configurable: false,
    enumerable: true
  });
  return got2;
};
var create_default = create;

// node_modules/got/dist/source/index.js
var defaults = {
  options: new Options(),
  handlers: [],
  mutableDefaults: false
};
var got = create_default(defaults);
var source_default = got;

// node_modules/tough-cookie/dist/index.js
var import_tldts = __toESM(require_cjs(), 1);
function pathMatch(reqPath, cookiePath) {
  if (cookiePath === reqPath) {
    return true;
  }
  const idx = reqPath.indexOf(cookiePath);
  if (idx === 0) {
    if (cookiePath[cookiePath.length - 1] === "/") {
      return true;
    }
    if (reqPath.startsWith(cookiePath) && reqPath[cookiePath.length] === "/") {
      return true;
    }
  }
  return false;
}
var SPECIAL_USE_DOMAINS = ["local", "example", "invalid", "localhost", "test"];
var SPECIAL_TREATMENT_DOMAINS = ["localhost", "invalid"];
var defaultGetPublicSuffixOptions = {
  allowSpecialUseDomain: false,
  ignoreError: false
};
function getPublicSuffix(domain, options = {}) {
  options = { ...defaultGetPublicSuffixOptions, ...options };
  const domainParts = domain.split(".");
  const topLevelDomain = domainParts[domainParts.length - 1];
  const allowSpecialUseDomain = !!options.allowSpecialUseDomain;
  const ignoreError = !!options.ignoreError;
  if (allowSpecialUseDomain && topLevelDomain !== void 0 && SPECIAL_USE_DOMAINS.includes(topLevelDomain)) {
    if (domainParts.length > 1) {
      const secondLevelDomain = domainParts[domainParts.length - 2];
      return `${secondLevelDomain}.${topLevelDomain}`;
    } else if (SPECIAL_TREATMENT_DOMAINS.includes(topLevelDomain)) {
      return topLevelDomain;
    }
  }
  if (!ignoreError && topLevelDomain !== void 0 && SPECIAL_USE_DOMAINS.includes(topLevelDomain)) {
    throw new Error(
      `Cookie has domain set to the public suffix "${topLevelDomain}" which is a special use domain. To allow this, configure your CookieJar with {allowSpecialUseDomain: true, rejectPublicSuffixes: false}.`
    );
  }
  const publicSuffix = (0, import_tldts.getDomain)(domain, {
    allowIcannDomains: true,
    allowPrivateDomains: true
  });
  if (publicSuffix) return publicSuffix;
}
function permuteDomain(domain, allowSpecialUseDomain) {
  const pubSuf = getPublicSuffix(domain, {
    allowSpecialUseDomain
  });
  if (!pubSuf) {
    return void 0;
  }
  if (pubSuf == domain) {
    return [domain];
  }
  if (domain.slice(-1) == ".") {
    domain = domain.slice(0, -1);
  }
  const prefix = domain.slice(0, -(pubSuf.length + 1));
  const parts = prefix.split(".").reverse();
  let cur = pubSuf;
  const permutations = [cur];
  while (parts.length) {
    const part = parts.shift();
    cur = `${part}.${cur}`;
    permutations.push(cur);
  }
  return permutations;
}
var Store = class {
  constructor() {
    this.synchronous = false;
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  findCookie(_domain, _path, _key, _callback) {
    throw new Error("findCookie is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  findCookies(_domain, _path, _allowSpecialUseDomain = false, _callback) {
    throw new Error("findCookies is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  putCookie(_cookie, _callback) {
    throw new Error("putCookie is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  updateCookie(_oldCookie, _newCookie, _callback) {
    throw new Error("updateCookie is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeCookie(_domain, _path, _key, _callback) {
    throw new Error("removeCookie is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeCookies(_domain, _path, _callback) {
    throw new Error("removeCookies is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeAllCookies(_callback) {
    throw new Error("removeAllCookies is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  getAllCookies(_callback) {
    throw new Error(
      "getAllCookies is not implemented (therefore jar cannot be serialized)"
    );
  }
};
var objectToString3 = (obj) => Object.prototype.toString.call(obj);
var safeArrayToString = (arr, seenArrays) => {
  if (typeof arr.join !== "function") return objectToString3(arr);
  seenArrays.add(arr);
  const mapped = arr.map(
    (val) => val === null || val === void 0 || seenArrays.has(val) ? "" : safeToStringImpl(val, seenArrays)
  );
  return mapped.join();
};
var safeToStringImpl = (val, seenArrays = /* @__PURE__ */ new WeakSet()) => {
  if (typeof val !== "object" || val === null) {
    return String(val);
  } else if (typeof val.toString === "function") {
    return Array.isArray(val) ? (
      // Arrays have a weird custom toString that we need to replicate
      safeArrayToString(val, seenArrays)
    ) : (
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      String(val)
    );
  } else {
    return objectToString3(val);
  }
};
var safeToString = (val) => safeToStringImpl(val);
function createPromiseCallback(cb) {
  let callback;
  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  if (typeof cb === "function") {
    callback = (err, result) => {
      try {
        if (err) cb(err);
        else cb(null, result);
      } catch (e) {
        reject(e instanceof Error ? e : new Error());
      }
    };
  } else {
    callback = (err, result) => {
      try {
        if (err) reject(err);
        else resolve(result);
      } catch (e) {
        reject(e instanceof Error ? e : new Error());
      }
    };
  }
  return {
    promise,
    callback,
    resolve: (value) => {
      callback(null, value);
      return promise;
    },
    reject: (error) => {
      callback(error);
      return promise;
    }
  };
}
function inOperator(k, o2) {
  return k in o2;
}
var MemoryCookieStore = class extends Store {
  /**
   * Create a new {@link MemoryCookieStore}.
   */
  constructor() {
    super();
    this.synchronous = true;
    this.idx = /* @__PURE__ */ Object.create(null);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  findCookie(domain, path, key, callback) {
    const promiseCallback = createPromiseCallback(callback);
    if (domain == null || path == null || key == null) {
      return promiseCallback.resolve(void 0);
    }
    const result = this.idx[domain]?.[path]?.[key];
    return promiseCallback.resolve(result);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  findCookies(domain, path, allowSpecialUseDomain = false, callback) {
    if (typeof allowSpecialUseDomain === "function") {
      callback = allowSpecialUseDomain;
      allowSpecialUseDomain = true;
    }
    const results = [];
    const promiseCallback = createPromiseCallback(callback);
    if (!domain) {
      return promiseCallback.resolve([]);
    }
    let pathMatcher;
    if (!path) {
      pathMatcher = function matchAll(domainIndex) {
        for (const curPath in domainIndex) {
          const pathIndex = domainIndex[curPath];
          for (const key in pathIndex) {
            const value = pathIndex[key];
            if (value) {
              results.push(value);
            }
          }
        }
      };
    } else {
      pathMatcher = function matchRFC(domainIndex) {
        for (const cookiePath in domainIndex) {
          if (pathMatch(path, cookiePath)) {
            const pathIndex = domainIndex[cookiePath];
            for (const key in pathIndex) {
              const value = pathIndex[key];
              if (value) {
                results.push(value);
              }
            }
          }
        }
      };
    }
    const domains = permuteDomain(domain, allowSpecialUseDomain) || [domain];
    const idx = this.idx;
    domains.forEach((curDomain) => {
      const domainIndex = idx[curDomain];
      if (!domainIndex) {
        return;
      }
      pathMatcher(domainIndex);
    });
    return promiseCallback.resolve(results);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  putCookie(cookie, callback) {
    const promiseCallback = createPromiseCallback(callback);
    const { domain, path, key } = cookie;
    if (domain == null || path == null || key == null) {
      return promiseCallback.resolve(void 0);
    }
    const domainEntry = this.idx[domain] ?? /* @__PURE__ */ Object.create(null);
    this.idx[domain] = domainEntry;
    const pathEntry = domainEntry[path] ?? /* @__PURE__ */ Object.create(null);
    domainEntry[path] = pathEntry;
    pathEntry[key] = cookie;
    return promiseCallback.resolve(void 0);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  updateCookie(_oldCookie, newCookie, callback) {
    if (callback) this.putCookie(newCookie, callback);
    else return this.putCookie(newCookie);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeCookie(domain, path, key, callback) {
    const promiseCallback = createPromiseCallback(callback);
    delete this.idx[domain]?.[path]?.[key];
    return promiseCallback.resolve(void 0);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeCookies(domain, path, callback) {
    const promiseCallback = createPromiseCallback(callback);
    const domainEntry = this.idx[domain];
    if (domainEntry) {
      if (path) {
        delete domainEntry[path];
      } else {
        delete this.idx[domain];
      }
    }
    return promiseCallback.resolve(void 0);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeAllCookies(callback) {
    const promiseCallback = createPromiseCallback(callback);
    this.idx = /* @__PURE__ */ Object.create(null);
    return promiseCallback.resolve(void 0);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  getAllCookies(callback) {
    const promiseCallback = createPromiseCallback(callback);
    const cookies = [];
    const idx = this.idx;
    const domains = Object.keys(idx);
    domains.forEach((domain) => {
      const domainEntry = idx[domain] ?? {};
      const paths = Object.keys(domainEntry);
      paths.forEach((path) => {
        const pathEntry = domainEntry[path] ?? {};
        const keys = Object.keys(pathEntry);
        keys.forEach((key) => {
          const keyEntry = pathEntry[key];
          if (keyEntry != null) {
            cookies.push(keyEntry);
          }
        });
      });
    });
    cookies.sort((a2, b) => {
      return (a2.creationIndex || 0) - (b.creationIndex || 0);
    });
    return promiseCallback.resolve(cookies);
  }
};
function isNonEmptyString2(data) {
  return isString2(data) && data !== "";
}
function isEmptyString2(data) {
  return data === "" || data instanceof String && data.toString() === "";
}
function isString2(data) {
  return typeof data === "string" || data instanceof String;
}
function isObject2(data) {
  return objectToString3(data) === "[object Object]";
}
function validate(bool, cbOrMessage, message) {
  if (bool) return;
  const cb = typeof cbOrMessage === "function" ? cbOrMessage : void 0;
  let options = typeof cbOrMessage === "function" ? message : cbOrMessage;
  if (!isObject2(options)) options = "[object Object]";
  const err = new ParameterError(safeToString(options));
  if (cb) cb(err);
  else throw err;
}
var ParameterError = class extends Error {
};
var version = "6.0.1";
var PrefixSecurityEnum = {
  SILENT: "silent",
  STRICT: "strict",
  DISABLED: "unsafe-disabled"
};
Object.freeze(PrefixSecurityEnum);
var IP_V6_REGEX = `
\\[?(?:
(?:[a-fA-F\\d]{1,4}:){7}(?:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,2}|:)|
(?:[a-fA-F\\d]{1,4}:){4}(?:(?::[a-fA-F\\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,3}|:)|
(?:[a-fA-F\\d]{1,4}:){3}(?:(?::[a-fA-F\\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){2}(?:(?::[a-fA-F\\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,5}|:)|
(?:[a-fA-F\\d]{1,4}:){1}(?:(?::[a-fA-F\\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,6}|:)|
(?::(?:(?::[a-fA-F\\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,7}|:))
)(?:%[0-9a-zA-Z]{1,})?\\]?
`.replace(/\s*\/\/.*$/gm, "").replace(/\n/g, "").trim();
var IP_V6_REGEX_OBJECT = new RegExp(`^${IP_V6_REGEX}$`);
var IP_V4_REGEX = `(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])`;
var IP_V4_REGEX_OBJECT = new RegExp(`^${IP_V4_REGEX}$`);
function domainToASCII(domain) {
  return new URL(`http://${domain}`).hostname;
}
function canonicalDomain(domainName) {
  if (domainName == null) {
    return void 0;
  }
  let str = domainName.trim().replace(/^\./, "");
  if (IP_V6_REGEX_OBJECT.test(str)) {
    if (!str.startsWith("[")) {
      str = "[" + str;
    }
    if (!str.endsWith("]")) {
      str = str + "]";
    }
    return domainToASCII(str).slice(1, -1);
  }
  if (/[^\u0001-\u007f]/.test(str)) {
    return domainToASCII(str);
  }
  return str.toLowerCase();
}
function formatDate(date) {
  return date.toUTCString();
}
function parseDate(cookieDate) {
  if (!cookieDate) {
    return void 0;
  }
  const flags = {
    foundTime: void 0,
    foundDayOfMonth: void 0,
    foundMonth: void 0,
    foundYear: void 0
  };
  const dateTokens = cookieDate.split(DELIMITER).filter((token) => token.length > 0);
  for (const dateToken of dateTokens) {
    if (flags.foundTime === void 0) {
      const [, hours, minutes, seconds] = TIME.exec(dateToken) || [];
      if (hours != void 0 && minutes != void 0 && seconds != void 0) {
        const parsedHours = parseInt(hours, 10);
        const parsedMinutes = parseInt(minutes, 10);
        const parsedSeconds = parseInt(seconds, 10);
        if (!isNaN(parsedHours) && !isNaN(parsedMinutes) && !isNaN(parsedSeconds)) {
          flags.foundTime = {
            hours: parsedHours,
            minutes: parsedMinutes,
            seconds: parsedSeconds
          };
          continue;
        }
      }
    }
    if (flags.foundDayOfMonth === void 0 && DAY_OF_MONTH.test(dateToken)) {
      const dayOfMonth = parseInt(dateToken, 10);
      if (!isNaN(dayOfMonth)) {
        flags.foundDayOfMonth = dayOfMonth;
        continue;
      }
    }
    if (flags.foundMonth === void 0 && MONTH.test(dateToken)) {
      const month = months.indexOf(dateToken.substring(0, 3).toLowerCase());
      if (month >= 0 && month <= 11) {
        flags.foundMonth = month;
        continue;
      }
    }
    if (flags.foundYear === void 0 && YEAR.test(dateToken)) {
      const parsedYear = parseInt(dateToken, 10);
      if (!isNaN(parsedYear)) {
        flags.foundYear = parsedYear;
        continue;
      }
    }
  }
  if (flags.foundYear !== void 0 && flags.foundYear >= 70 && flags.foundYear <= 99) {
    flags.foundYear += 1900;
  }
  if (flags.foundYear !== void 0 && flags.foundYear >= 0 && flags.foundYear <= 69) {
    flags.foundYear += 2e3;
  }
  if (flags.foundDayOfMonth === void 0 || flags.foundMonth === void 0 || flags.foundYear === void 0 || flags.foundTime === void 0) {
    return void 0;
  }
  if (flags.foundDayOfMonth < 1 || flags.foundDayOfMonth > 31) {
    return void 0;
  }
  if (flags.foundYear < 1601) {
    return void 0;
  }
  if (flags.foundTime.hours > 23) {
    return void 0;
  }
  if (flags.foundTime.minutes > 59) {
    return void 0;
  }
  if (flags.foundTime.seconds > 59) {
    return void 0;
  }
  const date = new Date(
    Date.UTC(
      flags.foundYear,
      flags.foundMonth,
      flags.foundDayOfMonth,
      flags.foundTime.hours,
      flags.foundTime.minutes,
      flags.foundTime.seconds
    )
  );
  if (date.getUTCFullYear() !== flags.foundYear || date.getUTCMonth() !== flags.foundMonth || date.getUTCDate() !== flags.foundDayOfMonth) {
    return void 0;
  }
  return date;
}
var months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"
];
var DELIMITER = /[\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/;
var TIME = /^(\d{1,2}):(\d{1,2}):(\d{1,2})(?:[\x00-\x2F\x3A-\xFF][\x00-\xFF]*)?$/;
var DAY_OF_MONTH = /^[0-9]{1,2}(?:[\x00-\x2F\x3A-\xFF][\x00-\xFF]*)?$/;
var MONTH = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\x00-\xFF]*$/i;
var YEAR = /^[\x30-\x39]{2,4}(?:[\x00-\x2F\x3A-\xFF][\x00-\xFF]*)?$/;
var COOKIE_OCTETS = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/;
var PATH_VALUE = /[\x20-\x3A\x3C-\x7E]+/;
var CONTROL_CHARS = /[\x00-\x1F]/;
var TERMINATORS = ["\n", "\r", "\0"];
function trimTerminator(str) {
  if (isEmptyString2(str)) return str;
  for (let t = 0; t < TERMINATORS.length; t++) {
    const terminator = TERMINATORS[t];
    const terminatorIdx = terminator ? str.indexOf(terminator) : -1;
    if (terminatorIdx !== -1) {
      str = str.slice(0, terminatorIdx);
    }
  }
  return str;
}
function parseCookiePair(cookiePair, looseMode) {
  cookiePair = trimTerminator(cookiePair);
  let firstEq = cookiePair.indexOf("=");
  if (looseMode) {
    if (firstEq === 0) {
      cookiePair = cookiePair.substring(1);
      firstEq = cookiePair.indexOf("=");
    }
  } else {
    if (firstEq <= 0) {
      return void 0;
    }
  }
  let cookieName, cookieValue;
  if (firstEq <= 0) {
    cookieName = "";
    cookieValue = cookiePair.trim();
  } else {
    cookieName = cookiePair.slice(0, firstEq).trim();
    cookieValue = cookiePair.slice(firstEq + 1).trim();
  }
  if (CONTROL_CHARS.test(cookieName) || CONTROL_CHARS.test(cookieValue)) {
    return void 0;
  }
  const c3 = new Cookie();
  c3.key = cookieName;
  c3.value = cookieValue;
  return c3;
}
function parse(str, options) {
  if (isEmptyString2(str) || !isString2(str)) {
    return void 0;
  }
  str = str.trim();
  const firstSemi = str.indexOf(";");
  const cookiePair = firstSemi === -1 ? str : str.slice(0, firstSemi);
  const c3 = parseCookiePair(cookiePair, options?.loose ?? false);
  if (!c3) {
    return void 0;
  }
  if (firstSemi === -1) {
    return c3;
  }
  const unparsed = str.slice(firstSemi + 1).trim();
  if (unparsed.length === 0) {
    return c3;
  }
  const cookie_avs = unparsed.split(";");
  while (cookie_avs.length) {
    const av = (cookie_avs.shift() ?? "").trim();
    if (av.length === 0) {
      continue;
    }
    const av_sep = av.indexOf("=");
    let av_key, av_value;
    if (av_sep === -1) {
      av_key = av;
      av_value = null;
    } else {
      av_key = av.slice(0, av_sep);
      av_value = av.slice(av_sep + 1);
    }
    av_key = av_key.trim().toLowerCase();
    if (av_value) {
      av_value = av_value.trim();
    }
    switch (av_key) {
      case "expires":
        if (av_value) {
          const exp = parseDate(av_value);
          if (exp) {
            c3.expires = exp;
          }
        }
        break;
      case "max-age":
        if (av_value) {
          if (/^-?[0-9]+$/.test(av_value)) {
            const delta = parseInt(av_value, 10);
            c3.setMaxAge(delta);
          }
        }
        break;
      case "domain":
        if (av_value) {
          const domain = av_value.trim().replace(/^\./, "");
          if (domain) {
            c3.domain = domain.toLowerCase();
          }
        }
        break;
      case "path":
        c3.path = av_value && av_value[0] === "/" ? av_value : null;
        break;
      case "secure":
        c3.secure = true;
        break;
      case "httponly":
        c3.httpOnly = true;
        break;
      case "samesite":
        switch (av_value ? av_value.toLowerCase() : "") {
          case "strict":
            c3.sameSite = "strict";
            break;
          case "lax":
            c3.sameSite = "lax";
            break;
          case "none":
            c3.sameSite = "none";
            break;
          default:
            c3.sameSite = void 0;
            break;
        }
        break;
      default:
        c3.extensions = c3.extensions || [];
        c3.extensions.push(av);
        break;
    }
  }
  return c3;
}
function fromJSON(str) {
  if (!str || isEmptyString2(str)) {
    return void 0;
  }
  let obj;
  if (typeof str === "string") {
    try {
      obj = JSON.parse(str);
    } catch {
      return void 0;
    }
  } else {
    obj = str;
  }
  const c3 = new Cookie();
  Cookie.serializableProperties.forEach((prop) => {
    if (obj && typeof obj === "object" && inOperator(prop, obj)) {
      const val = obj[prop];
      if (val === void 0) {
        return;
      }
      if (inOperator(prop, cookieDefaults) && val === cookieDefaults[prop]) {
        return;
      }
      switch (prop) {
        case "key":
        case "value":
        case "sameSite":
          if (typeof val === "string") {
            c3[prop] = val;
          }
          break;
        case "expires":
        case "creation":
        case "lastAccessed":
          if (typeof val === "number" || typeof val === "string" || val instanceof Date) {
            c3[prop] = obj[prop] == "Infinity" ? "Infinity" : new Date(val);
          } else if (val === null) {
            c3[prop] = null;
          }
          break;
        case "maxAge":
          if (typeof val === "number" || val === "Infinity" || val === "-Infinity") {
            c3[prop] = val;
          }
          break;
        case "domain":
        case "path":
          if (typeof val === "string" || val === null) {
            c3[prop] = val;
          }
          break;
        case "secure":
        case "httpOnly":
          if (typeof val === "boolean") {
            c3[prop] = val;
          }
          break;
        case "extensions":
          if (Array.isArray(val) && val.every((item) => typeof item === "string")) {
            c3[prop] = val;
          }
          break;
        case "hostOnly":
        case "pathIsDefault":
          if (typeof val === "boolean" || val === null) {
            c3[prop] = val;
          }
          break;
      }
    }
  });
  return c3;
}
var cookieDefaults = {
  // the order in which the RFC has them:
  key: "",
  value: "",
  expires: "Infinity",
  maxAge: null,
  domain: null,
  path: null,
  secure: false,
  httpOnly: false,
  extensions: null,
  // set by the CookieJar:
  hostOnly: null,
  pathIsDefault: null,
  creation: null,
  lastAccessed: null,
  sameSite: void 0
};
var _Cookie = class _Cookie2 {
  /**
   * Create a new Cookie instance.
   * @public
   * @param options - The attributes to set on the cookie
   */
  constructor(options = {}) {
    this.key = options.key ?? cookieDefaults.key;
    this.value = options.value ?? cookieDefaults.value;
    this.expires = options.expires ?? cookieDefaults.expires;
    this.maxAge = options.maxAge ?? cookieDefaults.maxAge;
    this.domain = options.domain ?? cookieDefaults.domain;
    this.path = options.path ?? cookieDefaults.path;
    this.secure = options.secure ?? cookieDefaults.secure;
    this.httpOnly = options.httpOnly ?? cookieDefaults.httpOnly;
    this.extensions = options.extensions ?? cookieDefaults.extensions;
    this.creation = options.creation ?? cookieDefaults.creation;
    this.hostOnly = options.hostOnly ?? cookieDefaults.hostOnly;
    this.pathIsDefault = options.pathIsDefault ?? cookieDefaults.pathIsDefault;
    this.lastAccessed = options.lastAccessed ?? cookieDefaults.lastAccessed;
    this.sameSite = options.sameSite ?? cookieDefaults.sameSite;
    this.creation = options.creation ?? /* @__PURE__ */ new Date();
    Object.defineProperty(this, "creationIndex", {
      configurable: false,
      enumerable: false,
      // important for assert.deepEqual checks
      writable: true,
      value: ++_Cookie2.cookiesCreated
    });
    this.creationIndex = _Cookie2.cookiesCreated;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    const now = Date.now();
    const hostOnly = this.hostOnly != null ? this.hostOnly.toString() : "?";
    const createAge = this.creation && this.creation !== "Infinity" ? `${String(now - this.creation.getTime())}ms` : "?";
    const accessAge = this.lastAccessed && this.lastAccessed !== "Infinity" ? `${String(now - this.lastAccessed.getTime())}ms` : "?";
    return `Cookie="${this.toString()}; hostOnly=${hostOnly}; aAge=${accessAge}; cAge=${createAge}"`;
  }
  /**
   * For convenience in using `JSON.stringify(cookie)`. Returns a plain-old Object that can be JSON-serialized.
   *
   * @remarks
   * - Any `Date` properties (such as {@link Cookie.expires}, {@link Cookie.creation}, and {@link Cookie.lastAccessed}) are exported in ISO format (`Date.toISOString()`).
   *
   *  - Custom Cookie properties are discarded. In tough-cookie 1.x, since there was no {@link Cookie.toJSON} method explicitly defined, all enumerable properties were captured.
   *      If you want a property to be serialized, add the property name to {@link Cookie.serializableProperties}.
   */
  toJSON() {
    const obj = {};
    for (const prop of _Cookie2.serializableProperties) {
      const val = this[prop];
      if (val === cookieDefaults[prop]) {
        continue;
      }
      switch (prop) {
        case "key":
        case "value":
        case "sameSite":
          if (typeof val === "string") {
            obj[prop] = val;
          }
          break;
        case "expires":
        case "creation":
        case "lastAccessed":
          if (typeof val === "number" || typeof val === "string" || val instanceof Date) {
            obj[prop] = val == "Infinity" ? "Infinity" : new Date(val).toISOString();
          } else if (val === null) {
            obj[prop] = null;
          }
          break;
        case "maxAge":
          if (typeof val === "number" || val === "Infinity" || val === "-Infinity") {
            obj[prop] = val;
          }
          break;
        case "domain":
        case "path":
          if (typeof val === "string" || val === null) {
            obj[prop] = val;
          }
          break;
        case "secure":
        case "httpOnly":
          if (typeof val === "boolean") {
            obj[prop] = val;
          }
          break;
        case "extensions":
          if (Array.isArray(val)) {
            obj[prop] = val;
          }
          break;
        case "hostOnly":
        case "pathIsDefault":
          if (typeof val === "boolean" || val === null) {
            obj[prop] = val;
          }
          break;
      }
    }
    return obj;
  }
  /**
   * Does a deep clone of this cookie, implemented exactly as `Cookie.fromJSON(cookie.toJSON())`.
   * @public
   */
  clone() {
    return fromJSON(this.toJSON());
  }
  /**
   * Validates cookie attributes for semantic correctness. Useful for "lint" checking any `Set-Cookie` headers you generate.
   * For now, it returns a boolean, but eventually could return a reason string.
   *
   * @remarks
   * Works for a few things, but is by no means comprehensive.
   *
   * @beta
   */
  validate() {
    if (!this.value || !COOKIE_OCTETS.test(this.value)) {
      return false;
    }
    if (this.expires != "Infinity" && !(this.expires instanceof Date) && !parseDate(this.expires)) {
      return false;
    }
    if (this.maxAge != null && this.maxAge !== "Infinity" && (this.maxAge === "-Infinity" || this.maxAge <= 0)) {
      return false;
    }
    if (this.path != null && !PATH_VALUE.test(this.path)) {
      return false;
    }
    const cdomain = this.cdomain();
    if (cdomain) {
      if (cdomain.match(/\.$/)) {
        return false;
      }
      const suffix = getPublicSuffix(cdomain);
      if (suffix == null) {
        return false;
      }
    }
    return true;
  }
  /**
   * Sets the 'Expires' attribute on a cookie.
   *
   * @remarks
   * When given a `string` value it will be parsed with {@link parseDate}. If the value can't be parsed as a cookie date
   * then the 'Expires' attribute will be set to `"Infinity"`.
   *
   * @param exp - the new value for the 'Expires' attribute of the cookie.
   */
  setExpires(exp) {
    if (exp instanceof Date) {
      this.expires = exp;
    } else {
      this.expires = parseDate(exp) || "Infinity";
    }
  }
  /**
   * Sets the 'Max-Age' attribute (in seconds) on a cookie.
   *
   * @remarks
   * Coerces `-Infinity` to `"-Infinity"` and `Infinity` to `"Infinity"` so it can be serialized to JSON.
   *
   * @param age - the new value for the 'Max-Age' attribute (in seconds).
   */
  setMaxAge(age) {
    if (age === Infinity) {
      this.maxAge = "Infinity";
    } else if (age === -Infinity) {
      this.maxAge = "-Infinity";
    } else {
      this.maxAge = age;
    }
  }
  /**
   * Encodes to a `Cookie` header value (specifically, the {@link Cookie.key} and {@link Cookie.value} properties joined with "=").
   * @public
   */
  cookieString() {
    const val = this.value || "";
    if (this.key) {
      return `${this.key}=${val}`;
    }
    return val;
  }
  /**
   * Encodes to a `Set-Cookie header` value.
   * @public
   */
  toString() {
    let str = this.cookieString();
    if (this.expires != "Infinity") {
      if (this.expires instanceof Date) {
        str += `; Expires=${formatDate(this.expires)}`;
      }
    }
    if (this.maxAge != null && this.maxAge != Infinity) {
      str += `; Max-Age=${String(this.maxAge)}`;
    }
    if (this.domain && !this.hostOnly) {
      str += `; Domain=${this.domain}`;
    }
    if (this.path) {
      str += `; Path=${this.path}`;
    }
    if (this.secure) {
      str += "; Secure";
    }
    if (this.httpOnly) {
      str += "; HttpOnly";
    }
    if (this.sameSite && this.sameSite !== "none") {
      if (this.sameSite.toLowerCase() === _Cookie2.sameSiteCanonical.lax.toLowerCase()) {
        str += `; SameSite=${_Cookie2.sameSiteCanonical.lax}`;
      } else if (this.sameSite.toLowerCase() === _Cookie2.sameSiteCanonical.strict.toLowerCase()) {
        str += `; SameSite=${_Cookie2.sameSiteCanonical.strict}`;
      } else {
        str += `; SameSite=${this.sameSite}`;
      }
    }
    if (this.extensions) {
      this.extensions.forEach((ext) => {
        str += `; ${ext}`;
      });
    }
    return str;
  }
  /**
   * Computes the TTL relative to now (milliseconds).
   *
   * @remarks
   * - `Infinity` is returned for cookies without an explicit expiry
   *
   * - `0` is returned if the cookie is expired.
   *
   * - Otherwise a time-to-live in milliseconds is returned.
   *
   * @param now - passing an explicit value is mostly used for testing purposes since this defaults to the `Date.now()`
   * @public
   */
  TTL(now = Date.now()) {
    if (this.maxAge != null && typeof this.maxAge === "number") {
      return this.maxAge <= 0 ? 0 : this.maxAge * 1e3;
    }
    const expires = this.expires;
    if (expires === "Infinity") {
      return Infinity;
    }
    return (expires?.getTime() ?? now) - (now || Date.now());
  }
  /**
   * Computes the absolute unix-epoch milliseconds that this cookie expires.
   *
   * The "Max-Age" attribute takes precedence over "Expires" (as per the RFC). The {@link Cookie.lastAccessed} attribute
   * (or the `now` parameter if given) is used to offset the {@link Cookie.maxAge} attribute.
   *
   * If Expires ({@link Cookie.expires}) is set, that's returned.
   *
   * @param now - can be used to provide a time offset (instead of {@link Cookie.lastAccessed}) to use when calculating the "Max-Age" value
   */
  expiryTime(now) {
    if (this.maxAge != null) {
      const relativeTo = now || this.lastAccessed || /* @__PURE__ */ new Date();
      const maxAge = typeof this.maxAge === "number" ? this.maxAge : -Infinity;
      const age = maxAge <= 0 ? -Infinity : maxAge * 1e3;
      if (relativeTo === "Infinity") {
        return Infinity;
      }
      return relativeTo.getTime() + age;
    }
    if (this.expires == "Infinity") {
      return Infinity;
    }
    return this.expires ? this.expires.getTime() : void 0;
  }
  /**
   * Similar to {@link Cookie.expiryTime}, computes the absolute unix-epoch milliseconds that this cookie expires and returns it as a Date.
   *
   * The "Max-Age" attribute takes precedence over "Expires" (as per the RFC). The {@link Cookie.lastAccessed} attribute
   * (or the `now` parameter if given) is used to offset the {@link Cookie.maxAge} attribute.
   *
   * If Expires ({@link Cookie.expires}) is set, that's returned.
   *
   * @param now - can be used to provide a time offset (instead of {@link Cookie.lastAccessed}) to use when calculating the "Max-Age" value
   */
  expiryDate(now) {
    const millisec = this.expiryTime(now);
    if (millisec == Infinity) {
      return /* @__PURE__ */ new Date(2147483647e3);
    } else if (millisec == -Infinity) {
      return /* @__PURE__ */ new Date(0);
    } else {
      return millisec == void 0 ? void 0 : new Date(millisec);
    }
  }
  /**
   * Indicates if the cookie has been persisted to a store or not.
   * @public
   */
  isPersistent() {
    return this.maxAge != null || this.expires != "Infinity";
  }
  /**
   * Calls {@link canonicalDomain} with the {@link Cookie.domain} property.
   * @public
   */
  canonicalizedDomain() {
    return canonicalDomain(this.domain);
  }
  /**
   * Alias for {@link Cookie.canonicalizedDomain}
   * @public
   */
  cdomain() {
    return canonicalDomain(this.domain);
  }
  /**
   * Parses a string into a Cookie object.
   *
   * @remarks
   * Note: when parsing a `Cookie` header it must be split by ';' before each Cookie string can be parsed.
   *
   * @example
   * ```
   * // parse a `Set-Cookie` header
   * const setCookieHeader = 'a=bcd; Expires=Tue, 18 Oct 2011 07:05:03 GMT'
   * const cookie = Cookie.parse(setCookieHeader)
   * cookie.key === 'a'
   * cookie.value === 'bcd'
   * cookie.expires === new Date(Date.parse('Tue, 18 Oct 2011 07:05:03 GMT'))
   * ```
   *
   * @example
   * ```
   * // parse a `Cookie` header
   * const cookieHeader = 'name=value; name2=value2; name3=value3'
   * const cookies = cookieHeader.split(';').map(Cookie.parse)
   * cookies[0].name === 'name'
   * cookies[0].value === 'value'
   * cookies[1].name === 'name2'
   * cookies[1].value === 'value2'
   * cookies[2].name === 'name3'
   * cookies[2].value === 'value3'
   * ```
   *
   * @param str - The `Set-Cookie` header or a Cookie string to parse.
   * @param options - Configures `strict` or `loose` mode for cookie parsing
   */
  static parse(str, options) {
    return parse(str, options);
  }
  /**
   * Does the reverse of {@link Cookie.toJSON}.
   *
   * @remarks
   * Any Date properties (such as .expires, .creation, and .lastAccessed) are parsed via Date.parse, not tough-cookie's parseDate, since ISO timestamps are being handled at this layer.
   *
   * @example
   * ```
   * const json = JSON.stringify({
   *   key: 'alpha',
   *   value: 'beta',
   *   domain: 'example.com',
   *   path: '/foo',
   *   expires: '2038-01-19T03:14:07.000Z',
   * })
   * const cookie = Cookie.fromJSON(json)
   * cookie.key === 'alpha'
   * cookie.value === 'beta'
   * cookie.domain === 'example.com'
   * cookie.path === '/foo'
   * cookie.expires === new Date(Date.parse('2038-01-19T03:14:07.000Z'))
   * ```
   *
   * @param str - An unparsed JSON string or a value that has already been parsed as JSON
   */
  static fromJSON(str) {
    return fromJSON(str);
  }
};
_Cookie.cookiesCreated = 0;
_Cookie.sameSiteLevel = {
  strict: 3,
  lax: 2,
  none: 1
};
_Cookie.sameSiteCanonical = {
  strict: "Strict",
  lax: "Lax"
};
_Cookie.serializableProperties = [
  "key",
  "value",
  "expires",
  "maxAge",
  "domain",
  "path",
  "secure",
  "httpOnly",
  "extensions",
  "hostOnly",
  "pathIsDefault",
  "creation",
  "lastAccessed",
  "sameSite"
];
var Cookie = _Cookie;
var MAX_TIME = 2147483647e3;
function cookieCompare(a2, b) {
  let cmp;
  const aPathLen = a2.path ? a2.path.length : 0;
  const bPathLen = b.path ? b.path.length : 0;
  cmp = bPathLen - aPathLen;
  if (cmp !== 0) {
    return cmp;
  }
  const aTime = a2.creation && a2.creation instanceof Date ? a2.creation.getTime() : MAX_TIME;
  const bTime = b.creation && b.creation instanceof Date ? b.creation.getTime() : MAX_TIME;
  cmp = aTime - bTime;
  if (cmp !== 0) {
    return cmp;
  }
  cmp = (a2.creationIndex || 0) - (b.creationIndex || 0);
  return cmp;
}
function defaultPath(path) {
  if (!path || path.slice(0, 1) !== "/") {
    return "/";
  }
  if (path === "/") {
    return path;
  }
  const rightSlash = path.lastIndexOf("/");
  if (rightSlash === 0) {
    return "/";
  }
  return path.slice(0, rightSlash);
}
var IP_REGEX_LOWERCASE = /(?:^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$)|(?:^(?:(?:[a-f\d]{1,4}:){7}(?:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,2}|:)|(?:[a-f\d]{1,4}:){4}(?:(?::[a-f\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,3}|:)|(?:[a-f\d]{1,4}:){3}(?:(?::[a-f\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,4}|:)|(?:[a-f\d]{1,4}:){2}(?:(?::[a-f\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,5}|:)|(?:[a-f\d]{1,4}:){1}(?:(?::[a-f\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,6}|:)|(?::(?:(?::[a-f\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,7}|:)))$)/;
function domainMatch(domain, cookieDomain, canonicalize) {
  if (domain == null || cookieDomain == null) {
    return void 0;
  }
  let _str;
  let _domStr;
  if (canonicalize !== false) {
    _str = canonicalDomain(domain);
    _domStr = canonicalDomain(cookieDomain);
  } else {
    _str = domain;
    _domStr = cookieDomain;
  }
  if (_str == null || _domStr == null) {
    return void 0;
  }
  if (_str == _domStr) {
    return true;
  }
  const idx = _str.lastIndexOf(_domStr);
  if (idx <= 0) {
    return false;
  }
  if (_str.length !== _domStr.length + idx) {
    return false;
  }
  if (_str.substring(idx - 1, idx) !== ".") {
    return false;
  }
  return !IP_REGEX_LOWERCASE.test(_str);
}
function isLoopbackV4(address) {
  const octets = address.split(".");
  return octets.length === 4 && octets[0] !== void 0 && parseInt(octets[0], 10) === 127;
}
function isLoopbackV6(address) {
  return address === "::1";
}
function isNormalizedLocalhostTLD(lowerHost) {
  return lowerHost.endsWith(".localhost");
}
function isLocalHostname(host) {
  const lowerHost = host.toLowerCase();
  return lowerHost === "localhost" || isNormalizedLocalhostTLD(lowerHost);
}
function hostNoBrackets(host) {
  if (host.length >= 2 && host.startsWith("[") && host.endsWith("]")) {
    return host.substring(1, host.length - 1);
  }
  return host;
}
function isPotentiallyTrustworthy(inputUrl, allowSecureOnLocal = true) {
  let url;
  if (typeof inputUrl === "string") {
    try {
      url = new URL(inputUrl);
    } catch {
      return false;
    }
  } else {
    url = inputUrl;
  }
  const scheme = url.protocol.replace(":", "").toLowerCase();
  const hostname = hostNoBrackets(url.hostname).replace(/\.+$/, "");
  if (scheme === "https" || scheme === "wss") {
    return true;
  }
  if (!allowSecureOnLocal) {
    return false;
  }
  if (IP_V4_REGEX_OBJECT.test(hostname)) {
    return isLoopbackV4(hostname);
  }
  if (IP_V6_REGEX_OBJECT.test(hostname)) {
    return isLoopbackV6(hostname);
  }
  return isLocalHostname(hostname);
}
var defaultSetCookieOptions = {
  loose: false,
  sameSiteContext: void 0,
  ignoreError: false,
  http: true
};
var defaultGetCookieOptions = {
  http: true,
  expire: true,
  allPaths: false,
  sameSiteContext: void 0,
  sort: void 0
};
var SAME_SITE_CONTEXT_VAL_ERR = 'Invalid sameSiteContext option for getCookies(); expected one of "strict", "lax", or "none"';
function getCookieContext(url) {
  if (url && typeof url === "object" && "hostname" in url && typeof url.hostname === "string" && "pathname" in url && typeof url.pathname === "string" && "protocol" in url && typeof url.protocol === "string") {
    return {
      hostname: url.hostname,
      pathname: url.pathname,
      protocol: url.protocol
    };
  } else if (typeof url === "string") {
    try {
      return new URL(decodeURI(url));
    } catch {
      return new URL(url);
    }
  } else {
    throw new ParameterError("`url` argument is not a string or URL.");
  }
}
function checkSameSiteContext(value) {
  const context = String(value).toLowerCase();
  if (context === "none" || context === "lax" || context === "strict") {
    return context;
  } else {
    return void 0;
  }
}
function isSecurePrefixConditionMet(cookie) {
  const startsWithSecurePrefix = typeof cookie.key === "string" && cookie.key.startsWith("__Secure-");
  return !startsWithSecurePrefix || cookie.secure;
}
function isHostPrefixConditionMet(cookie) {
  const startsWithHostPrefix = typeof cookie.key === "string" && cookie.key.startsWith("__Host-");
  return !startsWithHostPrefix || Boolean(
    cookie.secure && cookie.hostOnly && cookie.path != null && cookie.path === "/"
  );
}
function getNormalizedPrefixSecurity(prefixSecurity) {
  const normalizedPrefixSecurity = prefixSecurity.toLowerCase();
  switch (normalizedPrefixSecurity) {
    case PrefixSecurityEnum.STRICT:
    case PrefixSecurityEnum.SILENT:
    case PrefixSecurityEnum.DISABLED:
      return normalizedPrefixSecurity;
    default:
      return PrefixSecurityEnum.SILENT;
  }
}
var CookieJar = class _CookieJar {
  /**
   * Creates a new `CookieJar` instance.
   *
   * @remarks
   * - If a custom store is not passed to the constructor, an in-memory store ({@link MemoryCookieStore} will be created and used.
   * - If a boolean value is passed as the `options` parameter, this is equivalent to passing `{ rejectPublicSuffixes: <value> }`
   *
   * @param store - a custom {@link Store} implementation (defaults to {@link MemoryCookieStore})
   * @param options - configures how cookies are processed by the cookie jar
   */
  constructor(store, options) {
    if (typeof options === "boolean") {
      options = { rejectPublicSuffixes: options };
    }
    this.rejectPublicSuffixes = options?.rejectPublicSuffixes ?? true;
    this.enableLooseMode = options?.looseMode ?? false;
    this.allowSpecialUseDomain = options?.allowSpecialUseDomain ?? true;
    this.allowSecureOnLocal = options?.allowSecureOnLocal ?? true;
    this.prefixSecurity = getNormalizedPrefixSecurity(
      options?.prefixSecurity ?? "silent"
    );
    this.store = store ?? new MemoryCookieStore();
  }
  callSync(fn) {
    if (!this.store.synchronous) {
      throw new Error(
        "CookieJar store is not synchronous; use async API instead."
      );
    }
    let syncErr = null;
    let syncResult = void 0;
    try {
      fn.call(this, (error, result) => {
        syncErr = error;
        syncResult = result;
      });
    } catch (err) {
      syncErr = err;
    }
    if (syncErr) throw syncErr;
    return syncResult;
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  setCookie(cookie, url, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = void 0;
    }
    const promiseCallback = createPromiseCallback(callback);
    const cb = promiseCallback.callback;
    let context;
    try {
      if (typeof url === "string") {
        validate(
          isNonEmptyString2(url),
          callback,
          safeToString(options)
        );
      }
      context = getCookieContext(url);
      if (typeof url === "function") {
        return promiseCallback.reject(new Error("No URL was specified"));
      }
      if (typeof options === "function") {
        options = defaultSetCookieOptions;
      }
      validate(typeof cb === "function", cb);
      if (!isNonEmptyString2(cookie) && !isObject2(cookie) && cookie instanceof String && cookie.length == 0) {
        return promiseCallback.resolve(void 0);
      }
    } catch (err) {
      return promiseCallback.reject(err);
    }
    const host = canonicalDomain(context.hostname) ?? null;
    const loose = options?.loose || this.enableLooseMode;
    let sameSiteContext = null;
    if (options?.sameSiteContext) {
      sameSiteContext = checkSameSiteContext(options.sameSiteContext);
      if (!sameSiteContext) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR));
      }
    }
    if (typeof cookie === "string" || cookie instanceof String) {
      const parsedCookie = Cookie.parse(cookie.toString(), { loose });
      if (!parsedCookie) {
        const err = new Error("Cookie failed to parse");
        return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
      }
      cookie = parsedCookie;
    } else if (!(cookie instanceof Cookie)) {
      const err = new Error(
        "First argument to setCookie must be a Cookie object or string"
      );
      return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
    }
    const now = options?.now || /* @__PURE__ */ new Date();
    if (this.rejectPublicSuffixes && cookie.domain) {
      try {
        const cdomain = cookie.cdomain();
        const suffix = typeof cdomain === "string" ? getPublicSuffix(cdomain, {
          allowSpecialUseDomain: this.allowSpecialUseDomain,
          ignoreError: options?.ignoreError
        }) : null;
        if (suffix == null && !IP_V6_REGEX_OBJECT.test(cookie.domain)) {
          const err = new Error("Cookie has domain set to a public suffix");
          return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
        }
      } catch (err) {
        return options?.ignoreError ? promiseCallback.resolve(void 0) : (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          promiseCallback.reject(err)
        );
      }
    }
    if (cookie.domain) {
      if (!domainMatch(host ?? void 0, cookie.cdomain() ?? void 0, false)) {
        const err = new Error(
          `Cookie not in this host's domain. Cookie:${cookie.cdomain() ?? "null"} Request:${host ?? "null"}`
        );
        return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
      }
      if (cookie.hostOnly == null) {
        cookie.hostOnly = false;
      }
    } else {
      cookie.hostOnly = true;
      cookie.domain = host;
    }
    if (!cookie.path || cookie.path[0] !== "/") {
      cookie.path = defaultPath(context.pathname);
      cookie.pathIsDefault = true;
    }
    if (options?.http === false && cookie.httpOnly) {
      const err = new Error("Cookie is HttpOnly and this isn't an HTTP API");
      return options.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
    }
    if (cookie.sameSite !== "none" && cookie.sameSite !== void 0 && sameSiteContext) {
      if (sameSiteContext === "none") {
        const err = new Error(
          "Cookie is SameSite but this is a cross-origin request"
        );
        return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
      }
    }
    const ignoreErrorForPrefixSecurity = this.prefixSecurity === PrefixSecurityEnum.SILENT;
    const prefixSecurityDisabled = this.prefixSecurity === PrefixSecurityEnum.DISABLED;
    if (!prefixSecurityDisabled) {
      let errorFound = false;
      let errorMsg;
      if (!isSecurePrefixConditionMet(cookie)) {
        errorFound = true;
        errorMsg = "Cookie has __Secure prefix but Secure attribute is not set";
      } else if (!isHostPrefixConditionMet(cookie)) {
        errorFound = true;
        errorMsg = "Cookie has __Host prefix but either Secure or HostOnly attribute is not set or Path is not '/'";
      }
      if (errorFound) {
        return options?.ignoreError || ignoreErrorForPrefixSecurity ? promiseCallback.resolve(void 0) : promiseCallback.reject(new Error(errorMsg));
      }
    }
    const store = this.store;
    if (!store.updateCookie) {
      store.updateCookie = async function(_oldCookie, newCookie, cb2) {
        return this.putCookie(newCookie).then(
          () => cb2?.(null),
          (error) => cb2?.(error)
        );
      };
    }
    const withCookie = function withCookie2(err, oldCookie) {
      if (err) {
        cb(err);
        return;
      }
      const next = function(err2) {
        if (err2) {
          cb(err2);
        } else if (typeof cookie === "string") {
          cb(null, void 0);
        } else {
          cb(null, cookie);
        }
      };
      if (oldCookie) {
        if (options && "http" in options && options.http === false && oldCookie.httpOnly) {
          err = new Error("old Cookie is HttpOnly and this isn't an HTTP API");
          if (options.ignoreError) cb(null, void 0);
          else cb(err);
          return;
        }
        if (cookie instanceof Cookie) {
          cookie.creation = oldCookie.creation;
          cookie.creationIndex = oldCookie.creationIndex;
          cookie.lastAccessed = now;
          store.updateCookie(oldCookie, cookie, next);
        }
      } else {
        if (cookie instanceof Cookie) {
          cookie.creation = cookie.lastAccessed = now;
          store.putCookie(cookie, next);
        }
      }
    };
    store.findCookie(cookie.domain, cookie.path, cookie.key, withCookie);
    return promiseCallback.promise;
  }
  /**
   * Synchronously attempt to set the {@link Cookie} in the {@link CookieJar}.
   *
   * <strong>Note:</strong> Only works if the configured {@link Store} is also synchronous.
   *
   * @remarks
   * - If successfully persisted, the {@link Cookie} will have updated
   *     {@link Cookie.creation}, {@link Cookie.lastAccessed} and {@link Cookie.hostOnly}
   *     properties.
   *
   * - As per the RFC, the {@link Cookie.hostOnly} flag is set if there was no `Domain={value}`
   *     attribute on the cookie string. The {@link Cookie.domain} property is set to the
   *     fully-qualified hostname of `currentUrl` in this case. Matching this cookie requires an
   *     exact hostname match (not a {@link domainMatch} as per usual)
   *
   * @param cookie - The cookie object or cookie string to store. A string value will be parsed into a cookie using {@link Cookie.parse}.
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when storing the cookie.
   * @public
   */
  setCookieSync(cookie, url, options) {
    const setCookieFn = options ? this.setCookie.bind(this, cookie, url, options) : this.setCookie.bind(this, cookie, url);
    return this.callSync(setCookieFn);
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  getCookies(url, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = defaultGetCookieOptions;
    } else if (options === void 0) {
      options = defaultGetCookieOptions;
    }
    const promiseCallback = createPromiseCallback(callback);
    const cb = promiseCallback.callback;
    let context;
    try {
      if (typeof url === "string") {
        validate(isNonEmptyString2(url), cb, url);
      }
      context = getCookieContext(url);
      validate(
        isObject2(options),
        cb,
        safeToString(options)
      );
      validate(typeof cb === "function", cb);
    } catch (parameterError) {
      return promiseCallback.reject(parameterError);
    }
    const host = canonicalDomain(context.hostname);
    const path = context.pathname || "/";
    const potentiallyTrustworthy = isPotentiallyTrustworthy(
      url,
      this.allowSecureOnLocal
    );
    let sameSiteLevel = 0;
    if (options.sameSiteContext) {
      const sameSiteContext = checkSameSiteContext(options.sameSiteContext);
      if (sameSiteContext == null) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR));
      }
      sameSiteLevel = Cookie.sameSiteLevel[sameSiteContext];
      if (!sameSiteLevel) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR));
      }
    }
    const http3 = options.http ?? true;
    const now = Date.now();
    const expireCheck = options.expire ?? true;
    const allPaths = options.allPaths ?? false;
    const store = this.store;
    function matchingCookie(c3) {
      if (c3.hostOnly) {
        if (c3.domain != host) {
          return false;
        }
      } else {
        if (!domainMatch(host ?? void 0, c3.domain ?? void 0, false)) {
          return false;
        }
      }
      if (!allPaths && typeof c3.path === "string" && !pathMatch(path, c3.path)) {
        return false;
      }
      if (c3.secure && !potentiallyTrustworthy) {
        return false;
      }
      if (c3.httpOnly && !http3) {
        return false;
      }
      if (sameSiteLevel) {
        let cookieLevel;
        if (c3.sameSite === "lax") {
          cookieLevel = Cookie.sameSiteLevel.lax;
        } else if (c3.sameSite === "strict") {
          cookieLevel = Cookie.sameSiteLevel.strict;
        } else {
          cookieLevel = Cookie.sameSiteLevel.none;
        }
        if (cookieLevel > sameSiteLevel) {
          return false;
        }
      }
      const expiryTime = c3.expiryTime();
      if (expireCheck && expiryTime != void 0 && expiryTime <= now) {
        store.removeCookie(c3.domain, c3.path, c3.key, () => {
        });
        return false;
      }
      return true;
    }
    store.findCookies(
      host,
      allPaths ? null : path,
      this.allowSpecialUseDomain,
      (err, cookies) => {
        if (err) {
          cb(err);
          return;
        }
        if (cookies == null) {
          cb(null, []);
          return;
        }
        cookies = cookies.filter(matchingCookie);
        if ("sort" in options && options.sort !== false) {
          cookies = cookies.sort(cookieCompare);
        }
        const now2 = /* @__PURE__ */ new Date();
        for (const cookie of cookies) {
          cookie.lastAccessed = now2;
        }
        cb(null, cookies);
      }
    );
    return promiseCallback.promise;
  }
  /**
   * Synchronously retrieve the list of cookies that can be sent in a Cookie header for the
   * current URL.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @remarks
   * - The array of cookies returned will be sorted according to {@link cookieCompare}.
   *
   * - The {@link Cookie.lastAccessed} property will be updated on all returned cookies.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getCookiesSync(url, options) {
    return this.callSync(this.getCookies.bind(this, url, options)) ?? [];
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  getCookieString(url, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = void 0;
    }
    const promiseCallback = createPromiseCallback(callback);
    const next = function(err, cookies) {
      if (err) {
        promiseCallback.callback(err);
      } else {
        promiseCallback.callback(
          null,
          cookies?.sort(cookieCompare).map((c3) => c3.cookieString()).join("; ")
        );
      }
    };
    this.getCookies(url, options, next);
    return promiseCallback.promise;
  }
  /**
   * Synchronous version of `.getCookieString()`. Accepts the same options as `.getCookies()` but returns a string suitable for a
   * `Cookie` header rather than an Array.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getCookieStringSync(url, options) {
    return this.callSync(
      options ? this.getCookieString.bind(this, url, options) : this.getCookieString.bind(this, url)
    ) ?? "";
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  getSetCookieStrings(url, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = void 0;
    }
    const promiseCallback = createPromiseCallback(
      callback
    );
    const next = function(err, cookies) {
      if (err) {
        promiseCallback.callback(err);
      } else {
        promiseCallback.callback(
          null,
          cookies?.map((c3) => {
            return c3.toString();
          })
        );
      }
    };
    this.getCookies(url, options, next);
    return promiseCallback.promise;
  }
  /**
   * Synchronous version of `.getSetCookieStrings()`. Returns an array of strings suitable for `Set-Cookie` headers.
   * Accepts the same options as `.getCookies()`.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getSetCookieStringsSync(url, options = {}) {
    return this.callSync(this.getSetCookieStrings.bind(this, url, options)) ?? [];
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  serialize(callback) {
    const promiseCallback = createPromiseCallback(callback);
    let type = this.store.constructor.name;
    if (isObject2(type)) {
      type = null;
    }
    const serialized = {
      // The version of tough-cookie that serialized this jar. Generally a good
      // practice since future versions can make data import decisions based on
      // known past behavior. When/if this matters, use `semver`.
      version: `tough-cookie@${version}`,
      // add the store type, to make humans happy:
      storeType: type,
      // CookieJar configuration:
      rejectPublicSuffixes: this.rejectPublicSuffixes,
      enableLooseMode: this.enableLooseMode,
      allowSpecialUseDomain: this.allowSpecialUseDomain,
      prefixSecurity: getNormalizedPrefixSecurity(this.prefixSecurity),
      // this gets filled from getAllCookies:
      cookies: []
    };
    if (typeof this.store.getAllCookies !== "function") {
      return promiseCallback.reject(
        new Error(
          "store does not support getAllCookies and cannot be serialized"
        )
      );
    }
    this.store.getAllCookies((err, cookies) => {
      if (err) {
        promiseCallback.callback(err);
        return;
      }
      if (cookies == null) {
        promiseCallback.callback(null, serialized);
        return;
      }
      serialized.cookies = cookies.map((cookie) => {
        const serializedCookie = cookie.toJSON();
        delete serializedCookie.creationIndex;
        return serializedCookie;
      });
      promiseCallback.callback(null, serialized);
    });
    return promiseCallback.promise;
  }
  /**
   * Serialize the CookieJar if the underlying store supports `.getAllCookies`.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   */
  serializeSync() {
    return this.callSync((callback) => {
      this.serialize(callback);
    });
  }
  /**
   * Alias of {@link CookieJar.serializeSync}. Allows the cookie to be serialized
   * with `JSON.stringify(cookieJar)`.
   */
  toJSON() {
    return this.serializeSync();
  }
  /**
   * Use the class method CookieJar.deserialize instead of calling this directly
   * @internal
   */
  _importCookies(serialized, callback) {
    let cookies = void 0;
    if (serialized && typeof serialized === "object" && inOperator("cookies", serialized) && Array.isArray(serialized.cookies)) {
      cookies = serialized.cookies;
    }
    if (!cookies) {
      callback(new Error("serialized jar has no cookies array"), void 0);
      return;
    }
    cookies = cookies.slice();
    const putNext = (err) => {
      if (err) {
        callback(err, void 0);
        return;
      }
      if (Array.isArray(cookies)) {
        if (!cookies.length) {
          callback(err, this);
          return;
        }
        let cookie;
        try {
          cookie = Cookie.fromJSON(cookies.shift());
        } catch (e) {
          callback(e instanceof Error ? e : new Error(), void 0);
          return;
        }
        if (cookie === void 0) {
          putNext(null);
          return;
        }
        this.store.putCookie(cookie, putNext);
      }
    };
    putNext(null);
  }
  /**
   * @internal
   */
  _importCookiesSync(serialized) {
    this.callSync(this._importCookies.bind(this, serialized));
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  clone(newStore, callback) {
    if (typeof newStore === "function") {
      callback = newStore;
      newStore = void 0;
    }
    const promiseCallback = createPromiseCallback(callback);
    const cb = promiseCallback.callback;
    this.serialize((err, serialized) => {
      if (err) {
        return promiseCallback.reject(err);
      }
      return _CookieJar.deserialize(serialized ?? "", newStore, cb);
    });
    return promiseCallback.promise;
  }
  /**
   * @internal
   */
  _cloneSync(newStore) {
    const cloneFn = newStore && typeof newStore !== "function" ? this.clone.bind(this, newStore) : this.clone.bind(this);
    return this.callSync((callback) => {
      cloneFn(callback);
    });
  }
  /**
   * Produces a deep clone of this CookieJar. Modifications to the original do
   * not affect the clone, and vice versa.
   *
   * <strong>Note</strong>: Only works if both the configured Store and destination
   * Store are synchronous.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - Transferring between store types is supported so long as the source
   *     implements `.getAllCookies()` and the destination implements `.putCookie()`.
   *
   * @param newStore - The target {@link Store} to clone cookies into.
   */
  cloneSync(newStore) {
    if (!newStore) {
      return this._cloneSync();
    }
    if (!newStore.synchronous) {
      throw new Error(
        "CookieJar clone destination store is not synchronous; use async API instead."
      );
    }
    return this._cloneSync(newStore);
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  removeAllCookies(callback) {
    const promiseCallback = createPromiseCallback(callback);
    const cb = promiseCallback.callback;
    const store = this.store;
    if (typeof store.removeAllCookies === "function" && store.removeAllCookies !== Store.prototype.removeAllCookies) {
      store.removeAllCookies(cb);
      return promiseCallback.promise;
    }
    store.getAllCookies((err, cookies) => {
      if (err) {
        cb(err);
        return;
      }
      if (!cookies) {
        cookies = [];
      }
      if (cookies.length === 0) {
        cb(null, void 0);
        return;
      }
      let completedCount = 0;
      const removeErrors = [];
      const removeCookieCb = function removeCookieCb2(removeErr) {
        if (removeErr) {
          removeErrors.push(removeErr);
        }
        completedCount++;
        if (completedCount === cookies.length) {
          if (removeErrors[0]) cb(removeErrors[0]);
          else cb(null, void 0);
          return;
        }
      };
      cookies.forEach((cookie) => {
        store.removeCookie(
          cookie.domain,
          cookie.path,
          cookie.key,
          removeCookieCb
        );
      });
    });
    return promiseCallback.promise;
  }
  /**
   * Removes all cookies from the CookieJar.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @remarks
   * - This is a new backwards-compatible feature of tough-cookie version 2.5,
   *     so not all Stores will implement it efficiently. For Stores that do not
   *     implement `removeAllCookies`, the fallback is to call `removeCookie` after
   *     `getAllCookies`.
   *
   * - If `getAllCookies` fails or isn't implemented in the Store, an error is returned.
   *
   * - If one or more of the `removeCookie` calls fail, only the first error is returned.
   */
  removeAllCookiesSync() {
    this.callSync((callback) => {
      this.removeAllCookies(callback);
    });
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  static deserialize(strOrObj, store, callback) {
    if (typeof store === "function") {
      callback = store;
      store = void 0;
    }
    const promiseCallback = createPromiseCallback(callback);
    let serialized;
    if (typeof strOrObj === "string") {
      try {
        serialized = JSON.parse(strOrObj);
      } catch (e) {
        return promiseCallback.reject(e instanceof Error ? e : new Error());
      }
    } else {
      serialized = strOrObj;
    }
    const readSerializedProperty = (property) => {
      return serialized && typeof serialized === "object" && inOperator(property, serialized) ? serialized[property] : void 0;
    };
    const readSerializedBoolean = (property) => {
      const value = readSerializedProperty(property);
      return typeof value === "boolean" ? value : void 0;
    };
    const readSerializedString = (property) => {
      const value = readSerializedProperty(property);
      return typeof value === "string" ? value : void 0;
    };
    const jar = new _CookieJar(store, {
      rejectPublicSuffixes: readSerializedBoolean("rejectPublicSuffixes"),
      looseMode: readSerializedBoolean("enableLooseMode"),
      allowSpecialUseDomain: readSerializedBoolean("allowSpecialUseDomain"),
      prefixSecurity: getNormalizedPrefixSecurity(
        readSerializedString("prefixSecurity") ?? "silent"
      )
    });
    jar._importCookies(serialized, (err) => {
      if (err) {
        promiseCallback.callback(err);
        return;
      }
      promiseCallback.callback(null, jar);
    });
    return promiseCallback.promise;
  }
  /**
   * A new CookieJar is created and the serialized {@link Cookie} values are added to
   * the underlying store. Each {@link Cookie} is added via `store.putCookie(...)` in
   * the order in which they appear in the serialization.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
   *
   * @param strOrObj - A JSON string or object representing the deserialized cookies.
   * @param store - The underlying store to persist the deserialized cookies into.
   */
  static deserializeSync(strOrObj, store) {
    const serialized = typeof strOrObj === "string" ? JSON.parse(strOrObj) : strOrObj;
    const readSerializedProperty = (property) => {
      return serialized && typeof serialized === "object" && inOperator(property, serialized) ? serialized[property] : void 0;
    };
    const readSerializedBoolean = (property) => {
      const value = readSerializedProperty(property);
      return typeof value === "boolean" ? value : void 0;
    };
    const readSerializedString = (property) => {
      const value = readSerializedProperty(property);
      return typeof value === "string" ? value : void 0;
    };
    const jar = new _CookieJar(store, {
      rejectPublicSuffixes: readSerializedBoolean("rejectPublicSuffixes"),
      looseMode: readSerializedBoolean("enableLooseMode"),
      allowSpecialUseDomain: readSerializedBoolean("allowSpecialUseDomain"),
      prefixSecurity: getNormalizedPrefixSecurity(
        readSerializedString("prefixSecurity") ?? "silent"
      )
    });
    if (!jar.store.synchronous) {
      throw new Error(
        "CookieJar store is not synchronous; use async API instead."
      );
    }
    jar._importCookiesSync(serialized);
    return jar;
  }
  /**
   * Alias of {@link CookieJar.deserializeSync}.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
   *
   * @param jsonString - A JSON string or object representing the deserialized cookies.
   * @param store - The underlying store to persist the deserialized cookies into.
   */
  static fromJSON(jsonString, store) {
    return _CookieJar.deserializeSync(jsonString, store);
  }
};

// src/ehr-auth.js
var import_qrcode = __toESM(require_lib(), 1);
var import_fs = require("fs");
var import_path = require("path");
var import_os = require("os");
var readline = __toESM(require("readline"), 1);
var BASE_URL = "https://livekluster.ehr.ee";
var KEYCLOAK_TOKEN_URL = `${BASE_URL}/auth/realms/eehitus/protocol/openid-connect/token`;
var TOKEN_CACHE_PATH = (0, import_path.join)((0, import_os.homedir)(), "ehr-token.json");
var MID_SESSION_PATH = (0, import_path.join)((0, import_os.homedir)(), "ehr-mid-session.json");
var REDIRECT_URI = `${BASE_URL}/ui/ehr/v1/`;
function randomHex(n2 = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(n2))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function extractCsrf(html) {
  const m = html.match(/<meta name="_csrf" content="([^"]+)"/);
  if (!m) throw new Error("Could not extract CSRF token from TARA page");
  return m[1];
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
async function renderQr(url) {
  const qr = await import_qrcode.default.toString(url, { type: "terminal", small: true });
  process.stderr.write("\x1B[2J\x1B[H");
  process.stderr.write(qr + "\n");
  process.stderr.write("Scan with Smart-ID app\n");
}
function makeClient(jar) {
  return source_default.extend({
    cookieJar: jar ?? new CookieJar(),
    followRedirect: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "et-EE,et;q=0.9,en;q=0.8"
    }
  });
}
async function taraInit() {
  const jar = new CookieJar();
  const client = makeClient(jar);
  const authUrl = `${BASE_URL}/auth/realms/eehitus/protocol/openid-connect/auth?client_id=portal&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_mode=fragment&response_type=code&scope=openid&state=${randomHex(16)}&nonce=${randomHex(16)}`;
  const res = await client.get(authUrl);
  const csrf = extractCsrf(res.body);
  const taraBase = new URL(res.url).origin;
  return { client, jar, csrf, taraBase };
}
async function acceptAndGetTokens(client, taraBase, csrf) {
  let fragmentUrl = null;
  const hookClient = client.extend({
    hooks: {
      beforeRedirect: [(options, response) => {
        const loc = response.headers.location ?? "";
        if (loc.startsWith(REDIRECT_URI) && loc.includes("#")) {
          fragmentUrl = loc;
          throw Object.assign(new Error("FRAGMENT_CAPTURED"), { code: "FRAGMENT_CAPTURED" });
        }
        if (loc.includes("/auth/consent")) {
          options.method = "GET";
          delete options.body;
          delete options.form;
        }
      }]
    }
  });
  try {
    await hookClient.post(`${taraBase}/auth/accept`, { form: { _csrf: csrf } });
  } catch (e) {
    if (e.code !== "FRAGMENT_CAPTURED") throw e;
  }
  if (!fragmentUrl) throw new Error("No authorization code captured after auth");
  const code = new URLSearchParams(fragmentUrl.split("#")[1] ?? "").get("code");
  if (!code) throw new Error(`No code in fragment: ${fragmentUrl}`);
  const tokenRes = await source_default.post(KEYCLOAK_TOKEN_URL, {
    form: { grant_type: "authorization_code", code, client_id: "portal", redirect_uri: REDIRECT_URI },
    responseType: "json"
  });
  const d = tokenRes.body;
  const cache = {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: Date.now() + d.expires_in * 1e3 - 3e4
  };
  (0, import_fs.writeFileSync)(TOKEN_CACHE_PATH, JSON.stringify(cache));
  process.stderr.write("\nAuthentication successful. Token saved to ~/ehr-token.json\n");
}
async function loginMobileId() {
  const idCode = await prompt("Personal ID code (isikukood): ");
  const phone = await prompt("Phone number (without +372): ");
  process.stderr.write("Connecting to TARA...\n");
  const { client, jar, csrf: initCsrf, taraBase } = await taraInit();
  let csrf = initCsrf;
  const res = await client.post(`${taraBase}/auth/mid/init`, {
    form: { idCode, telephoneNumber: phone, _csrf: csrf }
  });
  const html = res.body;
  const codeMatch = html.match(/class="[^"]*control[^"]*"[^>]*>\s*(\d{4})\s*</) ?? html.match(/kontrollkood[^>]*>\s*(\d{4})/i) ?? html.match(/>\s*(\d{4})\s*</);
  const challengeCode = codeMatch?.[1];
  const newCsrf = html.match(/<meta name="_csrf" content="([^"]+)"/)?.[1];
  if (newCsrf) csrf = newCsrf;
  if (challengeCode) {
    process.stderr.write(`
Open Mobile-ID app and confirm code: ${challengeCode}
`);
  } else {
    process.stderr.write("\nCheck your phone for the Mobile-ID confirmation prompt.\n");
  }
  process.stderr.write("Waiting for confirmation (up to 120s)...\n");
  const deadline = Date.now() + 12e4;
  while (Date.now() < deadline) {
    await sleep(2e3);
    const poll = await client.get(`${taraBase}/auth/mid/poll`, { responseType: "json" });
    const { status, message } = poll.body;
    if (status === "ERROR" || status === "CANCELLED") throw new Error(`Mobile-ID ${status}: ${message ?? ""}`);
    if (status === "COMPLETED") break;
  }
  await acceptAndGetTokens(client, taraBase, csrf);
}
async function loginSmartId() {
  process.stderr.write("Connecting to TARA...\n");
  const { client, csrf: initCsrf, taraBase } = await taraInit();
  let csrf = initCsrf;
  const initRes = await client.post(`${taraBase}/auth/sid/qr-code/init`, { form: { _csrf: csrf } });
  const newCsrf = initRes.body.match(/<meta name="_csrf" content="([^"]+)"/)?.[1];
  if (newCsrf) csrf = newCsrf;
  const deadline = Date.now() + 12e4;
  while (Date.now() < deadline) {
    await sleep(1e3);
    const poll = await client.get(`${taraBase}/auth/sid/qr-code/poll`, { responseType: "json" });
    const { status, deviceLink, message } = poll.body;
    if (status === "ERROR" || status === "CANCELLED") throw new Error(`Smart-ID ${status}: ${message ?? ""}`);
    if (deviceLink) await renderQr(deviceLink);
    if (status === "COMPLETED") break;
  }
  await acceptAndGetTokens(client, taraBase, csrf);
}
function loadTokenCache() {
  try {
    return JSON.parse((0, import_fs.readFileSync)(TOKEN_CACHE_PATH, "utf-8"));
  } catch {
    return null;
  }
}
async function refreshToken(refreshTok) {
  const res = await fetch(KEYCLOAK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: "portal", refresh_token: refreshTok })
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const d = await res.json();
  const cache = {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: Date.now() + d.expires_in * 1e3 - 3e4
  };
  (0, import_fs.writeFileSync)(TOKEN_CACHE_PATH, JSON.stringify(cache));
  return cache.accessToken;
}
async function printToken() {
  const cache = loadTokenCache();
  if (cache && Date.now() < cache.expiresAt) {
    process.stdout.write(cache.accessToken + "\n");
    return;
  }
  if (cache?.refreshToken) {
    try {
      const token = await refreshToken(cache.refreshToken);
      process.stdout.write(token + "\n");
      return;
    } catch {
    }
  }
  process.stderr.write("Token expired. Run ehr-auth.js to re-authenticate.\n");
  process.exit(1);
}
async function main() {
  const arg = (process.argv[2] ?? "").toLowerCase();
  if (arg === "--print-token") {
    await printToken();
    return;
  }
  let method;
  if (arg === "-m" || arg === "--mobile-id") {
    method = "mobile";
  } else if (arg === "-s" || arg === "--smart-id") {
    method = "smart";
  } else {
    const answer = await prompt("Auth method \u2014 [m]obile-id or [s]mart-id qr: ");
    method = answer.toLowerCase().startsWith("s") ? "smart" : "mobile";
  }
  if (method === "smart") {
    await loginSmartId();
  } else {
    await loginMobileId();
  }
}
main().catch((e) => {
  process.stderr.write(e.message + "\n");
  process.exit(1);
});
/*! Bundled license information:

keyv/dist/index.js:
  (* v8 ignore next -- @preserve *)

cacheable-request/dist/index.js:
  (* c8 ignore next -- @preserve *)
  (* v8 ignore next -- @preserve *)

tough-cookie/dist/index.js:
  (*!
   * Copyright (c) 2015-2020, Salesforce.com, Inc.
   * All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice,
   * this list of conditions and the following disclaimer.
   *
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   * this list of conditions and the following disclaimer in the documentation
   * and/or other materials provided with the distribution.
   *
   * 3. Neither the name of Salesforce.com nor the names of its contributors may
   * be used to endorse or promote products derived from this software without
   * specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
   * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   * POSSIBILITY OF SUCH DAMAGE.
   *)
*/
