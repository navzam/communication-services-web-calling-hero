import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { CommunicationIdentityClient } from '@azure/communication-administration';
import { BlobServiceClient, BlobUploadCommonResponse, RestError } from '@azure/storage-blob';
import { TableClient, TableEntity, TablesSharedKeyCredential } from '@azure/data-tables';

const uploadMiddleware = multer({ limits: { fieldSize: 5 * 1024 * 1024 } });

const app = express();
const PORT = 5000;

const [
    acsConnectionString,
    storageConnectionString,
    storageAccountName,
    storageAccountKey
] = [
    'ACS_CONNECTION_STRING',
    'STORAGE_CONNECTION_STRING',
    'STORAGE_ACCOUNT_NAME',
    'STORAGE_ACCOUNT_KEY'
].map(envKey => {
    const envValue = process.env[envKey];
    if (envValue === undefined) {
        console.error(`Environment variable not found: ${envKey}`);
        process.exit(1);
    }
    return envValue;
});

const blobContainerName = 'files';
const tableName = 'fileMetadata';

app.get('/userToken', async (req, res) => {
    const identityClient = new CommunicationIdentityClient(acsConnectionString);

    const userResponse = await identityClient.createUser();
    const tokenResponse = await identityClient.issueToken(userResponse, ["voip"]);

    return res.status(200).json({
        value: {
            token: tokenResponse.token,
            expiresOn: tokenResponse.expiresOn,
            user: {
                id: tokenResponse.user.communicationUserId,
            }
        }
    });
});

app.get('/groups/:groupId/files', async (req, res) => {
    const groupId = req.params['groupId'];

    // TODO: Verify that user is allowed to get files for this chat/call

    // Get file info from Table Storage
    const tableStorageCredential = new TablesSharedKeyCredential(storageAccountName, storageAccountKey);
    const tableClient = new TableClient(`https://${storageAccountName}.table.core.windows.net`, tableName, tableStorageCredential);
    const entitiesIter = tableClient.listEntities<TableStorageFileMetadata>({
        queryOptions: {
            filter: `PartitionKey eq '${groupId}'`,
        },
    });
    const files = [];
    for await (const entity of entitiesIter) {
        files.push({
            id: entity.FileId,
            name: entity.FileName,
            uploadDateTime: entity.UploadDateTime,
        });
    }

    return res.status(200).send(files);
});

app.get('/groups/:groupId/files/:fileId', async (req, res) => {
    const groupId = req.params['groupId'];
    const fileId = req.params['fileId'];

    // TODO: Verify that user is allowed to get files for this chat/call

    // Prepare Table Storage clients
    const tableStorageCredential = new TablesSharedKeyCredential(storageAccountName, storageAccountKey);
    const tableClient = new TableClient(`https://${storageAccountName}.table.core.windows.net`, tableName, tableStorageCredential);

    // Get file info from Table Storage
    let fileName: string;
    try {
        const entityResponse = await tableClient.getEntity<TableStorageFileMetadata>(groupId, fileId);
        fileName = entityResponse.FileName;
    } catch (e) {
        if (e instanceof RestError && e.statusCode === 404) {
            res.sendStatus(404);
            return;
        }

        throw e;
    }

    // Prepare Blob Storage clients and container
    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
    const containerClient = blobServiceClient.getContainerClient(blobContainerName);
    // await containerClient.createIfNotExists();
    const blobClient = containerClient.getBlockBlobClient(fileId);

    const blobStream = await blobClient.download();

    res.attachment(fileName);
    res.contentType('application/octet-stream');
    res.status(200);
    blobStream.readableStreamBody?.pipe(res);
});

interface SendFileRequestBody {
    image?: string;
    fileName?: string;
}

interface TableStorageFileMetadata {
    FileId: string;
    FileName: string;
    UploadDateTime: Date;
}

app.post('/groups/:groupId/files', uploadMiddleware.single('file'), async (req, res) => {
    const body = req.body as SendFileRequestBody;
    if (req.file === undefined && body?.image === undefined) {
        return res.status(400).send("Invalid file");
    }

    if (body?.fileName === undefined) {
        return res.status(400).send("Invalid file name");
    }

    const groupId = req.params['groupId'];
    if (groupId === undefined) {
        return res.status(400).send("Invalid group ID");
    }

    // Prepare Blob Storage clients and container
    const blobName: string = uuidv4();
    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
    const containerClient = blobServiceClient.getContainerClient(blobContainerName);
    await containerClient.createIfNotExists();
    const blobClient = containerClient.getBlockBlobClient(blobName);
    
    let uploadResponse: BlobUploadCommonResponse;
    if (req.file !== undefined) {
        console.log(`Got file length: ${req.file.size}`);
        uploadResponse = await blobClient.uploadData(req.file.buffer);
    } else {
        console.log(`Got image length: ${body.image?.length}`);
        const buffer = Buffer.from(body.image!, "base64");
        uploadResponse = await blobClient.uploadData(buffer);
    }

    console.log(`Uploaded blob: ${blobName}`);

    // Store file info in Table Storage
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
        rowKey: blobName,
        FileId: blobName,
        FileName: body.fileName,
        UploadDateTime: new Date(),
    };
    tableClient.createEntity(entity);
    console.log('Added file data to table');

    return res.sendStatus(204);
});

app.listen(PORT, () => {
    console.log(`[server]: Server is running at https://localhost:${PORT}`);
});