"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mongo = void 0;
const mongoose_1 = require("mongoose");
const shortid = require("shortid");
class Mongo {
    constructor(config, connectOnInit = true) {
        this.models = {};
        this.config = config;
        if (connectOnInit) {
            this.connect();
        }
    }
    connect() {
        const { name, url, options } = this.config;
        // const initDB = () => {
        this.connection = mongoose_1.createConnection(url, options);
        // this.connection.on("connected", () => {
        // 	logg.fuchsia(`Database connected ${name ? `(${name})` : ``}`);
        // });
        // this.connection.on("disconnected", () => {
        // 	logg.red(`Database disconnected ${name ? `(${name})` : ``}`);
        // });
        // this.connection.on("reconnected", () => {
        // 	logg.red(`Database reconnected ${name ? `(${name})` : ``}`);
        // });
        // this.connection.on("error", (err) => {
        // 	logg.red(`!!!!! Database error ${name ? `(${name})` : ``} !!!!!`);
        // 	console.error(err);
        //
        // 	// this.connection.close(true).then(() => {
        // 	//     initDB();
        // 	// }).catch(err => console.error(err));
        // });
        // this.connection.on("reconnectFailed", () => {
        // 	logg.red(`Database reconnectFailed ${name ? `(${name})` : ``}`);
        //
        // 	// this.connection.close(true).then(() => {
        // 	//     initDB();
        // 	// }).catch(err => console.error(err));
        // });
        // return connection;
        // };
        //
        // initDB();
    }
    model(name, schema = {}) {
        if (!this.models[name]) {
            const schemaCreated = new mongoose_1.Schema(Object.assign({ "_id": {
                    type: String,
                    default: shortid.generate,
                }, "created": {
                    type: Number,
                }, "updated": {
                    type: Number,
                } }, schema), {
                "strict": false,
                "versionKey": false,
                "collection": name,
                "minimize": false,
                "timestamps": {
                    "createdAt": "created",
                    "updatedAt": "updated",
                    "currentTime": () => Date.now(),
                },
            });
            /** Set deleteManySafe */
            const model = this.connection.model(name, schemaCreated);
            model.deleteManySafe = (query = {}) => __awaiter(this, void 0, void 0, function* () {
                const nameDeleted = `${name}_deleted`;
                yield this.copy({
                    from: name,
                    to: nameDeleted,
                    filter: query,
                    update: {
                        _deleted: Date.now(),
                    },
                    limit: 100
                });
                const result = yield model.deleteMany(query);
                return result;
            });
            this.models[name] = model;
        }
        return this.models[name];
    }
    put(model, docs, update = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!model)
                throw new Error(`"model" not provided`);
            if (docs.length) {
                const pipeline = docs.map(doc => {
                    return {
                        updateOne: {
                            filter: {
                                _id: doc._id,
                            },
                            update: Object.assign(Object.assign({}, doc), update),
                            upsert: true,
                        }
                    };
                });
                return yield this.model(model).bulkWrite(pipeline);
            }
            else {
                return null;
            }
        });
    }
    copy(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { from, to, filter = {}, update = {}, skip = 0, limit = 100, } = options;
            if (!from)
                throw new Error(`"from" not provided`);
            if (!to)
                throw new Error(`"to" not provided`);
            const move = (move_skip = 0) => __awaiter(this, void 0, void 0, function* () {
                const docs = yield this.model(from).aggregate([
                    {
                        $match: filter
                    },
                    {
                        $skip: move_skip
                    },
                    {
                        $limit: limit
                    }
                ]).allowDiskUse(true).exec();
                yield this.put(to, docs, update);
                if (docs.length === limit) {
                    yield move(move_skip + limit);
                }
            });
            yield move(skip);
        });
    }
    useDb(dbName) {
        return __awaiter(this, void 0, void 0, function* () {
            const clone = Object.assign({}, this);
            Object.setPrototypeOf(clone, Mongo.prototype);
            clone.connection = clone.connection.useDb(dbName);
            return clone;
        });
    }
}
exports.Mongo = Mongo;
//# sourceMappingURL=db.js.map