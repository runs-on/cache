exports.id = 445;
exports.ids = [445];
exports.modules = {

/***/ 26707:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var utilEndpoints = __webpack_require__(79674);
var urlParser = __webpack_require__(14494);

const isVirtualHostableS3Bucket = (value, allowSubDomains = false) => {
    if (allowSubDomains) {
        for (const label of value.split(".")) {
            if (!isVirtualHostableS3Bucket(label)) {
                return false;
            }
        }
        return true;
    }
    if (!utilEndpoints.isValidHostLabel(value)) {
        return false;
    }
    if (value.length < 3 || value.length > 63) {
        return false;
    }
    if (value !== value.toLowerCase()) {
        return false;
    }
    if (utilEndpoints.isIpAddress(value)) {
        return false;
    }
    return true;
};

const ARN_DELIMITER = ":";
const RESOURCE_DELIMITER = "/";
const parseArn = (value) => {
    const segments = value.split(ARN_DELIMITER);
    if (segments.length < 6)
        return null;
    const [arn, partition, service, region, accountId, ...resourcePath] = segments;
    if (arn !== "arn" || partition === "" || service === "" || resourcePath.join(ARN_DELIMITER) === "")
        return null;
    const resourceId = resourcePath.map((resource) => resource.split(RESOURCE_DELIMITER)).flat();
    return {
        partition,
        service,
        region,
        accountId,
        resourceId,
    };
};

var partitions = [
	{
		id: "aws",
		outputs: {
			dnsSuffix: "amazonaws.com",
			dualStackDnsSuffix: "api.aws",
			implicitGlobalRegion: "us-east-1",
			name: "aws",
			supportsDualStack: true,
			supportsFIPS: true
		},
		regionRegex: "^(us|eu|ap|sa|ca|me|af|il|mx)\\-\\w+\\-\\d+$",
		regions: {
			"af-south-1": {
				description: "Africa (Cape Town)"
			},
			"ap-east-1": {
				description: "Asia Pacific (Hong Kong)"
			},
			"ap-east-2": {
				description: "Asia Pacific (Taipei)"
			},
			"ap-northeast-1": {
				description: "Asia Pacific (Tokyo)"
			},
			"ap-northeast-2": {
				description: "Asia Pacific (Seoul)"
			},
			"ap-northeast-3": {
				description: "Asia Pacific (Osaka)"
			},
			"ap-south-1": {
				description: "Asia Pacific (Mumbai)"
			},
			"ap-south-2": {
				description: "Asia Pacific (Hyderabad)"
			},
			"ap-southeast-1": {
				description: "Asia Pacific (Singapore)"
			},
			"ap-southeast-2": {
				description: "Asia Pacific (Sydney)"
			},
			"ap-southeast-3": {
				description: "Asia Pacific (Jakarta)"
			},
			"ap-southeast-4": {
				description: "Asia Pacific (Melbourne)"
			},
			"ap-southeast-5": {
				description: "Asia Pacific (Malaysia)"
			},
			"ap-southeast-6": {
				description: "Asia Pacific (New Zealand)"
			},
			"ap-southeast-7": {
				description: "Asia Pacific (Thailand)"
			},
			"aws-global": {
				description: "aws global region"
			},
			"ca-central-1": {
				description: "Canada (Central)"
			},
			"ca-west-1": {
				description: "Canada West (Calgary)"
			},
			"eu-central-1": {
				description: "Europe (Frankfurt)"
			},
			"eu-central-2": {
				description: "Europe (Zurich)"
			},
			"eu-north-1": {
				description: "Europe (Stockholm)"
			},
			"eu-south-1": {
				description: "Europe (Milan)"
			},
			"eu-south-2": {
				description: "Europe (Spain)"
			},
			"eu-west-1": {
				description: "Europe (Ireland)"
			},
			"eu-west-2": {
				description: "Europe (London)"
			},
			"eu-west-3": {
				description: "Europe (Paris)"
			},
			"il-central-1": {
				description: "Israel (Tel Aviv)"
			},
			"me-central-1": {
				description: "Middle East (UAE)"
			},
			"me-south-1": {
				description: "Middle East (Bahrain)"
			},
			"mx-central-1": {
				description: "Mexico (Central)"
			},
			"sa-east-1": {
				description: "South America (Sao Paulo)"
			},
			"us-east-1": {
				description: "US East (N. Virginia)"
			},
			"us-east-2": {
				description: "US East (Ohio)"
			},
			"us-west-1": {
				description: "US West (N. California)"
			},
			"us-west-2": {
				description: "US West (Oregon)"
			}
		}
	},
	{
		id: "aws-cn",
		outputs: {
			dnsSuffix: "amazonaws.com.cn",
			dualStackDnsSuffix: "api.amazonwebservices.com.cn",
			implicitGlobalRegion: "cn-northwest-1",
			name: "aws-cn",
			supportsDualStack: true,
			supportsFIPS: true
		},
		regionRegex: "^cn\\-\\w+\\-\\d+$",
		regions: {
			"aws-cn-global": {
				description: "aws-cn global region"
			},
			"cn-north-1": {
				description: "China (Beijing)"
			},
			"cn-northwest-1": {
				description: "China (Ningxia)"
			}
		}
	},
	{
		id: "aws-eusc",
		outputs: {
			dnsSuffix: "amazonaws.eu",
			dualStackDnsSuffix: "api.amazonwebservices.eu",
			implicitGlobalRegion: "eusc-de-east-1",
			name: "aws-eusc",
			supportsDualStack: true,
			supportsFIPS: true
		},
		regionRegex: "^eusc\\-(de)\\-\\w+\\-\\d+$",
		regions: {
			"eusc-de-east-1": {
				description: "AWS European Sovereign Cloud (Germany)"
			}
		}
	},
	{
		id: "aws-iso",
		outputs: {
			dnsSuffix: "c2s.ic.gov",
			dualStackDnsSuffix: "api.aws.ic.gov",
			implicitGlobalRegion: "us-iso-east-1",
			name: "aws-iso",
			supportsDualStack: true,
			supportsFIPS: true
		},
		regionRegex: "^us\\-iso\\-\\w+\\-\\d+$",
		regions: {
			"aws-iso-global": {
				description: "aws-iso global region"
			},
			"us-iso-east-1": {
				description: "US ISO East"
			},
			"us-iso-west-1": {
				description: "US ISO WEST"
			}
		}
	},
	{
		id: "aws-iso-b",
		outputs: {
			dnsSuffix: "sc2s.sgov.gov",
			dualStackDnsSuffix: "api.aws.scloud",
			implicitGlobalRegion: "us-isob-east-1",
			name: "aws-iso-b",
			supportsDualStack: true,
			supportsFIPS: true
		},
		regionRegex: "^us\\-isob\\-\\w+\\-\\d+$",
		regions: {
			"aws-iso-b-global": {
				description: "aws-iso-b global region"
			},
			"us-isob-east-1": {
				description: "US ISOB East (Ohio)"
			},
			"us-isob-west-1": {
				description: "US ISOB West"
			}
		}
	},
	{
		id: "aws-iso-e",
		outputs: {
			dnsSuffix: "cloud.adc-e.uk",
			dualStackDnsSuffix: "api.cloud-aws.adc-e.uk",
			implicitGlobalRegion: "eu-isoe-west-1",
			name: "aws-iso-e",
			supportsDualStack: true,
			supportsFIPS: true
		},
		regionRegex: "^eu\\-isoe\\-\\w+\\-\\d+$",
		regions: {
			"aws-iso-e-global": {
				description: "aws-iso-e global region"
			},
			"eu-isoe-west-1": {
				description: "EU ISOE West"
			}
		}
	},
	{
		id: "aws-iso-f",
		outputs: {
			dnsSuffix: "csp.hci.ic.gov",
			dualStackDnsSuffix: "api.aws.hci.ic.gov",
			implicitGlobalRegion: "us-isof-south-1",
			name: "aws-iso-f",
			supportsDualStack: true,
			supportsFIPS: true
		},
		regionRegex: "^us\\-isof\\-\\w+\\-\\d+$",
		regions: {
			"aws-iso-f-global": {
				description: "aws-iso-f global region"
			},
			"us-isof-east-1": {
				description: "US ISOF EAST"
			},
			"us-isof-south-1": {
				description: "US ISOF SOUTH"
			}
		}
	},
	{
		id: "aws-us-gov",
		outputs: {
			dnsSuffix: "amazonaws.com",
			dualStackDnsSuffix: "api.aws",
			implicitGlobalRegion: "us-gov-west-1",
			name: "aws-us-gov",
			supportsDualStack: true,
			supportsFIPS: true
		},
		regionRegex: "^us\\-gov\\-\\w+\\-\\d+$",
		regions: {
			"aws-us-gov-global": {
				description: "aws-us-gov global region"
			},
			"us-gov-east-1": {
				description: "AWS GovCloud (US-East)"
			},
			"us-gov-west-1": {
				description: "AWS GovCloud (US-West)"
			}
		}
	}
];
var version = "1.1";
var partitionsInfo = {
	partitions: partitions,
	version: version
};

let selectedPartitionsInfo = partitionsInfo;
let selectedUserAgentPrefix = "";
const partition = (value) => {
    const { partitions } = selectedPartitionsInfo;
    for (const partition of partitions) {
        const { regions, outputs } = partition;
        for (const [region, regionData] of Object.entries(regions)) {
            if (region === value) {
                return {
                    ...outputs,
                    ...regionData,
                };
            }
        }
    }
    for (const partition of partitions) {
        const { regionRegex, outputs } = partition;
        if (new RegExp(regionRegex).test(value)) {
            return {
                ...outputs,
            };
        }
    }
    const DEFAULT_PARTITION = partitions.find((partition) => partition.id === "aws");
    if (!DEFAULT_PARTITION) {
        throw new Error("Provided region was not found in the partition array or regex," +
            " and default partition with id 'aws' doesn't exist.");
    }
    return {
        ...DEFAULT_PARTITION.outputs,
    };
};
const setPartitionInfo = (partitionsInfo, userAgentPrefix = "") => {
    selectedPartitionsInfo = partitionsInfo;
    selectedUserAgentPrefix = userAgentPrefix;
};
const useDefaultPartitionInfo = () => {
    setPartitionInfo(partitionsInfo, "");
};
const getUserAgentPrefix = () => selectedUserAgentPrefix;

const awsEndpointFunctions = {
    isVirtualHostableS3Bucket: isVirtualHostableS3Bucket,
    parseArn: parseArn,
    partition: partition,
};
utilEndpoints.customEndpointFunctions.aws = awsEndpointFunctions;

const resolveDefaultAwsRegionalEndpointsConfig = (input) => {
    if (typeof input.endpointProvider !== "function") {
        throw new Error("@aws-sdk/util-endpoint - endpointProvider and endpoint missing in config for this client.");
    }
    const { endpoint } = input;
    if (endpoint === undefined) {
        input.endpoint = async () => {
            return toEndpointV1(input.endpointProvider({
                Region: typeof input.region === "function" ? await input.region() : input.region,
                UseDualStack: typeof input.useDualstackEndpoint === "function"
                    ? await input.useDualstackEndpoint()
                    : input.useDualstackEndpoint,
                UseFIPS: typeof input.useFipsEndpoint === "function" ? await input.useFipsEndpoint() : input.useFipsEndpoint,
                Endpoint: undefined,
            }, { logger: input.logger }));
        };
    }
    return input;
};
const toEndpointV1 = (endpoint) => urlParser.parseUrl(endpoint.url);

Object.defineProperty(exports, "EndpointError", ({
    enumerable: true,
    get: function () { return utilEndpoints.EndpointError; }
}));
Object.defineProperty(exports, "isIpAddress", ({
    enumerable: true,
    get: function () { return utilEndpoints.isIpAddress; }
}));
Object.defineProperty(exports, "resolveEndpoint", ({
    enumerable: true,
    get: function () { return utilEndpoints.resolveEndpoint; }
}));
exports.awsEndpointFunctions = awsEndpointFunctions;
exports.getUserAgentPrefix = getUserAgentPrefix;
exports.partition = partition;
exports.resolveDefaultAwsRegionalEndpointsConfig = resolveDefaultAwsRegionalEndpointsConfig;
exports.setPartitionInfo = setPartitionInfo;
exports.toEndpointV1 = toEndpointV1;
exports.useDefaultPartitionInfo = useDefaultPartitionInfo;


/***/ }),

/***/ 14509:
/***/ ((module) => {

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global global, define, Symbol, Reflect, Promise, SuppressedError, Iterator */
var __extends;
var __assign;
var __rest;
var __decorate;
var __param;
var __esDecorate;
var __runInitializers;
var __propKey;
var __setFunctionName;
var __metadata;
var __awaiter;
var __generator;
var __exportStar;
var __values;
var __read;
var __spread;
var __spreadArrays;
var __spreadArray;
var __await;
var __asyncGenerator;
var __asyncDelegator;
var __asyncValues;
var __makeTemplateObject;
var __importStar;
var __importDefault;
var __classPrivateFieldGet;
var __classPrivateFieldSet;
var __classPrivateFieldIn;
var __createBinding;
var __addDisposableResource;
var __disposeResources;
var __rewriteRelativeImportExtension;
(function (factory) {
    var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
    if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function (exports) { factory(createExporter(root, createExporter(exports))); });
    }
    else if ( true && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
    }
    else {
        factory(createExporter(root));
    }
    function createExporter(exports, previous) {
        if (exports !== root) {
            if (typeof Object.create === "function") {
                Object.defineProperty(exports, "__esModule", { value: true });
            }
            else {
                exports.__esModule = true;
            }
        }
        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
    }
})
(function (exporter) {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };

    __extends = function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    __rest = function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };

    __decorate = function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };

    __param = function (paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    };

    __esDecorate = function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
        function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
        var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
        var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
        var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
        var _, done = false;
        for (var i = decorators.length - 1; i >= 0; i--) {
            var context = {};
            for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
            for (var p in contextIn.access) context.access[p] = contextIn.access[p];
            context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
            var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
            if (kind === "accessor") {
                if (result === void 0) continue;
                if (result === null || typeof result !== "object") throw new TypeError("Object expected");
                if (_ = accept(result.get)) descriptor.get = _;
                if (_ = accept(result.set)) descriptor.set = _;
                if (_ = accept(result.init)) initializers.unshift(_);
            }
            else if (_ = accept(result)) {
                if (kind === "field") initializers.unshift(_);
                else descriptor[key] = _;
            }
        }
        if (target) Object.defineProperty(target, contextIn.name, descriptor);
        done = true;
    };

    __runInitializers = function (thisArg, initializers, value) {
        var useValue = arguments.length > 2;
        for (var i = 0; i < initializers.length; i++) {
            value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
        }
        return useValue ? value : void 0;
    };

    __propKey = function (x) {
        return typeof x === "symbol" ? x : "".concat(x);
    };

    __setFunctionName = function (f, name, prefix) {
        if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
        return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
    };

    __metadata = function (metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    };

    __awaiter = function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    __generator = function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
        return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (g && (g = 0, op[0] && (_ = 0)), _) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };

    __exportStar = function(m, o) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
    };

    __createBinding = Object.create ? (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
            desc = { enumerable: true, get: function() { return m[k]; } };
        }
        Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });

    __values = function (o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };

    __read = function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };

    /** @deprecated */
    __spread = function () {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    };

    /** @deprecated */
    __spreadArrays = function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };

    __spreadArray = function (to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    };

    __await = function (v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };

    __asyncGenerator = function (thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
        function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
        function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    };

    __asyncDelegator = function (o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    var __setModuleDefault = Object.create ? (function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
        o["default"] = v;
    };

    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };

    __importStar = function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };

    __importDefault = function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };

    __classPrivateFieldGet = function (receiver, state, kind, f) {
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };

    __classPrivateFieldSet = function (receiver, state, value, kind, f) {
        if (kind === "m") throw new TypeError("Private method is not writable");
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
    };

    __classPrivateFieldIn = function (state, receiver) {
        if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
        return typeof state === "function" ? receiver === state : state.has(receiver);
    };

    __addDisposableResource = function (env, value, async) {
        if (value !== null && value !== void 0) {
            if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
            var dispose, inner;
            if (async) {
                if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
                dispose = value[Symbol.asyncDispose];
            }
            if (dispose === void 0) {
                if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
                dispose = value[Symbol.dispose];
                if (async) inner = dispose;
            }
            if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
            if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
            env.stack.push({ value: value, dispose: dispose, async: async });
        }
        else if (async) {
            env.stack.push({ async: true });
        }
        return value;
    };

    var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    __disposeResources = function (env) {
        function fail(e) {
            env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };

    __rewriteRelativeImportExtension = function (path, preserveJsx) {
        if (typeof path === "string" && /^\.\.?\//.test(path)) {
            return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
                return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
            });
        }
        return path;
    };

    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__esDecorate", __esDecorate);
    exporter("__runInitializers", __runInitializers);
    exporter("__propKey", __propKey);
    exporter("__setFunctionName", __setFunctionName);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__createBinding", __createBinding);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__spreadArrays", __spreadArrays);
    exporter("__spreadArray", __spreadArray);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
    exporter("__classPrivateFieldGet", __classPrivateFieldGet);
    exporter("__classPrivateFieldSet", __classPrivateFieldSet);
    exporter("__classPrivateFieldIn", __classPrivateFieldIn);
    exporter("__addDisposableResource", __addDisposableResource);
    exporter("__disposeResources", __disposeResources);
    exporter("__rewriteRelativeImportExtension", __rewriteRelativeImportExtension);
});

0 && (0);


/***/ }),

/***/ 39955:
/***/ ((module) => {

"use strict";
module.exports = /*#__PURE__*/JSON.parse('{"name":"@aws-sdk/nested-clients","version":"3.990.0","description":"Nested clients for AWS SDK packages.","main":"./dist-cjs/index.js","module":"./dist-es/index.js","types":"./dist-types/index.d.ts","scripts":{"build":"yarn lint && concurrently \'yarn:build:types\' \'yarn:build:es\' && yarn build:cjs","build:cjs":"node ../../scripts/compilation/inline nested-clients","build:es":"tsc -p tsconfig.es.json","build:include:deps":"yarn g:turbo run build -F=\\"$npm_package_name\\"","build:types":"tsc -p tsconfig.types.json","build:types:downlevel":"downlevel-dts dist-types dist-types/ts3.4","clean":"premove dist-cjs dist-es dist-types tsconfig.cjs.tsbuildinfo tsconfig.es.tsbuildinfo tsconfig.types.tsbuildinfo","lint":"node ../../scripts/validation/submodules-linter.js --pkg nested-clients","test":"yarn g:vitest run","test:watch":"yarn g:vitest watch"},"engines":{"node":">=20.0.0"},"sideEffects":false,"author":{"name":"AWS SDK for JavaScript Team","url":"https://aws.amazon.com/javascript/"},"license":"Apache-2.0","dependencies":{"@aws-crypto/sha256-browser":"5.2.0","@aws-crypto/sha256-js":"5.2.0","@aws-sdk/core":"^3.973.10","@aws-sdk/middleware-host-header":"^3.972.3","@aws-sdk/middleware-logger":"^3.972.3","@aws-sdk/middleware-recursion-detection":"^3.972.3","@aws-sdk/middleware-user-agent":"^3.972.10","@aws-sdk/region-config-resolver":"^3.972.3","@aws-sdk/types":"^3.973.1","@aws-sdk/util-endpoints":"3.990.0","@aws-sdk/util-user-agent-browser":"^3.972.3","@aws-sdk/util-user-agent-node":"^3.972.8","@smithy/config-resolver":"^4.4.6","@smithy/core":"^3.23.0","@smithy/fetch-http-handler":"^5.3.9","@smithy/hash-node":"^4.2.8","@smithy/invalid-dependency":"^4.2.8","@smithy/middleware-content-length":"^4.2.8","@smithy/middleware-endpoint":"^4.4.14","@smithy/middleware-retry":"^4.4.31","@smithy/middleware-serde":"^4.2.9","@smithy/middleware-stack":"^4.2.8","@smithy/node-config-provider":"^4.3.8","@smithy/node-http-handler":"^4.4.10","@smithy/protocol-http":"^5.3.8","@smithy/smithy-client":"^4.11.3","@smithy/types":"^4.12.0","@smithy/url-parser":"^4.2.8","@smithy/util-base64":"^4.3.0","@smithy/util-body-length-browser":"^4.2.0","@smithy/util-body-length-node":"^4.2.1","@smithy/util-defaults-mode-browser":"^4.3.30","@smithy/util-defaults-mode-node":"^4.2.33","@smithy/util-endpoints":"^3.2.8","@smithy/util-middleware":"^4.2.8","@smithy/util-retry":"^4.2.8","@smithy/util-utf8":"^4.2.0","tslib":"^2.6.2"},"devDependencies":{"concurrently":"7.0.0","downlevel-dts":"0.10.1","premove":"4.0.0","typescript":"~5.8.3"},"typesVersions":{"<4.0":{"dist-types/*":["dist-types/ts3.4/*"]}},"files":["./signin.d.ts","./signin.js","./sso-oidc.d.ts","./sso-oidc.js","./sts.d.ts","./sts.js","dist-*/**"],"browser":{"./dist-es/submodules/signin/runtimeConfig":"./dist-es/submodules/signin/runtimeConfig.browser","./dist-es/submodules/sso-oidc/runtimeConfig":"./dist-es/submodules/sso-oidc/runtimeConfig.browser","./dist-es/submodules/sts/runtimeConfig":"./dist-es/submodules/sts/runtimeConfig.browser"},"react-native":{},"homepage":"https://github.com/aws/aws-sdk-js-v3/tree/main/packages/nested-clients","repository":{"type":"git","url":"https://github.com/aws/aws-sdk-js-v3.git","directory":"packages/nested-clients"},"exports":{"./package.json":"./package.json","./sso-oidc":{"types":"./dist-types/submodules/sso-oidc/index.d.ts","module":"./dist-es/submodules/sso-oidc/index.js","node":"./dist-cjs/submodules/sso-oidc/index.js","import":"./dist-es/submodules/sso-oidc/index.js","require":"./dist-cjs/submodules/sso-oidc/index.js"},"./sts":{"types":"./dist-types/submodules/sts/index.d.ts","module":"./dist-es/submodules/sts/index.js","node":"./dist-cjs/submodules/sts/index.js","import":"./dist-es/submodules/sts/index.js","require":"./dist-cjs/submodules/sts/index.js"},"./signin":{"types":"./dist-types/submodules/signin/index.d.ts","module":"./dist-es/submodules/signin/index.js","node":"./dist-cjs/submodules/signin/index.js","import":"./dist-es/submodules/signin/index.js","require":"./dist-cjs/submodules/signin/index.js"}}}');

/***/ })

};
;