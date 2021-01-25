import * as dotenv from 'dotenv';
dotenv.config();

import express, { RequestHandler } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { CommunicationIdentityClient } from '@azure/communication-administration';
import { ChatClient, ChatThreadClient } from '@azure/communication-chat';
import { AzureCommunicationUserCredential } from '@azure/communication-common';
import { BlobServiceClient, BlobUploadCommonResponse, RestError } from '@azure/storage-blob';
import { TableClient, TableEntity, TablesSharedKeyCredential } from '@azure/data-tables';

// TODO: move to declaration file
import { addFileMetadata, addUserDetails, downloadFile, FileMetadata, FileServiceError, getFileMetadata, getFilesForGroup, getUserDetails, uploadFile } from './fileService';
declare global {
    namespace Express {
        export interface Request {
            userId: string;
        }
    }
}

class CommunicationUserToken {
    threadId: string;
    moderatorId: string;
    moderatorToken: string;

    constructor(id: string, moderatorId: string, moderatorToken: string){
        this.threadId = id;
        this.moderatorId = moderatorId;
        this.moderatorToken = moderatorToken;
    }
}

const uploadMiddleware = multer({ limits: { fieldSize: 5 * 1024 * 1024 } });

const app = express();
app.use(express.json())
const PORT = 5000;

var tokenStore: {[key: string]: CommunicationUserToken } = {};

const [
    acsConnectionString,
    storageConnectionString,
] = [
    'ACS_CONNECTION_STRING',
    'STORAGE_CONNECTION_STRING',
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
const userDetailTable='userDetails';

// express middleware to validate Authorization header
const fakeAuthMiddleware: RequestHandler = (req, res, next) => {
    const authValue = req.header('Authorization');
    if (!authValue) {
        res.sendStatus(403);
        return;
    }

    req.userId = authValue;

    next();
};

app.get('/userToken', async (req, res) => {
    const identityClient = new CommunicationIdentityClient(acsConnectionString);

    const userResponse = await identityClient.createUser();
    const tokenResponse = await identityClient.issueToken(userResponse, ["voip", "chat"]);

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

app.get('/groups/:groupId/files', fakeAuthMiddleware, async (req, res) => {
    const groupId = req.params['groupId'];
    const userId = req.userId;

    // TODO: Verify that user is allowed to get files for this chat/call
    const users = await getUserDetails(groupId, userId, storageConnectionString, userDetailTable);
    if(users.length==0)
        return res.sendStatus(403);

    const files = await getFilesForGroup(groupId, storageConnectionString, tableName);
    files.sort((a, b) => b.uploadDateTime.getTime() - a.uploadDateTime.getTime());

    return res.status(200).send(files);
});

app.get('/groups/:groupId/files/:fileId', fakeAuthMiddleware, async (req, res) => {
    const groupId = req.params['groupId'];
    const userId = req.userId;

    // TODO: Verify that user is allowed to get files for this chat/call
    const users = await getUserDetails(groupId, userId, storageConnectionString, userDetailTable);
    if(users.length==0)
        return res.sendStatus(403);

    const fileId = req.params['fileId'];

    let file: FileMetadata;
    try {
        file = await getFileMetadata(groupId, fileId, storageConnectionString, tableName);
    } catch (e) {
        if (e instanceof FileServiceError) {
            res.sendStatus(404);
            return;
        }

        throw e;
    }

    const fileStream = await downloadFile(fileId, storageConnectionString, blobContainerName);

    res.attachment(file.name);
    res.contentType('application/octet-stream');
    res.status(200);
    fileStream.pipe(res);
});

interface SendFileRequestBody {
    image?: string;
    fileName?: string;
}

interface AddUserRequestBody {
    id: string;
    displayName: string;
}

interface TableStorageFileMetadata {
    FileId: string;
    FileName: string;
    UploadDateTime: Date;
}

app.post('/groups/:groupId/files', fakeAuthMiddleware, uploadMiddleware.single('file'), async (req, res) => {
    const groupId = req.params['groupId'];
    const userId = req.userId;
    const threadId = req.body.threadId;

    // TODO: Verify that user is allowed to get files for this chat/call
    const users = await getUserDetails(groupId, userId, storageConnectionString, userDetailTable);
    if(users.length === 0)
        return res.sendStatus(403);

    const body = req.body as SendFileRequestBody;
    if (req.file === undefined && body?.image === undefined) {
        return res.status(400).send("Invalid file/image");
    }

    if (body?.fileName === undefined) {
        return res.status(400).send("Invalid file name");
    }

    if (groupId === undefined) {
        return res.status(400).send("Invalid group ID");
    }

    if (threadId === undefined) {
        return res.status(400).send("Invalid thread ID");
    }

    // Upload file to Blob Storage
    const newFileId: string = uuidv4();
    if (req.file !== undefined) {
        console.log(`Got file length: ${req.file.size}`);
        await uploadFile(newFileId, req.file.buffer, storageConnectionString, blobContainerName);
    } else {
        console.log(`Got image length: ${body.image?.length}`);
        const buffer = Buffer.from(body.image!, 'base64');
        await uploadFile(newFileId, buffer, storageConnectionString, blobContainerName);
    }

    console.log(`Uploaded blob: ${newFileId}`);

    // Add file metadata to Table Storage
    const newFileMetadata: FileMetadata = {
        id: newFileId,
        name: body.fileName,
        uploadDateTime: new Date(),
    };
    await addFileMetadata(groupId, newFileMetadata, storageConnectionString, tableName);

    console.log('Added file data to table');

    const userCredential = tokenStore[threadId];
    const chatClient = new ChatClient(getEnvironmentUrl(), new AzureCommunicationUserCredential(userCredential.moderatorToken));
    const chatThreadClient = await chatClient.getChatThreadClient(userCredential.threadId);

    await chatThreadClient.sendMessage({content: "hello there's a new file!"});

    return res.sendStatus(204);
});

/* chat */
const getEnvironmentUrl = () : string => {
    var connectionString = acsConnectionString.replace("endpoint=", "");

    var environmentUrl = new URL(connectionString);
    return environmentUrl.protocol + "//" + environmentUrl.host;
};

app.get('/getEnvironmentUrl', fakeAuthMiddleware, async (req, res) => {
    res.status(200).send(getEnvironmentUrl());
 });

app.get('/isValidThread/:threadId', async (req, res) => {
     if(req.params['threadId'] in tokenStore){
        return res.sendStatus(200);
     }
     return res.sendStatus(404);
 });

 app.post('/createThread', async(req, res) => {
    const identityClient = new CommunicationIdentityClient(acsConnectionString);

    // create our user
    const userResponse = await identityClient.createUser();
    const tokenResponse = await identityClient.issueToken(userResponse, ["voip", "chat"]);

    let chatClient = new ChatClient(getEnvironmentUrl(), new AzureCommunicationUserCredential(tokenResponse.token));
    let createThreadRequest = {
        topic: 'Chat',
        members: [{
                    user: { communicationUserId: tokenResponse.user.communicationUserId },
                }]
    };

    let chatThreadClient = await chatClient.createChatThread(createThreadRequest);
    let threadId = chatThreadClient.threadId;
    tokenStore[threadId] = new CommunicationUserToken(threadId, tokenResponse.user.communicationUserId, tokenResponse.token);

    return res.status(200).send(threadId);
 });

 const generateNewModeratorAndThread = async () => {

 };

 app.post('/addUser/:threadId', fakeAuthMiddleware, async(req, res) => {
    try{
        const threadId = req.params['threadId'];
        const body = req.body as AddUserRequestBody;
        const moderator = tokenStore[threadId];

        let addMembersRequest =
        {
        members: [
            {
                user: { communicationUserId: body.id },
                displayName: body.displayName
            }]
            };

        let chatClient = new ChatClient(getEnvironmentUrl(), new AzureCommunicationUserCredential(moderator.moderatorToken));
        let chatThreadClient = await chatClient.getChatThreadClient(threadId);
        await chatThreadClient.addMembers(addMembersRequest);
        res.sendStatus(200);
    }catch(error){
        res.sendStatus(400);
    }
 });

app.post('/groups/:groupId/user', fakeAuthMiddleware, async (req, res) => {
    const groupId = req.params['groupId'];
    const userId = req.userId;
    if (groupId === undefined) {
        return res.status(400).send("Invalid group ID");
    }

    await addUserDetails(groupId, userId,storageConnectionString, userDetailTable);
    console.log('Added User details to table');

    return res.sendStatus(204);
});

app.listen(PORT, () => {
    console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
