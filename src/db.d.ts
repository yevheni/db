import { Connection, ConnectionOptions, Model, SchemaDefinition, Document } from "mongoose";
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
export declare class Mongo {
    config: MongoConfig;
    connection: Connection;
    models: IObject;
    constructor(config: MongoConfig);
    connect(): void;
    model(name: string, schema?: SchemaDefinition): Model<Document>;
    put(model: string, docs: Document[], update?: {}): Promise<import("mongodb").BulkWriteOpResultObject>;
    copy(options: MongoCopyOptions): Promise<void>;
}
