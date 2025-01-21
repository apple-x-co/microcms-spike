function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var retry$1 = {};

var retry_operation;
var hasRequiredRetry_operation;

function requireRetry_operation () {
	if (hasRequiredRetry_operation) return retry_operation;
	hasRequiredRetry_operation = 1;
	function RetryOperation(timeouts, options) {
	  // Compatibility for the old (timeouts, retryForever) signature
	  if (typeof options === 'boolean') {
	    options = { forever: options };
	  }

	  this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
	  this._timeouts = timeouts;
	  this._options = options || {};
	  this._maxRetryTime = options && options.maxRetryTime || Infinity;
	  this._fn = null;
	  this._errors = [];
	  this._attempts = 1;
	  this._operationTimeout = null;
	  this._operationTimeoutCb = null;
	  this._timeout = null;
	  this._operationStart = null;
	  this._timer = null;

	  if (this._options.forever) {
	    this._cachedTimeouts = this._timeouts.slice(0);
	  }
	}
	retry_operation = RetryOperation;

	RetryOperation.prototype.reset = function() {
	  this._attempts = 1;
	  this._timeouts = this._originalTimeouts.slice(0);
	};

	RetryOperation.prototype.stop = function() {
	  if (this._timeout) {
	    clearTimeout(this._timeout);
	  }
	  if (this._timer) {
	    clearTimeout(this._timer);
	  }

	  this._timeouts       = [];
	  this._cachedTimeouts = null;
	};

	RetryOperation.prototype.retry = function(err) {
	  if (this._timeout) {
	    clearTimeout(this._timeout);
	  }

	  if (!err) {
	    return false;
	  }
	  var currentTime = new Date().getTime();
	  if (err && currentTime - this._operationStart >= this._maxRetryTime) {
	    this._errors.push(err);
	    this._errors.unshift(new Error('RetryOperation timeout occurred'));
	    return false;
	  }

	  this._errors.push(err);

	  var timeout = this._timeouts.shift();
	  if (timeout === undefined) {
	    if (this._cachedTimeouts) {
	      // retry forever, only keep last error
	      this._errors.splice(0, this._errors.length - 1);
	      timeout = this._cachedTimeouts.slice(-1);
	    } else {
	      return false;
	    }
	  }

	  var self = this;
	  this._timer = setTimeout(function() {
	    self._attempts++;

	    if (self._operationTimeoutCb) {
	      self._timeout = setTimeout(function() {
	        self._operationTimeoutCb(self._attempts);
	      }, self._operationTimeout);

	      if (self._options.unref) {
	          self._timeout.unref();
	      }
	    }

	    self._fn(self._attempts);
	  }, timeout);

	  if (this._options.unref) {
	      this._timer.unref();
	  }

	  return true;
	};

	RetryOperation.prototype.attempt = function(fn, timeoutOps) {
	  this._fn = fn;

	  if (timeoutOps) {
	    if (timeoutOps.timeout) {
	      this._operationTimeout = timeoutOps.timeout;
	    }
	    if (timeoutOps.cb) {
	      this._operationTimeoutCb = timeoutOps.cb;
	    }
	  }

	  var self = this;
	  if (this._operationTimeoutCb) {
	    this._timeout = setTimeout(function() {
	      self._operationTimeoutCb();
	    }, self._operationTimeout);
	  }

	  this._operationStart = new Date().getTime();

	  this._fn(this._attempts);
	};

	RetryOperation.prototype.try = function(fn) {
	  console.log('Using RetryOperation.try() is deprecated');
	  this.attempt(fn);
	};

	RetryOperation.prototype.start = function(fn) {
	  console.log('Using RetryOperation.start() is deprecated');
	  this.attempt(fn);
	};

	RetryOperation.prototype.start = RetryOperation.prototype.try;

	RetryOperation.prototype.errors = function() {
	  return this._errors;
	};

	RetryOperation.prototype.attempts = function() {
	  return this._attempts;
	};

	RetryOperation.prototype.mainError = function() {
	  if (this._errors.length === 0) {
	    return null;
	  }

	  var counts = {};
	  var mainError = null;
	  var mainErrorCount = 0;

	  for (var i = 0; i < this._errors.length; i++) {
	    var error = this._errors[i];
	    var message = error.message;
	    var count = (counts[message] || 0) + 1;

	    counts[message] = count;

	    if (count >= mainErrorCount) {
	      mainError = error;
	      mainErrorCount = count;
	    }
	  }

	  return mainError;
	};
	return retry_operation;
}

var hasRequiredRetry$1;

function requireRetry$1 () {
	if (hasRequiredRetry$1) return retry$1;
	hasRequiredRetry$1 = 1;
	(function (exports) {
		var RetryOperation = requireRetry_operation();

		exports.operation = function(options) {
		  var timeouts = exports.timeouts(options);
		  return new RetryOperation(timeouts, {
		      forever: options && (options.forever || options.retries === Infinity),
		      unref: options && options.unref,
		      maxRetryTime: options && options.maxRetryTime
		  });
		};

		exports.timeouts = function(options) {
		  if (options instanceof Array) {
		    return [].concat(options);
		  }

		  var opts = {
		    retries: 10,
		    factor: 2,
		    minTimeout: 1 * 1000,
		    maxTimeout: Infinity,
		    randomize: false
		  };
		  for (var key in options) {
		    opts[key] = options[key];
		  }

		  if (opts.minTimeout > opts.maxTimeout) {
		    throw new Error('minTimeout is greater than maxTimeout');
		  }

		  var timeouts = [];
		  for (var i = 0; i < opts.retries; i++) {
		    timeouts.push(this.createTimeout(i, opts));
		  }

		  if (options && options.forever && !timeouts.length) {
		    timeouts.push(this.createTimeout(i, opts));
		  }

		  // sort the array numerically ascending
		  timeouts.sort(function(a,b) {
		    return a - b;
		  });

		  return timeouts;
		};

		exports.createTimeout = function(attempt, opts) {
		  var random = (opts.randomize)
		    ? (Math.random() + 1)
		    : 1;

		  var timeout = Math.round(random * Math.max(opts.minTimeout, 1) * Math.pow(opts.factor, attempt));
		  timeout = Math.min(timeout, opts.maxTimeout);

		  return timeout;
		};

		exports.wrap = function(obj, options, methods) {
		  if (options instanceof Array) {
		    methods = options;
		    options = null;
		  }

		  if (!methods) {
		    methods = [];
		    for (var key in obj) {
		      if (typeof obj[key] === 'function') {
		        methods.push(key);
		      }
		    }
		  }

		  for (var i = 0; i < methods.length; i++) {
		    var method   = methods[i];
		    var original = obj[method];

		    obj[method] = function retryWrapper(original) {
		      var op       = exports.operation(options);
		      var args     = Array.prototype.slice.call(arguments, 1);
		      var callback = args.pop();

		      args.push(function(err) {
		        if (op.retry(err)) {
		          return;
		        }
		        if (err) {
		          arguments[0] = op.mainError();
		        }
		        callback.apply(this, arguments);
		      });

		      op.attempt(function() {
		        original.apply(obj, args);
		      });
		    }.bind(obj, original);
		    obj[method].options = options;
		  }
		}; 
	} (retry$1));
	return retry$1;
}

var retry;
var hasRequiredRetry;

function requireRetry () {
	if (hasRequiredRetry) return retry;
	hasRequiredRetry = 1;
	retry = requireRetry$1();
	return retry;
}

var lib;
var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib;
	hasRequiredLib = 1;
	// Packages
	var retrier = requireRetry();

	function retry(fn, opts) {
	  function run(resolve, reject) {
	    var options = opts || {};
	    var op;

	    // Default `randomize` to true
	    if (!('randomize' in options)) {
	      options.randomize = true;
	    }

	    op = retrier.operation(options);

	    // We allow the user to abort retrying
	    // this makes sense in the cases where
	    // knowledge is obtained that retrying
	    // would be futile (e.g.: auth errors)

	    function bail(err) {
	      reject(err || new Error('Aborted'));
	    }

	    function onError(err, num) {
	      if (err.bail) {
	        bail(err);
	        return;
	      }

	      if (!op.retry(err)) {
	        reject(op.mainError());
	      } else if (options.onRetry) {
	        options.onRetry(err, num);
	      }
	    }

	    function runAttempt(num) {
	      var val;

	      try {
	        val = fn(bail, num);
	      } catch (err) {
	        onError(err, num);
	        return;
	      }

	      Promise.resolve(val)
	        .then(resolve)
	        .catch(function catchIt(err) {
	          onError(err, num);
	        });
	    }

	    op.attempt(runAttempt);
	  }

	  return new Promise(run);
	}

	lib = retry;
	return lib;
}

var libExports = requireLib();
var b = /*@__PURE__*/getDefaultExportFromCjs(libExports);

function e(e,t){if(t==null||t>e.length)t=e.length;for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}function t(e){if(Array.isArray(e))return e}function r(t){if(Array.isArray(t))return e(t)}function n(e,t,r,n,i,o,u){try{var a=e[o](u);var s=a.value;}catch(e){r(e);return}if(a.done){t(s);}else {Promise.resolve(s).then(n,i);}}function i(e){return function(){var t=this,r=arguments;return new Promise(function(i,o){var u=e.apply(t,r);function a(e){n(u,i,o,a,s,"next",e);}function s(e){n(u,i,o,a,s,"throw",e);}a(undefined);})}}function o(e,t,r){if(t in e){Object.defineProperty(e,t,{value:r,enumerable:true,configurable:true,writable:true});}else {e[t]=r;}return e}function a(e){if(typeof Symbol!=="undefined"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function s(e,t){var r=e==null?null:typeof Symbol!=="undefined"&&e[Symbol.iterator]||e["@@iterator"];if(r==null)return;var n=[];var i=true;var o=false;var u,a;try{for(r=r.call(e);!(i=(u=r.next()).done);i=true){n.push(u.value);if(t&&n.length===t)break}}catch(e){o=true;a=e;}finally{try{if(!i&&r["return"]!=null)r["return"]();}finally{if(o)throw a}}return n}function c(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function l(){throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function f(e){for(var t=1;t<arguments.length;t++){var r=arguments[t]!=null?arguments[t]:{};var n=Object.keys(r);if(typeof Object.getOwnPropertySymbols==="function"){n=n.concat(Object.getOwnPropertySymbols(r).filter(function(e){return Object.getOwnPropertyDescriptor(r,e).enumerable}));}n.forEach(function(t){o(e,t,r[t]);});}return e}function d(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);r.push.apply(r,n);}return r}function p(e,t){t=t!=null?t:{};if(Object.getOwnPropertyDescriptors){Object.defineProperties(e,Object.getOwnPropertyDescriptors(t));}else {d(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r));});}return e}function h(e,r){return t(e)||s(e,r)||y(e,r)||c()}function v(e){return r(e)||a(e)||y(e)||l()}function y(t,r){if(!t)return;if(typeof t==="string")return e(t,r);var n=Object.prototype.toString.call(t).slice(8,-1);if(n==="Object"&&t.constructor)n=t.constructor.name;if(n==="Map"||n==="Set")return Array.from(n);if(n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return e(t,r)}function m(e,t){var r,n,i,o,u={label:0,sent:function(){if(i[0]&1)throw i[1];return i[1]},trys:[],ops:[]};return o={next:a(0),"throw":a(1),"return":a(2)},typeof Symbol==="function"&&(o[Symbol.iterator]=function(){return this}),o;function a(e){return function(t){return s([e,t])}}function s(o){if(r)throw new TypeError("Generator is already executing.");while(u)try{if(r=1,n&&(i=o[0]&2?n["return"]:o[0]?n["throw"]||((i=n["return"])&&i.call(n),0):n.next)&&!(i=i.call(n,o[1])).done)return i;if(n=0,i)o=[o[0]&2,i.value];switch(o[0]){case 0:case 1:i=o;break;case 4:u.label++;return {value:o[1],done:false};case 5:u.label++;n=o[1];o=[0];continue;case 7:o=u.ops.pop();u.trys.pop();continue;default:if(!(i=u.trys,i=i.length>0&&i[i.length-1])&&(o[0]===6||o[0]===2)){u=0;continue}if(o[0]===3&&(!i||o[1]>i[0]&&o[1]<i[3])){u.label=o[1];break}if(o[0]===6&&u.label<i[1]){u.label=i[1];i=o;break}if(i&&u.label<i[2]){u.label=i[2];u.ops.push(o);break}if(i[2])u.ops.pop();u.trys.pop();continue}o=t.call(e,u);}catch(e){o=[6,e];n=0;}finally{r=i=0;}if(o[0]&5)throw o[1];return {value:o[0]?o[1]:undefined,done:true}}}var w=function(e){return function(){var t=i(function(t,r){var n;return m(this,function(i){n=new Headers(r===null||r===undefined?undefined:r.headers);return [2,(n.has("X-MICROCMS-API-KEY")||n.set("X-MICROCMS-API-KEY",e),fetch(t,p(f({},r),{headers:n})))]})});return function(e,r){return t.apply(this,arguments)}}()};var g="microcms.io",I="v1";var j=function(e){return e!==null&&typeof e=="object"},E=function(e){return typeof e=="string"};var P=function(e){if(!j(e))throw new Error("queries is not object");return new URLSearchParams(Object.entries(e).reduce(function(e,t){var r=h(t,2),n=r[0],i=r[1];return i!==undefined&&(e[n]=String(i)),e},{})).toString()};var O=function(e){var t=e.serviceDomain,r=e.apiKey;if(!r)throw new Error("parameter is required (check serviceDomain and apiKey)");if(!E(t)||!E(r))throw new Error("parameter is not string");var o="https://".concat(t,".").concat(g,"/api/").concat(I),u=function(){var e=i(function(e){var t,u,a,s,c,l,d,h,v;return m(this,function(y){switch(y.label){case 0:t=e.endpoint,u=e.contentId,a=e.queries,s=a===undefined?{}:a,c=e.requestInit;l=w(r),d=P(s),h="".concat(o,"/").concat(t).concat(u?"/".concat(u):"").concat(d?"?".concat(d):""),v=function(){var e=i(function(e){var t,r;return m(this,function(i){switch(i.label){case 0:i.trys.push([0,2,,3]);return [4,e.json()];case 1:t=i.sent(),r=t.message;return [2,r!==null&&r!==undefined?r:null];case 2:i.sent();return [2,null];case 3:return [2]}})});return function t(t){return e.apply(this,arguments)}}();return [4,b(function(){var e=i(function(e){var t,r,n,i,o,u,a;return m(this,function(s){switch(s.label){case 0:s.trys.push([0,6,,7]);return [4,l(h,p(f({},c),{method:(r=c===null||c===undefined?undefined:c.method)!==null&&r!==undefined?r:"GET"}))];case 1:if(!(t=s.sent(),t.status!==429&&t.status>=400&&t.status<500))return [3,3];return [4,v(t)];case 2:n=s.sent();return [2,e(new Error("fetch API response status: ".concat(t.status).concat(n?"\n  message is `".concat(n,"`"):"")))];case 3:if(!!t.ok)return [3,5];return [4,v(t)];case 4:i=s.sent();return [2,Promise.reject(new Error("fetch API response status: ".concat(t.status).concat(i?"\n  message is `".concat(i,"`"):"")))];case 5:return [2,(c===null||c===undefined?undefined:c.method)==="DELETE"?undefined:t.json()];case 6:o=s.sent();if(o.data)throw o.data;if((u=o.response)===null||u===undefined?undefined:u.data)throw o.response.data;return [2,Promise.reject(new Error("Network Error.\n  Details: ".concat((a=o.message)!==null&&a!==undefined?a:"")))];case 7:return [2]}})});return function(t){return e.apply(this,arguments)}}(),{retries:2,onRetry:function(e,t){console.log(e),console.log("Waiting for retry (".concat(t,"/",2,")"));},minTimeout:5e3})];case 1:return [2,y.sent()]}})});return function t(t){return e.apply(this,arguments)}}();return {get:function(){var e=i(function(e){var t,r,n,i,o,a;return m(this,function(s){switch(s.label){case 0:t=e.endpoint,r=e.contentId,n=e.queries,i=n===undefined?{}:n,o=e.customRequestInit;if(!t)return [3,2];return [4,u({endpoint:t,contentId:r,queries:i,requestInit:o})];case 1:a=s.sent();return [3,3];case 2:a=Promise.reject(new Error("endpoint is required"));s.label=3;case 3:return [2,a]}})});return function(t){return e.apply(this,arguments)}}(),getList:function(){var e=i(function(e){var t,r,n,i,o;return m(this,function(a){switch(a.label){case 0:t=e.endpoint,r=e.queries,n=r===undefined?{}:r,i=e.customRequestInit;if(!t)return [3,2];return [4,u({endpoint:t,queries:n,requestInit:i})];case 1:o=a.sent();return [3,3];case 2:o=Promise.reject(new Error("endpoint is required"));a.label=3;case 3:return [2,o]}})});return function(t){return e.apply(this,arguments)}}(),getListDetail:function(){var e=i(function(e){var t,r,n,i,o,a;return m(this,function(s){switch(s.label){case 0:t=e.endpoint,r=e.contentId,n=e.queries,i=n===undefined?{}:n,o=e.customRequestInit;if(!t)return [3,2];return [4,u({endpoint:t,contentId:r,queries:i,requestInit:o})];case 1:a=s.sent();return [3,3];case 2:a=Promise.reject(new Error("endpoint is required"));s.label=3;case 3:return [2,a]}})});return function(t){return e.apply(this,arguments)}}(),getObject:function(){var e=i(function(e){var t,r,n,i,o;return m(this,function(a){switch(a.label){case 0:t=e.endpoint,r=e.queries,n=r===undefined?{}:r,i=e.customRequestInit;if(!t)return [3,2];return [4,u({endpoint:t,queries:n,requestInit:i})];case 1:o=a.sent();return [3,3];case 2:o=Promise.reject(new Error("endpoint is required"));a.label=3;case 3:return [2,o]}})});return function(t){return e.apply(this,arguments)}}(),getAllContentIds:function(){var e=i(function(e){var t,r,n,i,o,a,s,c,l,d,h,y,b,w,g,q,I;return m(this,function(m){switch(m.label){case 0:t=e.endpoint,r=e.alternateField,n=e.draftKey,i=e.filters,o=e.orders,a=e.customRequestInit;s={draftKey:n,filters:i,orders:o,limit:100,fields:r!==null&&r!==undefined?r:"id",depth:0};return [4,u({endpoint:t,queries:p(f({},s),{limit:0}),requestInit:a})];case 1:c=m.sent(),l=c.totalCount,d=[],h=0,y=function(e){return new Promise(function(t){return setTimeout(t,e)})},b=function(e){return e.every(function(e){return typeof e=="string"})};m.label=2;case 2:if(!(d.length<l))return [3,7];return [4,u({endpoint:t,queries:p(f({},s),{offset:h}),requestInit:a})];case 3:w=m.sent(),g=w.contents,q=g.map(function(e){return e[r!==null&&r!==undefined?r:"id"]});if(!b(q))throw new Error("The value of the field specified by `alternateField` is not a string.");d=v(d).concat(v(q)),h+=100;I=d.length<l;if(!I)return [3,5];return [4,y(1e3)];case 4:I=m.sent();m.label=5;case 5:m.label=6;case 6:return [3,2];case 7:return [2,d]}})});return function(t){return e.apply(this,arguments)}}(),getAllContents:function(){var e=i(function(e){var t,r,n,i,o,a,s,c,l,d,h,v;return m(this,function(y){switch(y.label){case 0:t=e.endpoint,r=e.queries,n=r===undefined?{}:r,i=e.customRequestInit;return [4,u({endpoint:t,queries:p(f({},n),{limit:0}),requestInit:i})];case 1:o=y.sent(),a=o.totalCount,s=[],c=0,l=function(e){return new Promise(function(t){return setTimeout(t,e)})};y.label=2;case 2:if(!(s.length<a))return [3,7];return [4,u({endpoint:t,queries:p(f({},n),{limit:100,offset:c}),requestInit:i})];case 3:d=y.sent(),h=d.contents;s=s.concat(h),c+=100;v=s.length<a;if(!v)return [3,5];return [4,l(1e3)];case 4:v=y.sent();y.label=5;case 5:y.label=6;case 6:return [3,2];case 7:return [2,s]}})});return function(t){return e.apply(this,arguments)}}(),create:function(){var e=i(function(e){var t,r,n,i,o,a,s,c;return m(this,function(l){t=e.endpoint,r=e.contentId,n=e.content,i=e.isDraft,o=i===undefined?false:i,a=e.customRequestInit;if(!t)return [2,Promise.reject(new Error("endpoint is required"))];s=o?{status:"draft"}:{},c=p(f({},a),{method:r?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});return [2,u({endpoint:t,contentId:r,queries:s,requestInit:c})]})});return function(t){return e.apply(this,arguments)}}(),update:function(){var e=i(function(e){var t,r,n,i,o;return m(this,function(a){t=e.endpoint,r=e.contentId,n=e.content,i=e.customRequestInit;if(!t)return [2,Promise.reject(new Error("endpoint is required"))];o=p(f({},i),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});return [2,u({endpoint:t,contentId:r,requestInit:o})]})});return function(t){return e.apply(this,arguments)}}(),delete:function(){var e=i(function(e){var t,r,n,i;return m(this,function(o){switch(o.label){case 0:t=e.endpoint,r=e.contentId,n=e.customRequestInit;if(!t)return [2,Promise.reject(new Error("endpoint is required"))];if(!r)return [2,Promise.reject(new Error("contentId is required"))];i=p(f({},n),{method:"DELETE",headers:{},body:undefined});return [4,u({endpoint:t,contentId:r,requestInit:i})];case 1:o.sent();return [2]}})});return function(t){return e.apply(this,arguments)}}()}};

const client = O({
  serviceDomain: 'xxxxx', // NOTE: YOUR_DOMAIN is the XXXX part of XXXX.microcms.io
  apiKey: 'dH9tnKbLqzRZwuU7o503lCd6oPeBVlyeThn6', // NOTE: https://xxxxx.microcms.io/api-keys
  retry: true, // Retry attempts up to a maximum of two times.
});

// https://www.npmjs.com/package/microcms-js-sdk

client.getList({
  endpoint: 'news',
}).then((res) => {
  console.log('getList successfully.');
  console.log(res);
}).catch((err) => {
  console.log('getList failed');
  console.error(err);
});

client.getListDetail({
  endpoint: 'news',
  contentId: 'ot5ejzyxbc',
}).then((res) => {
  console.log('getListDetail successfully.');
  console.log(res);
}).catch((err) => {
  console.log('getListDetail failed');
  console.error(err);
});

client.getAllContentIds({
  endpoint: 'news',
}).then((res) => {
  console.log('getAllContentIds successfully.');
  console.log(res);
}).catch((err) => {
  console.log('getAllContentIds failed');
  console.error(err);
});

client.getAllContents({
  endpoint: 'news',
}).then((res) => {
  console.log('getAllContents successfully.');
  console.log(res);
}).catch((err) => {
  console.log('getAllContents failed');
  console.error(err);
});
