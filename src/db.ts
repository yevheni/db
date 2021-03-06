import {
	Connection,
	ConnectionOptions,
	createConnection,
	Model,
	Schema,
	SchemaDefinition,
	Document,
	FilterQuery
} from "mongoose";
import * as shortid from "shortid";

export interface IObject {
	[key: string]: any
}
export interface MongoConfig extends IObject {
	name?: string,
	url: string,
	options?: ConnectionOptions,
}
export interface MongoCopyOptions {
	from: string,
	to: string,
	filter: IObject,
	update?: IObject,
	skip?: number,
	limit?: number,
}
export interface IDocument extends Document, IObject {}
export interface IModel extends Model<IDocument> {
	deleteManySafe: (query: FilterQuery<Document>) => Promise<{
		n?: number,
		ok?: number,
		deletedCount?: number,
	}>
}

export class Mongo {
	config: MongoConfig;
	connection: Connection;
	models: IObject = {};

	constructor(config: MongoConfig, connectOnInit = true) {
		this.config = config;

		if (connectOnInit) {
			this.connect();
		}
	}

	connect() {
		const {
			name, url, options
		} = this.config;

		// const initDB = () => {
		this.connection = createConnection(url, options);
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

	model(name: string, schema: SchemaDefinition = {}): IModel {
		if (!this.models[name]) {
			const schemaCreated = new Schema({
				"_id": {
					type: String,
					default: shortid.generate,
				},
				"created": {
					type: Number,
				},
				"updated": {
					type: Number,
				},
				...schema,
			}, {
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
			const model = this.connection.model(name, schemaCreated) as IModel;

			model.deleteManySafe = async (query: FilterQuery<Document> = {}) => {
				const nameDeleted = `${name}_deleted`;

				await this.copy({
					from: name,
					to: nameDeleted,
					filter: query,
					update: {
						_deleted: Date.now(),
					},
					limit: 100
				});

				const result = await model.deleteMany(query);

				return result;
			};

			this.models[name] = model;
		}

		return this.models[name];
	}

	async put(
		model: string,
		docs: Document[],
		update = {}
	) {
		if (!model) throw new Error(`"model" not provided`);

		if (docs.length) {
			const pipeline = docs.map(doc => {
				return {
					updateOne: {
						filter: {
							_id: doc._id,
						},
						update: {
							...doc,
							...update,
						},
						upsert: true,
					}
				}
			});

			return await this.model(model).bulkWrite(pipeline);
		} else {
			return null;
		}
	}

	async copy(options: MongoCopyOptions) {
		const {
			from,
			to,
			filter = {},
			update = {},
			skip = 0,
			limit = 100,
		} = options;

		if (!from) throw new Error(`"from" not provided`);
		if (!to) throw new Error(`"to" not provided`);

		const move = async (move_skip = 0) => {
			const docs = await this.model(from).aggregate([
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

			await this.put(to, docs, update);

			if (docs.length === limit) {
				await move(move_skip + limit);
			}
		};

		await move(skip);
	}

	async useDb(dbName: string) {
		const clone = Object.assign({}, this);

		Object.setPrototypeOf(clone, Mongo.prototype);

		clone.connection = clone.connection.useDb(dbName);

		return clone;
	}
}
