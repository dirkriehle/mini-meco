import { Database } from "sqlite";
import { ObjectHandler } from "../ObjectHandler";
import { DatabaseSerializableFactory } from "../Serializer/DatabaseSerializableFactory";
import { User } from "../Models/User";
import { IManager } from "./IManager";

export class UserManager implements IManager {
    protected db: Database;
    protected oh: ObjectHandler;

    constructor(db: Database, oh: ObjectHandler) {
        this.db = db;
        this.oh = oh;
    }

    public async createUser(): Promise<User> {
        const dbsf = new DatabaseSerializableFactory(this.db);
        const proj = await dbsf.create("User") as User;
        return proj;
    }
}