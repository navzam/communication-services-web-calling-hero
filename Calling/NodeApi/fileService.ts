import { TableClient, TableEntity } from "@azure/data-tables";
import { BlobServiceClient, ContainerClient, RestError } from "@azure/storage-blob";

export type FileServiceErrorType = 'FileNotFound' | 'FileTooLarge';

export class FileServiceError extends Error {
    public type: FileServiceErrorType;

    constructor(type: FileServiceErrorType, message?: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.name = 'FileServiceError';
        this.type = type;
    }
}

export interface FileMetadata {
    id: string;
    name: string;
    uploadDateTime: Date;
}

interface TableStorageFileMetadata {
    FileId: string;
    FileName: string;
    UploadDateTime: Date;
}

interface UserDetails{
    UserId: string;
    appointmentId: string;
}

// Gets file metadata for all files in a group
// Uses Table Storage
export async function getFilesForGroup(groupId: string, storageConnectionString: string, tableName: string): Promise<FileMetadata[]> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);

    const entitiesIter = tableClient.listEntities<TableStorageFileMetadata>({
        queryOptions: {
            filter: `PartitionKey eq '${groupId}'`,
        },
    });
    const files: FileMetadata[] = [];
    for await (const entity of entitiesIter) {
        files.push({
            id: entity.FileId,
            name: entity.FileName,
            uploadDateTime: entity.UploadDateTime,
        });
    }

    return files;
}

// Gets file metadata for a single file
// Uses Table Storage
export async function getFileMetadata(groupId: string, fileId: string, storageConnectionString: string, tableName: string): Promise<FileMetadata> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);

    try {
        const entityResponse = await tableClient.getEntity<TableStorageFileMetadata>(groupId, fileId);
        return {
            id: entityResponse.FileId,
            name: entityResponse.FileName,
            uploadDateTime: entityResponse.UploadDateTime,
        };
    } catch (e) {
        if (e instanceof RestError && e.statusCode === 404) {
            throw(new FileServiceError('FileNotFound'));
        }

        throw e;
    }
}

// Adds file metadata for a single file
// Uses Table Storage
export async function addFileMetadata(groupId: string, fileMetadata: FileMetadata, storageConnectionString: string, tableName: string): Promise<void> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);

    const entity: TableEntity<TableStorageFileMetadata> = {
        partitionKey: groupId,
        rowKey: fileMetadata.id,
        FileId: fileMetadata.id,
        FileName: fileMetadata.name,
        UploadDateTime: fileMetadata.uploadDateTime,
    };
    await tableClient.createEntity(entity);
}



// Gets stream for a single file
// Uses Blob Storage
export async function downloadFile(fileId: string, storageConnectionString: string, blobContainerName: string): Promise<NodeJS.ReadableStream> {
    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
    const containerClient = blobServiceClient.getContainerClient(blobContainerName);
    await ensureBlobContainerCreated(containerClient);

    const blobClient = containerClient.getBlockBlobClient(fileId);

    const blobDownloadResponse = await blobClient.download();
    if (blobDownloadResponse.readableStreamBody === undefined) {
        throw new FileServiceError('FileNotFound')
    }

    return blobDownloadResponse.readableStreamBody
}

// Uploads a single file
// Uses Blob Storage
export async function uploadFile(fileId: string, fileBuffer: Buffer, storageConnectionString: string, blobContainerName: string): Promise<void> {
    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
    const containerClient = blobServiceClient.getContainerClient(blobContainerName);
    await ensureBlobContainerCreated(containerClient);

    const blobClient = containerClient.getBlockBlobClient(fileId);
    
    let blobUploadResponse = await blobClient.uploadData(fileBuffer);
}

// Adds User-group call details
// Uses Table Storage
export async function addUserDetails(groupId: string, userId: string, storageConnectionString: string, tableName: string): Promise<void> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);

    const entity: TableEntity<UserDetails> = {
        partitionKey: groupId,
        rowKey: userId,
        UserId: userId,
        appointmentId: groupId,
        
    };
    try{ 
    await tableClient.createEntity(entity);}
    catch(e){throw e}
}

// Gets all users
// Uses Table Storage
export async function getUserDetails(groupId: string, userId: string, storageConnectionString: string, tableName: string): Promise<UserDetails[]> {
    const tableClient = TableClient.fromConnectionString(storageConnectionString, tableName);
    await ensureTableCreated(tableClient);
    
    const entitiesIter = tableClient.listEntities<UserDetails>({
        queryOptions: {
            filter: `PartitionKey eq '${groupId}' `
        },
    });
    const users: UserDetails[] = [];
    for await (const entity of entitiesIter) {
        if(entity.UserId==userId)
        users.push({
            UserId: entity.UserId,
            appointmentId: entity.appointmentId,
            
        });
    }
    return users;
}

async function ensureTableCreated(tableClient: TableClient): Promise<void> {
    try {
        await tableClient.create();
    } catch (e) {
        if (e instanceof RestError && e.statusCode === 409) {
            return;
        }

        throw e;
    }
}

async function ensureBlobContainerCreated(containerClient: ContainerClient): Promise<void> {
    await containerClient.createIfNotExists();
}