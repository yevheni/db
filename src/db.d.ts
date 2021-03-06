import { Connection, ConnectionOptions, Model, SchemaDefinition, Document, FilterQuery } from "mongoose";
export interface IObject {
    [key: string]: any;
}
export interface MongoConfig extends IObject {
    name?: string;
    url: string;
    options?: ConnectionOptions;
}
export interface MongoCopyOptions {
    from: string;
    to: string;
    filter: IObject;
    update?: IObject;
    skip?: number;
    limit?: number;
}
export interface IDocument extends Document, IObject {
}
export interface IModel extends Model<IDocument> {
    deleteManySafe: (query: FilterQuery<Document>) => Promise<{
        n?: number;
        ok?: number;
        deletedCount?: number;
    }>;
}
export declare class Mongo {
    config: MongoConfig;
    connection: Connection;
    models: IObject;
    constructor(config: MongoConfig, connectOnInit?: boolean);
    connect(): void;
    model(name: string, schema?: SchemaDefinition): IModel;
    put(model: string, docs: Document[], update?: {}): Promise<import("mongodb").BulkWriteOpResultObject>;
    copy(options: MongoCopyOptions): Promise<void>;
    useDb(dbName: string): Promise<{} & this>;
}
