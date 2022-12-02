import {
    ConnectionManager,
    getConnectionManager,
    Connection,
    ConnectionOptions,
    createConnection,
    createConnections
} from 'typeorm';
  
import entities from '@/entity';
import { logger } from "@/lib/winston";

import 'mysql';

export default class Database {
    connectionManager: ConnectionManager;
    databaseName ?: string;
    constructor(db_name ?: string) {
        this.connectionManager = getConnectionManager();
        this.databaseName = db_name ? db_name : undefined;
    }

    async connect() {
        const password = process.env.TYPEORM_PASSWORD;
        if (!password) {
            throw new Error('Failed to load database password');
        }

        const connectionOptions: ConnectionOptions = {
            entities,
            password,
            type: process.env.TYPEORM_CONNECTION as any,
            host: process.env.TYPEORM_HOST,
            database: this.databaseName ? this.databaseName : process.env.TYPEORM_DATABASE,
            username: process.env.TYPEORM_USERNAME,
            port: parseInt(process.env.TYPEORM_PORT || '3306', 10),
            synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true' && process.env.TYPEORM_DATABASE_ENV == 'live',
            name : 'default',
            // logging: process.env.TYPEORM_LOGGING === 'true',
            // charset:"utf8mb4"
        };
        return createConnection(connectionOptions);
    }

    async getConnection(connect_name ?: string): Promise<Connection> {
        const CONNECTION_NAME = `default`;

        if (this.connectionManager.has(CONNECTION_NAME)) {
            const connection = this.connectionManager.get(CONNECTION_NAME);
            try {
                if (connection.isConnected) {
                    await connection.close();
                }
            } catch {}
            return connection.connect();
        }

        logger.info('database connection succeed.');

        return this.connect();
    }
}