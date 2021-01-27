import { TableClient, TableEntity } from "@azure/data-tables";
import { RestError } from "@azure/storage-blob";
import { ensureTableCreated } from "./utils/azureStorageUtils";

export type UserServiceErrorType = 'UserNotFound' | 'UserAlreadyExists' | 'AppointmentNotFound';

export class UserServiceError extends Error {
    public type: UserServiceErrorType;

    constructor(type: UserServiceErrorType, message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.name = 'UserServiceError';
        this.type = type;
    }
}

export interface User {
    userId: string;
    acsUserId: string;
}

interface TableStorageUser {
    UserId: string;
    ACSUserId: string;
}

export async function getUser(userId: string, storageConnectionString: string, tableName: string): Promise<User> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);

    try {
        const entityResponse = await tableClient.getEntity<TableStorageUser>(userId, userId);
        return {
            userId: entityResponse.UserId,
            acsUserId: entityResponse.ACSUserId,
        };
    } catch (e) {
        if (e instanceof RestError && e.statusCode === 404) {
            throw(new UserServiceError('UserNotFound'));
        }

        throw e;
    }
}

export async function addUser(user: User, storageConnectionString: string, tableName: string): Promise<void> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);

    const entity: TableEntity<TableStorageUser> = {
        partitionKey: user.userId,
        rowKey: user.userId,
        UserId: user.userId,
        ACSUserId: user.acsUserId,
    };

    try {
        await tableClient.createEntity(entity);
    } catch (e) {
        if (e instanceof RestError && e.statusCode === 409) {
            throw new UserServiceError('UserAlreadyExists');
        }

        throw e;
    }
}

export interface AppointmentUser {
    userId: string;
    appointmentId: string;
}

interface TableStorageAppointmentUser {
    UserId: string;
    AppointmentId: string;
}

// Gets all users
// Uses Table Storage
export async function getAppointmentUser(groupId: string, userId: string, storageConnectionString: string, tableName: string): Promise<AppointmentUser[]> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);
    
    const entitiesIter = tableClient.listEntities<TableStorageAppointmentUser>({
        queryOptions: {
            filter: `PartitionKey eq '${groupId}' `
        },
    });
    const users: AppointmentUser[] = [];
    for await (const entity of entitiesIter) {
        if(entity.UserId==userId)
        users.push({
            userId: entity.UserId,
            appointmentId: entity.AppointmentId,
            
        });
    }
    return users;
}

// Adds User-group call details
// Uses Table Storage
export async function addAppointmentUser(groupId: string, userId: string, storageConnectionString: string, tableName: string): Promise<void> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);

    const entity: TableEntity<TableStorageAppointmentUser> = {
        partitionKey: groupId,
        rowKey: userId,
        UserId: userId,
        AppointmentId: groupId,
        
    };
    try{ 
    await tableClient.createEntity(entity);}
    catch(e){throw e}
}

export interface Appointment {
    appointmentId: string;
    acsChatThreadId: string;
    acsModeratorUserId: string;
}

interface TableStorageAppointment {
    AppointmentId: string;
    ACSChatThreadId: string;
    ACSModeratorUserId: string;
}

export async function getAppointment(appointmentId: string, storageConnectionString: string, tableName: string): Promise<Appointment> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);

    try {
        const entityResponse = await tableClient.getEntity<TableStorageAppointment>(appointmentId, appointmentId);
        return {
            appointmentId: entityResponse.AppointmentId,
            acsChatThreadId: entityResponse.ACSChatThreadId,
            acsModeratorUserId: entityResponse.ACSModeratorUserId,
        };
    } catch (e) {
        if (e instanceof RestError && e.statusCode === 404) {
            throw(new UserServiceError('AppointmentNotFound'));
        }

        throw e;
    }
}

export async function addAppointment(appointment: Appointment, storageConnectionString: string, tableName: string): Promise<void> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);

    const entity: TableEntity<TableStorageAppointment> = {
        partitionKey: appointment.appointmentId,
        rowKey: appointment.appointmentId,
        AppointmentId: appointment.appointmentId,
        ACSChatThreadId: appointment.acsChatThreadId,
        ACSModeratorUserId: appointment.acsModeratorUserId,
    };
    await tableClient.createEntity(entity);
}