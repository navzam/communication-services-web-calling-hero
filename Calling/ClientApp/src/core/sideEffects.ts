import {
  AudioDeviceInfo,
  Call,
  CallClientOptions,
  CommunicationError,
  GroupCallContext,
  JoinCallOptions,
  DeviceManager,
  DeviceAccess,
  PermissionState,
  RemoteParticipant,
  VideoDeviceInfo,
  CallAgent,
  CallClient,
  HangupCallOptions
} from '@azure/communication-calling';
import { AzureCommunicationUserCredential, CommunicationUser, CallingApplication } from '@azure/communication-common';
import { Dispatch } from 'redux';
import { utils, compareMessages } from '../Utils/Utils';
import { callAdded, callRemoved, setCallState, setParticipants, setCallAgent, callRetried } from './actions/calls';
import { setMic, setShareScreen, resetControls } from './actions/controls';
import {
  setAudioDeviceInfo,
  setAudioDeviceList,
  setCameraPermission,
  setMicrophonePermission,
  setVideoDeviceInfo,
  setVideoDeviceList,
  setDeviceManager
} from './actions/devices';
import { addScreenShareStream, resetStreams, removeScreenShareStream } from './actions/streams';
import { setFileImageUrl, setFiles } from './actions/files';
import { State } from './reducers';

/* chat */
import {
  MINIMUM_TYPING_INTERVAL_IN_MILLISECONDS,
  MAXIMUM_INT64,
  PAGE_SIZE,
  INITIAL_MESSAGES_SIZE,
  TOO_MANY_REQUESTS_STATUS_CODE,
  PRECONDITION_FAILED_STATUS_CODE,
  MAXIMUM_RETRY_COUNT,
  COOL_PERIOD_THRESHOLD,
  OK,
  CREATED,
  MULTI_STATUS
} from '../constants';

import {
  ChatClient,
  ChatThreadClient,
  SendReadReceiptRequest,
  ReadReceipt,
  ChatMessage,
  GetChatMessageResponse
} from '@azure/communication-chat';
import { RefreshOptions } from '@azure/communication-common';

import { setMessages, setTypingNotifications, setTypingUsers, setFailedMessages } from './actions/MessagesAction';
import { ChatMessageWithClientMessageId } from './reducers/MessagesReducer';
import { setChatClient, setContosoUser, setContosoUserCoolPeriod } from './actions/ContosoClientAction';
import { setThreadId, setThread } from './actions/ThreadAction';
import { setReceipts } from './actions/ConversationsAction';
import { User } from './reducers/ContosoClientReducers';

import {
  setThreadMembers,
  setThreadMembersError,
  setRemoveThreadMemberError,
  setAddThreadMemberError
} from './actions/ThreadMembersAction';

export const setMicrophone = (mic: boolean) => {
  return async (dispatch: Dispatch, getState: () => State) => {
    const state = getState();

    if (state === undefined || state.calls.call === undefined) {
      console.error('state or state.controls.mic is null');
      return;
    }

    try {
      if (!state.controls.mic) {
        await state.calls.call.unmute();
      } else {
        await state.calls.call.mute();
      }

      dispatch(setMic(mic));
    } catch (e) {
      console.error(e);
    }
  };
};

export const setShareUnshareScreen = (shareScreen: boolean) => {
  return async (dispatch: Dispatch, getState: () => State) => {
    const state = getState();

    if (state === undefined || state.calls.call === undefined) {
      console.error('state or state.controls.shareScreen is null');
      return;
    }

    try {
      if (!state.controls.shareScreen) {
        await state.calls.call.startScreenSharing();
      } else {
        await state.calls.call.stopScreenSharing();
      }

      dispatch(setShareScreen(shareScreen));
    } catch (e) {
      console.error(e);
    }
  };
};

export const updateDevices = () => {
  return async (dispatch: Dispatch, getState: () => State) => {
    let state = getState();
    let deviceManager = state.devices.deviceManager;

    if (deviceManager == null) {
      console.error('no device manager available');
      return;
    }

    const cameraList: VideoDeviceInfo[] = await deviceManager.getCameraList();

    dispatch(setVideoDeviceList(cameraList));

    const microphoneList: AudioDeviceInfo[] = await deviceManager.getMicrophoneList();

    dispatch(setAudioDeviceList(microphoneList));
  };
};

export const initCallClient = (userId: string, unsupportedStateHandler: () => void, endCallHandler: () => void) => {
  return async (dispatch: Dispatch, getState: () => State) => {
    try {
      const tokenResponse = await utils.getTokenForUser(userId);

      const options: CallClientOptions = {};

      const userToken = tokenResponse.value.token;

      /* chat */
      // await createThread(getState);

      var callClient;

      // check if chrome on ios OR firefox browser
      if (utils.isOnIphoneAndNotSafari() || utils.isUnsupportedBrowser()) {
        unsupportedStateHandler();
        return;
      }

      try {
        callClient = new CallClient(options);
      } catch (e) {
        unsupportedStateHandler();
        return;
      }

      if (!callClient) {
        return;
      }

      const tokenCredential = new AzureCommunicationUserCredential(userToken);
      let callAgent: CallAgent = await callClient.createCallAgent(tokenCredential);

      if (callAgent === undefined) {
        return;
      }

      callAgent.updateDisplayName(userId);

      let deviceManager: DeviceManager = await callClient.getDeviceManager();

      dispatch(setDeviceManager(deviceManager));
      dispatch(setCallAgent(callAgent));

      subscribeToDeviceManager(deviceManager, dispatch, getState);

      callAgent.on('callsUpdated', (e: { added: Call[]; removed: Call[] }): void => {
        e.added.forEach((addedCall) => {
          const state = getState();
          if (state.calls.call && addedCall.isIncoming) {
            addedCall.reject();
            return;
          }

          dispatch(callAdded(addedCall));

          addedCall.on('callStateChanged', (): void => {
            dispatch(setCallState(addedCall.state));
          });

          addedCall.on('isScreenSharingOnChanged', (): void => {
            dispatch(setShareScreen(addedCall.isScreenSharingOn));
          });

          addedCall.on('remoteParticipantsUpdated', (ev): void => {
            ev.added.forEach((addedRemoteParticipant) => {
              console.log('participantAdded', addedRemoteParticipant);
              subscribeToParticipant(addedRemoteParticipant, addedCall, dispatch, getState);
              dispatch(setParticipants([...addedCall.remoteParticipants.values()]));
            });

            // we don't use the actual value we are just going to reset the remoteParticipants based on the call
            if (ev.removed.length > 0) {
              console.log('participantRemoved');
              dispatch(setParticipants([...addedCall.remoteParticipants.values()]));
            }
          });

          const rp = [...addedCall.remoteParticipants.values()];
          rp.forEach((v) => subscribeToParticipant(v, addedCall, dispatch, getState));
          dispatch(setParticipants(rp));
          dispatch(setCallState(addedCall.state));
        });
        e.removed.forEach((removedCall) => {
          const state = getState();

          dispatch(callRetried(state.calls.attempts + 1));

          if (state.calls.call && state.calls.call === removedCall) {
            dispatch(callRemoved(removedCall, state.calls.group));
            dispatch(resetControls());
            dispatch(resetStreams());
          }
        });
      });
    } catch (e) {
      console.error(e);
    }
  };
};

// what does the forEveryone parameter really mean?
export const endCall = async (call: Call, options: HangupCallOptions) => {
  call.hangUp(options).catch((e: CommunicationError) => console.error(e));
};

export const joinGroup = async (callAgent: CallAgent, context: GroupCallContext, callOptions: JoinCallOptions) => {
  try {
    await callAgent.join(context, callOptions);
  } catch (e) {
    console.log('Failed to join a call', e);
    return;
  }
};

export const addParticipant = async (call: Call, user: CommunicationUser | CallingApplication) => {
  call.addParticipant(user);
};

export const removeParticipant = async (call: Call, user: CommunicationUser | CallingApplication) => {
  call.removeParticipant(user).catch((e: CommunicationError) => console.error(e));
};

const subscribeToParticipant = (
  participant: RemoteParticipant,
  call: Call,
  dispatch: Dispatch,
  getState: () => State
) => {
  const userId = utils.getId(participant.identifier);
  participant.on('participantStateChanged', () => {
    console.log('participant stateChanged', userId, participant.state);
    dispatch(setParticipants([...call.remoteParticipants.values()]));
  });

  participant.on('isSpeakingChanged', () => {
    dispatch(setParticipants([...call.remoteParticipants.values()]));
  });

  participant.on('videoStreamsUpdated', (e): void => {
    e.added.forEach((addedStream) => {
      if (addedStream.type === 'Video') {
        return;
      }
      addedStream.on('availabilityChanged', () => {
        if (addedStream.isAvailable) {
          dispatch(addScreenShareStream(addedStream, participant));
        } else {
          dispatch(removeScreenShareStream(addedStream, participant));
        }
      });

      if (addedStream.isAvailable) {
        dispatch(addScreenShareStream(addedStream, participant));
      }
    });
  });
};

const updateAudioDevices = async (deviceManager: DeviceManager, dispatch: Dispatch, getState: () => State) => {
  const microphoneList: AudioDeviceInfo[] = await deviceManager.getMicrophoneList();
  dispatch(setAudioDeviceList(microphoneList));

  const state = getState();
  if (state.devices.audioDeviceInfo === undefined && microphoneList.length > 0) {
    dispatch(setAudioDeviceInfo(microphoneList[0]));
    deviceManager.setMicrophone(microphoneList[0]);
  } else if (
    state.devices.audioDeviceInfo &&
    !utils.isSelectedAudioDeviceInList(state.devices.audioDeviceInfo, microphoneList)
  ) {
    deviceManager.setMicrophone(state.devices.audioDeviceInfo);
  }
};

const updateVideoDevices = async (deviceManager: DeviceManager, dispatch: Dispatch, getState: () => State) => {
  const cameraList: VideoDeviceInfo[] = deviceManager.getCameraList();
  dispatch(setVideoDeviceList(cameraList));

  const state = getState();
  if (state.devices.videoDeviceInfo === undefined) {
    dispatch(setVideoDeviceInfo(cameraList[0]));
  } else if (
    state.devices.videoDeviceInfo &&
    !utils.isSelectedVideoDeviceInList(state.devices.videoDeviceInfo, cameraList)
  ) {
    dispatch(setVideoDeviceInfo(state.devices.videoDeviceInfo));
  }
};

const subscribeToDeviceManager = async (deviceManager: DeviceManager, dispatch: Dispatch, getState: () => State) => {
  // listen for any new events
  deviceManager.on('permissionStateChanged', async () => {
    const cameraPermissionState: PermissionState = await deviceManager.getPermissionState('Camera');
    dispatch(setCameraPermission(cameraPermissionState));

    const microphonePermissionState: PermissionState = await deviceManager.getPermissionState('Microphone');
    dispatch(setMicrophonePermission(microphonePermissionState));
  });

  deviceManager.on('videoDevicesUpdated', async () => {
    updateVideoDevices(deviceManager, dispatch, getState);
  });

  deviceManager.on('audioDevicesUpdated', async () => {
    updateAudioDevices(deviceManager, dispatch, getState);
  });

  deviceManager.askDevicePermission(true, true).then((e: DeviceAccess) => {
    if (e.audio !== undefined) {
      if (e.audio) {
        dispatch(setMicrophonePermission('Granted'));

        updateAudioDevices(deviceManager, dispatch, getState);
      } else {
        dispatch(setMicrophonePermission('Denied'));
      }
    }

    if (e.video !== undefined) {
      if (e.video) {
        dispatch(setCameraPermission('Granted'));
        updateVideoDevices(deviceManager, dispatch, getState);
      } else {
        dispatch(setCameraPermission('Denied'));
      }
    }
  });
};

export const getFiles = async (dispatch: Dispatch, getState: () => State) => {
  const state = getState();
  const userId = state.sdk.userId;
  if (userId === undefined) {
    console.error(`Failed to make getFiles() API call because userId is undefined`);
    return;
  }

  const response = await fetch(`/groups/${state.calls.group}/files`, { headers: { 'Authorization': userId } });
  const responseJson: { id: string, name: string, uploadDateTime: string }[] = await response.json();
  const files = responseJson.map(item => ({ id: item.id, filename: item.name, }));

  dispatch(setFiles(files));

  const imageFiles = responseJson.filter(item => item.name.toLowerCase().endsWith('.png') || item.name.toLowerCase().endsWith('.jpg'));
  const currentFiles = state.files.files;
  for (const imageFile of imageFiles) {
    // Skip this image file if we already have an image URL for it
    if (currentFiles.has(imageFile.id) && currentFiles.get(imageFile.id)!.imageUrl !== null) continue;
    // TODO: should this be dispatched?
    (dispatch as any)(getFile(imageFile.id));
    // getFile(imageFile.id)(dispatch, getState);
  }
};

export const getFile = (fileId: string) => {
  return async (dispatch: Dispatch, getState: () => State) => {
    const state = getState();
    const userId = state.sdk.userId;
    if (userId === undefined) {
      console.error(`Failed to make getFiles() API call because userId is undefined`);
      return;
    }

    const response = await fetch(`/groups/${state.calls.group}/files/${fileId}`, { headers: { 'Authorization': userId } });
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    // Update files with new image URLs
    dispatch(setFileImageUrl(fileId, objectUrl));
  };
};

export const sendFile = (file: File) => {
  return async (dispatch: Dispatch, getState: () => State) => {
    const state = getState();
    const userId = state.sdk.userId;
    if (userId === undefined) {
      console.error(`Failed to make getFiles() API call because userId is undefined`);
      return;
    }

    const data = new FormData();
    data.append('file', file);
    data.append('fileName', file.name);
    data.append('groupId', state.calls.group);
    let sendFileRequestOptions = {
      method: 'POST',
      body: data,
      headers: {
        'Authorization': userId
      }
    };

    try {
      let sendFileResponse = await fetch(`/groups/${state.calls.group}/files`, sendFileRequestOptions);
      return sendFileResponse.ok;
    } catch (error) {
      console.error('Failed at sending file, Error: ', error);
      return false;
    }
  }
};

export const sendImage = (dataUrl: string) => {
  return async (dispatch: Dispatch, getState: () => State) => {
    const base64String = dataUrl.replace(/^data:image\/(png|jpg);base64,/, '');

    const state = getState();
    const userId = state.sdk.userId;
    if (userId === undefined) {
      console.error(`Failed to make getFiles() API call because userId is undefined`);
      return;
    }
    
    const data = new FormData();
    data.append('image', base64String);
    data.append('fileName', 'user_photo.png');
    data.append('groupId', state.calls.group);
    let sendFileRequestOptions = {
      method: 'POST',
      body: data,
      headers: {
        'Authorization': userId
      }
    };

    try {
      let sendFileResponse = await fetch(`/groups/${state.calls.group}/files`, sendFileRequestOptions);
      return sendFileResponse.ok;
    } catch (error) {
      console.error('Failed at sending image, Error: ', error);
      return false;
    }
  }
};

/**
 * Chat functionality
 */
// This function sets up the user to chat with the thread
const addUserToThread =  (displayName: string, emoji: string, userId: string, goToNextScreen: Function) => async (dispatch: Dispatch, getState: () => State) => {
  let state: State = getState();
  if (state.thread.threadId === undefined) {
    // todo: fix
    console.error('Thread Id not created yet');
    return;
  }
  let threadId: string = state.thread.threadId;

  // get environment url from server
  let environmentUrl = await getEnvironmentUrl(userId);

  if (environmentUrl === undefined) {
    console.error('unable to get environment url from server');
    return;
  }
  // create our user
  const tokenResponse = await utils.getTokenForUser(userId);
  const userToken = tokenResponse.value.token;
  // let userToken = await getToken();

  if (userToken === undefined) {
    console.error('unable to get a token');
    return;
  }

 let options: RefreshOptions = {
  initialToken: userToken,
  tokenRefresher:  () => refreshTokenAsync(tokenResponse.value.user.id),
  refreshProactively: true
 }

  let userAccessTokenCredentialNew = new AzureCommunicationUserCredential(options);
  let chatClient = new ChatClient(environmentUrl, userAccessTokenCredentialNew);

  // subscribe for message, typing indicator, and read receipt
  let chatThreadClient = await chatClient.getChatThreadClient(threadId);
  subscribeForMessage(chatClient, dispatch, getState);
  subscribeForTypingIndicator(chatClient, dispatch);
  subscribeForReadReceipt(chatClient, chatThreadClient, dispatch, getState);

  dispatch(setThreadId(threadId));
  console.log("____contoso user id: " + tokenResponse.value.user.id);
  console.log("____contoso token: " + userToken);
  console.log("____contoso displayname: " + displayName);
  dispatch(setContosoUser(tokenResponse.value.user.id, userToken, displayName));
  dispatch(setChatClient(chatClient));


  await addThreadMemberHelper(
    threadId,
    {
      identity: tokenResponse.value.user.id,
      token: userToken,
      displayName: displayName,
      memberRole: 'User'
    },
    dispatch
  );

  goToNextScreen();
};

const subscribeForTypingIndicator = async (chatClient: ChatClient, dispatch: Dispatch) => {
  await chatClient.startRealtimeNotifications();
  chatClient.on('typingIndicatorReceived', async (event) => {
    dispatch(
      setTypingNotifications(event.sender.communicationUserId, {
        from: event.sender.communicationUserId,
        originalArrivalTime: Date.parse(event.receivedOn),
        recipientId: event.recipient.communicationUserId,
        threadId: event.threadId,
        version: event.version
      })
    );
  });
};

const subscribeForMessage = async (chatClient: ChatClient, dispatch: Dispatch, getState: () => State) => {
  await chatClient.startRealtimeNotifications();
  chatClient.on('chatMessageReceived', async (event) => {
    let state: State = getState();
    let messages: any = state.chat.messages !== undefined ? state.chat.messages : [];
    if (event.sender.communicationUserId !== state.contosoClient.user.identity) {
      // not user's own message
      messages.push(event);
      dispatch(setMessages(messages.sort(compareMessages)));
    }
  });
};

const subscribeForReadReceipt = async (
  chatClient: ChatClient,
  chatThreadClient: ChatThreadClient,
  dispatch: Dispatch,
  getState: () => State
) => {
  await chatClient.startRealtimeNotifications();
  chatClient.on('readReceiptReceived', async (event) => {
    let receipts: ReadReceipt[] = [];
    for await (let page of chatThreadClient.listReadReceipts().byPage()) {
      for (const receipt of page) {
        receipts.push(receipt);
      }
    }
    dispatch(setReceipts(receipts));
  });
};

const sendTypingNotification = () => async (dispatch: Dispatch, getState: () => State) => {
  let state: State = getState();
  let chatClient = state.contosoClient.chatClient;
  if (chatClient === undefined) {
    console.error('Chat Client not created yet');
    return;
  }
  let threadId = state.thread.threadId;
  if (threadId === undefined) {
    console.error('Thread Id not created yet');
    return;
  }
  await sendTypingNotificationHelper(await chatClient.getChatThreadClient(threadId));
};

const updateTypingUsers = () => async (dispatch: Dispatch, getState: () => State) => {
  let typingUsers = [];
  let state: State = getState();
  let typingNotifications = state.chat.typingNotifications;
  for (let id in typingNotifications) {
    let typingNotification = typingNotifications[id];
    if (!typingNotification.originalArrivalTime) {
      continue;
    }
    if (shouldDisplayTyping(typingNotification.originalArrivalTime)) {
      let threadMember = state.threadMembers.threadMembers.find(
        (threadMember) => threadMember.user.communicationUserId === id
      );
      if (threadMember) {
        typingUsers.push(threadMember);
      }
    }
  }
  dispatch(setTypingUsers(typingUsers));
};

const shouldDisplayTyping = (lastReceivedTypingEventDate: number) => {
  let currentDate = new Date();
  let timeSinceLastTypingNotificationMs = currentDate.getTime() - lastReceivedTypingEventDate;
  return timeSinceLastTypingNotificationMs <= MINIMUM_TYPING_INTERVAL_IN_MILLISECONDS;
};

const sendMessage = (messageContent: string) => async (dispatch: Dispatch, getState: () => State) => {
  let state: State = getState();
  let chatClient = state.contosoClient.chatClient;
  if (chatClient === undefined) {
    console.error('Chat Client not created yet');
    return;
  }
  let threadId = state.thread.threadId;
  if (threadId === undefined) {
    console.error('Thread Id not created yet');
    return;
  }
  let displayName = state.contosoClient.user.displayName;
  let userId = state.contosoClient.user.identity;

  let clientMessageId = (Math.floor(Math.random() * MAXIMUM_INT64) + 1).toString(); //generate a random unsigned Int64 number
  let newMessage = {
    content: messageContent,
    clientMessageId: clientMessageId,
    sender: { communicationUserId: userId },
    senderDisplayName: displayName,
    threadId: threadId,
    createdOn: undefined
  };
  let messages = getState().chat.messages;
  messages.push(newMessage);
  dispatch(setMessages(messages));
  await sendMessageHelper(
    await chatClient.getChatThreadClient(threadId),
    threadId,
    messageContent,
    displayName,
    clientMessageId,
    dispatch,
    0,
    getState
  );
};

const isValidThread = (threadId: string) => async (dispatch: Dispatch) => {
  try {
    let validationRequestOptions = { method: 'GET' };

    let validationResponse = await fetch('/isValidThread/' + threadId, validationRequestOptions);
    if (validationResponse.status === 200) {
      dispatch(setThreadId(threadId));
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Failed at getting isThreadIdValid, Error: ', error);
    return false;
  }
};

const getMessages = () => async (dispatch: Dispatch, getState: () => State) => {
  let state: State = getState();
  let chatClient = state.contosoClient.chatClient;
  if (chatClient === undefined) {
    console.error('Chat Client not created yet');
    return;
  }
  let threadId = state.thread.threadId;
  if (threadId === undefined) {
    console.error('Thread Id not created yet');
    return;
  }
  let messages = await getMessagesHelper(await chatClient.getChatThreadClient(threadId), threadId);
  if (messages === undefined) {
    console.error('unable to get messages');
    return;
  }
  return dispatch(setMessages(messages.reverse()));
};

const createThread = async () => {
  let threadId = await createThreadHelper();
  if (threadId !== null) {
    if (window.history.pushState) {
      var queryParams = window.location.search? window.location.search + `&threadId=${threadId}`: `?threadId=${threadId}`
      var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + queryParams;
      window.history.pushState({path:newurl},'',newurl);
  }
    // window.location.href += `?threadId=${threadId}`;
  } else {
    console.error('unable to generate a new chat thread');
  }
};

const addThreadMember = () => async (dispatch: Dispatch, state: State) => {

  let user = state.contosoClient.user;
  let threadId = state.thread.threadId;

  if (threadId === undefined) {
    console.error('Thread Id not created yet');
    return;
  }
  await addThreadMemberHelper(
    threadId,
    {
      identity: user.identity,
      token: user.token,
      displayName: user.displayName,
      memberRole: 'User'
    },
    dispatch
  );
};

const removeThreadMemberByUserId = (userId: string) => async (dispatch: Dispatch, getState: () => State) => {
  let state: State = getState();
  let chatClient = state.contosoClient.chatClient;
  let threadId = state.thread.threadId;
  if (chatClient === undefined) {
    console.error("Chat client doesn't created yet");
    return;
  }
  if (threadId === undefined) {
    console.error('Thread Id not created yet');
    return;
  }
  let chatThreadClient = await chatClient.getChatThreadClient(threadId);
  let response = await chatThreadClient.removeMember({
    communicationUserId: userId
  });
  if (response._response.status === TOO_MANY_REQUESTS_STATUS_CODE) {
    dispatch(setRemoveThreadMemberError(true));
  }
};

const getThreadMembers = () => async (dispatch: Dispatch, getState: () => State) => {
  let state: State = getState();
  let chatClient = state.contosoClient.chatClient;
  if (chatClient === undefined) {
    console.error('Chat Client not created yet');
    return;
  }
  let threadId = state.thread.threadId;
  if (threadId === undefined) {
    console.error('Thread Id not created yet');
    return;
  }
  let chatThreadClient = await chatClient.getChatThreadClient(threadId);
  let threadMembers = await getThreadMembersHelper(chatThreadClient);
  if (threadMembers === undefined) {
    console.error('unable to get members in the thread');
    dispatch(setThreadMembersError(true));
    return;
  }
  dispatch(setThreadMembers(threadMembers));
};

const getThread = () => async (dispatch: Dispatch, getState: () => State) => {
  let state: State = getState();
  let chatClient = state.contosoClient.chatClient;
  if (chatClient === undefined) {
    console.error('Chat Client not created yet');
    return;
  }
  let threadId = state.thread.threadId;
  if (threadId === undefined) {
    console.error('Thread Id not created yet');
    return;
  }
  let thread = await getThreadHelper(chatClient, threadId);
  if (thread === undefined) {
    console.error('unable to get thread');
    return;
  }
  if (thread.members === undefined) {
    console.error('unable to get members in the thread');
    return;
  } else {
    if (
      thread.members.find((member) => member.user.communicationUserId === state.contosoClient.user.identity) ===
      undefined
    ) {
      console.error('user has been removed from the thread');
      dispatch(setThreadMembersError(true));
      return;
    }
    dispatch(setThreadMembers(thread.members.filter((threadMember) => threadMember.displayName !== undefined)));
  }
  dispatch(setThread(thread));
};

const updateThreadTopicName = (topicName: string, setIsSavingTopicName: React.Dispatch<boolean>) => async (
  dispatch: Dispatch,
  getState: () => State
) => {
  let state: State = getState();
  let chatClient = state.contosoClient.chatClient;
  if (chatClient === undefined) {
    console.error('Chat Client not created yet');
    return;
  }
  let threadId = state.thread.threadId;
  if (threadId === undefined) {
    console.error('Thread Id not created yet');
    return;
  }
  updateThreadTopicNameHelper(await chatClient.getChatThreadClient(threadId), topicName, setIsSavingTopicName);
};

// Thread Helper
const createThreadHelper = async () => {
  try {
    // let body = {
    //   id: user.identity,
    //   displayName: user.displayName
    // };
    // let addMemberRequestOptions = {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(body)
    // };
    let createThreadRequestOptions = { method: 'POST'};
    let createThreadResponse = await fetch('/createThread', createThreadRequestOptions);

    let threadId = await createThreadResponse.text();
    return threadId;
  } catch (error) {
    console.error('Failed at creating thread, Error: ', error);
    return;
  }
};

const getThreadHelper = async (chatClient: ChatClient, threadId: string) => {
  try {
    return await chatClient.getChatThread(threadId);
  } catch (error) {
    console.error('Failed at getting thread, Error: ', error);
    return;
  }
};

const updateThreadTopicNameHelper = async (
  chatThreadClient: ChatThreadClient,
  topicName: string,
  setIsSavingTopicName: React.Dispatch<boolean>
) => {
  try {
    let updateThreadRequest = {
      topic: topicName
    };
    await chatThreadClient.updateThread(updateThreadRequest);
    setIsSavingTopicName(false);
  } catch (error) {
    console.error('Failed at updating thread property, Error: ', error);
  }
};

// Thread Member Helper
const addThreadMemberHelper = async (threadId: string, user: User, dispatch: Dispatch) => {
  try {
    let body = {
      id: user.identity,
      displayName: user.displayName
    };
    let addMemberRequestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': user.displayName},
      body: JSON.stringify(body)
    };
    let response = await fetch('/addUser/' + threadId, addMemberRequestOptions);
    dispatch(setAddThreadMemberError(response.status !== MULTI_STATUS));
  } catch (error) {
    console.error('Failed at adding thread member, Error: ', error);
  }
};

const getThreadMembersHelper = async (chatThreadClient: ChatThreadClient) => {
  try {
    let threadMembers = [];
    for await (let page of chatThreadClient.listMembers().byPage()) {
      for (const threadMember of page) {
        threadMembers.push(threadMember);
      }
    }
    return threadMembers.filter((threadMember) => threadMember.displayName !== undefined)!;
  } catch (error) {
    console.error('Failed at getting members, Error: ', error);
    return [];
  }
};

// Message Helper
const sendMessageHelper = async (
  chatThreadClient: ChatThreadClient,
  threadId: string,
  messageContent: string,
  displayName: string,
  clientMessageId: string,
  dispatch: Dispatch,
  retryCount: number,
  getState: () => State
) => {
  let failedMessages = getState().chat.failedMessages;
  try {
    let SendMessageRequest = {
      content: messageContent,
      senderDisplayName: displayName
    };
    chatThreadClient.sendMessage(SendMessageRequest).then(async (res) => {
      if (res._response.status === CREATED) {
        if (res.id) {
          let message: ChatMessage | undefined = await getMessageHelper(chatThreadClient, res.id, dispatch);
          if (message) {
            updateMessagesArray(dispatch, getState, {
              ...message,
              clientMessageId
            });
          } else {
            updateMessagesArray(dispatch, getState, {
              clientMessageId: clientMessageId,
              createdOn: new Date(),
              id: res.id
            });
          }
        }
      } else if (res._response.status === TOO_MANY_REQUESTS_STATUS_CODE) {
        dispatch(setContosoUserCoolPeriod(new Date()));
        // retry after cool period
        setTimeout(() => {
          sendMessageHelper(
            chatThreadClient,
            threadId,
            messageContent,
            displayName,
            clientMessageId,
            dispatch,
            retryCount,
            getState
          );
        }, COOL_PERIOD_THRESHOLD);
      } else if (res._response.status === PRECONDITION_FAILED_STATUS_CODE) {
        if (retryCount >= MAXIMUM_RETRY_COUNT) {
          console.error('Failed at sending message and reached max retry count');
          failedMessages.push(clientMessageId);
          setFailedMessages(failedMessages);
          return;
        }
        // retry in 0.2s
        setTimeout(() => {
          sendMessageHelper(
            chatThreadClient,
            threadId,
            messageContent,
            displayName,
            clientMessageId,
            dispatch,
            retryCount + 1,
            getState
          );
        }, 200);
      } else {
        failedMessages.push(clientMessageId);
        setFailedMessages(failedMessages);
      }
    });
  } catch (error) {
    console.error('Failed at sending message, Error: ', error);
    failedMessages.push(clientMessageId);
    setFailedMessages(failedMessages);
  }
};

const updateMessagesArray = async (
  dispatch: Dispatch,
  getState: () => State,
  newMessage: ChatMessageWithClientMessageId
) => {
  let state: State = getState();
  let messages: ChatMessageWithClientMessageId[] = state.chat.messages !== undefined ? state.chat.messages : [];
  messages = messages.map((message: ChatMessageWithClientMessageId) => {
    if (message.clientMessageId === newMessage.clientMessageId) {
      return {
        ...message,
        ...newMessage
      };
    } else {
      return message;
    }
  });
  dispatch(setMessages(messages.sort(compareMessages)));
};

const getMessageHelper = async (chatThreadClient: ChatThreadClient, messageId: string, dispatch: Dispatch) => {
  try {
    let messageResponse: GetChatMessageResponse = await chatThreadClient.getMessage(messageId);
    if (messageResponse._response.status === OK) {
      let chatMessage: ChatMessage = messageResponse;
      return chatMessage;
    } else if (messageResponse._response.status === TOO_MANY_REQUESTS_STATUS_CODE) {
      return undefined;
    }
    return;
  } catch (error) {
    console.error('Failed at getting messages, Error: ', error);
    return;
  }
};

const getMessagesHelper = async (chatThreadClient: ChatThreadClient, threadId: string) => {
  try {
    let messages: ChatMessage[] = [];
    let getMessagesResponse = await chatThreadClient.listMessages({
      maxPageSize: PAGE_SIZE
    });

    let messages_temp = [];

    for await (let page of getMessagesResponse.byPage()) {
      for (const message of page) {
        messages_temp.push(message);
      }
    }

    while (true) {
      if (messages_temp === undefined) {
        console.error('Unable to get messages from server');
        return;
      }

      // filter and only return top 100 text messages
      messages.push(...messages_temp.filter((message) => message.type === 'Text'));
      if (messages.length >= INITIAL_MESSAGES_SIZE) {
        return messages.slice(0, INITIAL_MESSAGES_SIZE);
      }
      // if there is no more messages
      break;
    }

    return messages.slice(0, INITIAL_MESSAGES_SIZE);
  } catch (error) {
    console.error('Failed at getting messages, Error: ', error);
    return;
  }
};

// Typing Notification Helper
const sendTypingNotificationHelper = async (chatThreadClient: ChatThreadClient) => {
  try {
    await chatThreadClient.sendTypingNotification();
  } catch (error) {
    console.error('Failed at sending typing notification, Error: ', error);
  }
};

const getEnvironmentUrl = async (userId: string) => {
  try {
    let getRequestOptions = {
      method: 'GET',
      headers: { 'Authorization': userId }
    };
    let response = await fetch('/getEnvironmentUrl', getRequestOptions);
    return response.text().then((environmentUrl) => environmentUrl);
  } catch (error) {
    console.error('Failed at getting environment url, Error: ', error);
    return;
  }
};

// Token Helper
// delete
// const getToken = async () => {
//   try {
//     let getTokenRequestOptions = {
//       method: 'POST'
//     };
//     let getTokenResponse = await fetch('/token', getTokenRequestOptions);
//     return getTokenResponse.json().then((_responseJson) => _responseJson);
//   } catch (error) {
//     console.error('Failed at getting token, Error: ', error);
//     return;
//   }
// };

const refreshTokenAsync = async (userIdentity: string) : Promise<string>=> {
  return new Promise<string>((resolve, reject) => {
    return fetch('/refreshToken/'+ userIdentity).then(response => {
      if (response.ok) {
        resolve(response.json().then(json => json.token))
      } else {
        reject(new Error('error'))
      }
    }, error => {
      reject(new Error(error.message))
    })
  })
}

const setEmoji = async (userId: string, emoji: string) => {
  try {
    let getTokenRequestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Emoji: emoji })
    };
    await (await fetch('/userConfig/' + userId, getTokenRequestOptions)).json;
  } catch (error) {
    console.error('Failed at setting emoji, Error: ', error);
  }
};

const getEmoji = async (userId: string) => {
  try {
    let getTokenRequestOptions = {
      headers: { 'Content-Type': 'application/json' },
      method: 'GET'
    };
    return await (await fetch('/userConfig/' + userId, getTokenRequestOptions)).json();
  } catch (error) {
    console.error('Failed at getting emoji, Error: ', error);
    return;
  }
};

const sendReadReceipt = (messageId: string) => async (dispatch: Dispatch, getState: () => State) => {
  // This is sent when we get focus to this tab and see this message
  let state: State = getState();
  let chatClient = state.contosoClient.chatClient;
  if (chatClient === undefined) {
    console.error('Chat Client not created yet');
    return;
  }
  let threadId = state.thread.threadId;
  if (threadId === undefined) {
    console.error('Thread Id not created yet');
    return;
  }
  await sendReadReceiptHelper(await chatClient.getChatThreadClient(threadId), messageId);
};

const sendReadReceiptHelper = async (chatThreadClient: ChatThreadClient, messageId: string) => {
  let postReadReceiptRequest: SendReadReceiptRequest = {
    chatMessageId: messageId
  };
  await chatThreadClient.sendReadReceipt(postReadReceiptRequest);
};

export {
  sendMessage,
  getMessages,
  createThread,
  addThreadMember,
  getThreadMembers,
  addUserToThread,
  removeThreadMemberByUserId,
  getEmoji,
  setEmoji,
  sendReadReceipt,
  sendTypingNotification,
  updateTypingUsers,
  isValidThread,
  updateThreadTopicName,
  getThread
};
