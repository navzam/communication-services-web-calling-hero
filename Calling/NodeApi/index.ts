import * as dotenv from 'dotenv';
dotenv.config();

import express, { RequestHandler } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { CommunicationIdentityClient } from '@azure/communication-administration';
import { ChatClient } from '@azure/communication-chat';
import { AzureCommunicationUserCredential } from '@azure/communication-common';

import { addFileMetadata, downloadFile, FileMetadata, FileServiceError, getFileMetadata, getFilesForGroup, uploadFile } from './fileService';
import { addUser, addAppointmentUser, getUser, getAppointmentUser, User, UserServiceError, getAppointment, Appointment, addAppointment } from './userService';

const uploadMiddleware = multer({ limits: { fieldSize: 5 * 1024 * 1024 } });

const app = express();
app.use(express.json())
const PORT = 5000;

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
const fileMetadataTableName = 'fileMetadata';
const appointmentUserTableName = 'appointmentUsers';
const userTableName = 'users';
const appointmentTableName = 'appointments';

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

app.post('/users', fakeAuthMiddleware, async (req, res) => {
    const userId = req.userId;

    const identityClient = new CommunicationIdentityClient(acsConnectionString);
    const createUserResponse = await identityClient.createUser();
    const acsUserId = createUserResponse.communicationUserId;

    try {
        await addUser({
            userId: userId,
            acsUserId: acsUserId,
        }, storageConnectionString, userTableName);
    } catch (e) {
        if (e instanceof UserServiceError && e.type === 'UserAlreadyExists') {
            await identityClient.deleteUser(createUserResponse);
            return res.sendStatus(409);
        }

        throw e;
    }

    return res.sendStatus(204);
});

app.get('/userToken', fakeAuthMiddleware, async (req, res) => {
    console.log(`/userToken`);

    const identityClient = new CommunicationIdentityClient(acsConnectionString);

    let acsUserId: string;
    try {
        const user = await getUser(req.userId, storageConnectionString, userTableName);
        acsUserId = user.acsUserId;
    } catch (e) {
        // If this is a new user, create a new ACS user and insert user into table
        if (e instanceof UserServiceError && e.type === 'UserNotFound') {
            const userResponse = await identityClient.createUser();
            acsUserId = userResponse.communicationUserId;
            
            await addUser({
                userId: req.userId,
                acsUserId: acsUserId,
            }, storageConnectionString, userTableName);
        } else {
            throw e;
        }
    }

    const tokenResponse = await identityClient.issueToken({ communicationUserId: acsUserId }, ["voip", "chat"]);

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
    const users = await getAppointmentUser(groupId, userId, storageConnectionString, appointmentUserTableName);
    if (users.length === 0)
        return res.sendStatus(403);

    const files = await getFilesForGroup(groupId, storageConnectionString, fileMetadataTableName);
    files.sort((a, b) => new Date(b.uploadDateTime).getTime() - new Date(a.uploadDateTime).getTime());

    return res.status(200).send(files);
});

app.get('/groups/:groupId/files/:fileId', fakeAuthMiddleware, async (req, res) => {
    const groupId = req.params['groupId'];
    const userId = req.userId;

    // TODO: Verify that user is allowed to get files for this chat/call
    const users = await getAppointmentUser(groupId, userId, storageConnectionString, appointmentUserTableName);
    if (users.length === 0)
        return res.sendStatus(403);

    const fileId = req.params['fileId'];

    let file: FileMetadata;
    try {
        file = await getFileMetadata(groupId, fileId, storageConnectionString, fileMetadataTableName);
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

app.post('/groups/:groupId/files', fakeAuthMiddleware, uploadMiddleware.single('file'), async (req, res) => {
    const groupId = req.params['groupId'];
    const userId = req.userId;

    // Verify that user is allowed to get files for this chat/call
    const users = await getAppointmentUser(groupId, userId, storageConnectionString, appointmentUserTableName);
    if (users.length === 0)
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
    await addFileMetadata(groupId, newFileMetadata, storageConnectionString, fileMetadataTableName);

    console.log('Added file data to table');

    // Get the appointment so we can get the ACS chat thread ID
    const appointment = await getAppointment(groupId, storageConnectionString, appointmentTableName);

    // Get chat thread client using the thread moderator's identity
    const identityClient = new CommunicationIdentityClient(acsConnectionString);
    const moderatorUserTokenResponse = await identityClient.issueToken({ communicationUserId: appointment.acsModeratorUserId }, ["chat"]);
    const chatClient = new ChatClient(getEnvironmentUrl(), new AzureCommunicationUserCredential(moderatorUserTokenResponse.token));
    const chatThreadClient = await chatClient.getChatThreadClient(appointment.acsChatThreadId);

    // "Event" to identify to chat renderer that this message should be parsed before rendering messages.
    const addedFileMessage = {
        event: "FileUpload",
        fileName: body.fileName,
        fileId: newFileId
    };

    await chatThreadClient.sendMessage({content: JSON.stringify(addedFileMessage)});
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

app.get('/groups/:groupId/chatThread', fakeAuthMiddleware, async (req, res) => {
    const groupId = req.params['groupId'];
    const userId = req.userId;
    if (groupId === undefined) {
        return res.status(400).send("Invalid group ID");
    }

    // Ensure user is part of the given appointment
    const appointmentUsers = await getAppointmentUser(groupId, userId, storageConnectionString, appointmentUserTableName);
    if (appointmentUsers.length === 0) {
        return res.sendStatus(403);
    }

    const appointment = await getAppointment(groupId, storageConnectionString, appointmentTableName);
    return res.status(200).send(appointment.acsChatThreadId);
});

app.post('/groups/:groupId/user', fakeAuthMiddleware, async (req, res) => {
    const groupId = req.params['groupId'];
    const userId = req.userId;
    if (groupId === undefined) {
        return res.status(400).send("Invalid group ID");
    }

    // Ensure user exists as a valid user
    let user: User;
    try {
        user = await getUser(userId, storageConnectionString, userTableName);
    } catch (e) {
        if (e instanceof UserServiceError && e.type === 'UserNotFound') {
            return res.sendStatus(403);
        }

        throw e;
    }

    // Check if user is already in the group
    const appointmentUsers = await getAppointmentUser(groupId, userId, storageConnectionString, appointmentUserTableName);
    if (appointmentUsers.length > 0) {
        return res.sendStatus(409);
    }

    // Get appointment and add user to the associated chat thread
    let appointment: Appointment;
    try {
        appointment = await getAppointment(groupId, storageConnectionString, appointmentTableName);

        const identityClient = new CommunicationIdentityClient(acsConnectionString);
        const tokenResponse = await identityClient.issueToken({ communicationUserId: appointment.acsModeratorUserId }, ["chat"]);

        const chatClient = new ChatClient(getEnvironmentUrl(), new AzureCommunicationUserCredential(tokenResponse.token));
        const chatThreadClient = await chatClient.getChatThreadClient(appointment.acsChatThreadId);
        await chatThreadClient.addMembers({
            members: [{
                user: { communicationUserId: user.acsUserId },
                displayName: user.userId,
            }],
        });
    } catch (e) {
        // For this sample, if appointment doesn't exist, create it along with an ACS chat thread
        // If a different system is responsible for creating appointments, this API could return a 404/403
        if (e instanceof UserServiceError && e.type === 'AppointmentNotFound') {
            const identityClient = new CommunicationIdentityClient(acsConnectionString);
            const moderatorUser = await identityClient.createUser();
            const moderatorUserToken = await identityClient.issueToken(moderatorUser, ["chat"]);
            
            const chatClient = new ChatClient(getEnvironmentUrl(), new AzureCommunicationUserCredential(moderatorUserToken.token));
            const chatThreadClient = await chatClient.createChatThread({
                topic: 'Chat',
                members: [
                    { user: { communicationUserId: moderatorUser.communicationUserId } },
                    { user: { communicationUserId: user.acsUserId }, displayName: user.userId, },
                ],
            });

            appointment = {
                appointmentId: groupId,
                acsChatThreadId: chatThreadClient.threadId,
                acsModeratorUserId: moderatorUser.communicationUserId,
            };

            await addAppointment(appointment, storageConnectionString, appointmentTableName);
        } else {
            throw e;
        }
    }

    // Associate user with the group
    await addAppointmentUser(groupId, userId, storageConnectionString, appointmentUserTableName);
   
    return res.sendStatus(201);
});

app.listen(PORT, () => {
    console.log(`[server]: Server is running at https://localhost:${PORT}`);
});
