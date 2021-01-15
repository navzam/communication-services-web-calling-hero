import { TableClient, TableEntity, TablesSharedKeyCredential } from "@azure/data-tables";
import { BlobServiceClient, RestError } from "@azure/storage-blob";

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

// Gets file metadata for all files in a group
// Uses Table Storage
export async function getFilesForGroup(groupId: string, storageAccountName: string, storageAccountKey: string, tableName: string): Promise<FileMetadata[]> {
    const tableStorageCredential = new TablesSharedKeyCredential(storageAccountName, storageAccountKey);
    const tableClient = new TableClient(`https://${storageAccountName}.table.core.windows.net`, tableName, tableStorageCredential);
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
export async function getFileMetadata(groupId: string, fileId: string, storageAccountName: string, storageAccountKey: string, tableName: string): Promise<FileMetadata> {
    const tableStorageCredential = new TablesSharedKeyCredential(storageAccountName, storageAccountKey);
    const tableClient = new TableClient(`https://${storageAccountName}.table.core.windows.net`, tableName, tableStorageCredential);

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
export async function addFileMetadata(groupId: string, fileMetadata: FileMetadata, storageAccountName: string, storageAccountKey: string, tableName: string): Promise<void> {
    const tableStorageCredential = new TablesSharedKeyCredential(storageAccountName, storageAccountKey);
    const tableClient = new TableClient(`https://${storageAccountName}.table.core.windows.net`, tableName, tableStorageCredential);
    try {
        await tableClient.create();
    } catch (e) {
        if (e instanceof RestError && e.statusCode === 409) {
        } else {
            throw e;
        }
    }

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
export async function downloadFile(fileId: string, blobStorageConnectionString: string, blobContainerName: string): Promise<NodeJS.ReadableStream> {
    const blobServiceClient = BlobServiceClient.fromConnectionString(blobStorageConnectionString);
    const containerClient = blobServiceClient.getContainerClient(blobContainerName);
    // await containerClient.createIfNotExists();
    const blobClient = containerClient.getBlockBlobClient(fileId);

    const blobDownloadResponse = await blobClient.download();
    if (blobDownloadResponse.readableStreamBody === undefined) {
        throw new FileServiceError('FileNotFound')
    }

    return blobDownloadResponse.readableStreamBody
}

// Uploads a single file
// Uses Blob Storage
export async function uploadFile(fileId: string, fileBuffer: Buffer, blobStorageConnectionString: string, blobContainerName: string): Promise<void> {
    const blobServiceClient = BlobServiceClient.fromConnectionString(blobStorageConnectionString);
    const containerClient = blobServiceClient.getContainerClient(blobContainerName);
    await containerClient.createIfNotExists();
    const blobClient = containerClient.getBlockBlobClient(fileId);
    
    let blobUploadResponse = await blobClient.uploadData(fileBuffer);
}