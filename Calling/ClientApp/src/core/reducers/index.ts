import { RemoteParticipant, RemoteVideoStream } from '@azure/communication-calling';
import { combineReducers, Reducer } from 'redux';
import { devicesReducer, DevicesState } from '../reducers/devices';
import { streamsReducer, StreamsState } from './streams';
import { controlsReducer, ControlsState } from './controls';
import { SdkState, sdkReducer } from './sdk';
import { CallsState, callsReducer } from './calls';
import { FilesState, filesReducer } from './files';

/* chat */
import { ContosoReducer, ContosoState } from './ContosoClientReducers';
import { ConversationsReducer, ConversationsState } from './ConversationsReducers';
import { MessagesReducer, MessagesState } from './MessagesReducer';
import { ThreadReducer, ThreadState } from './ThreadReducers';
import { ThreadMembersReducer, ThreadMembersState } from './ThreadMembersReducers';

import { ContosoActionTypes } from '../actions/ContosoClientAction';
import { ConversationsActionTypes } from '../actions/ConversationsAction';
import { MessagesActionTypes } from '../actions/MessagesAction';
import { ThreadActionTypes } from '../actions/ThreadAction';
import { ThreadMembersActionTypes } from '../actions/ThreadMembersAction';

export interface ParticipantStream {
  user: RemoteParticipant;
  stream: RemoteVideoStream | undefined;
}

export interface State {
  calls: CallsState;
  devices: DevicesState;
  streams: StreamsState;
  controls: ControlsState;
  files: FilesState;
  sdk: SdkState;
  /* chat state */
  chat: MessagesState;
  contosoClient: ContosoState;
  conversations: ConversationsState;
  thread: ThreadState;
  threadMembers: ThreadMembersState;

}

type TotalActions =
  | MessagesActionTypes
  | ContosoActionTypes
  | ConversationsActionTypes
  | ThreadActionTypes
  | ThreadMembersActionTypes;

export const reducer: Reducer<State, TotalActions> = combineReducers({
  calls: callsReducer,
  devices: devicesReducer,
  streams: streamsReducer,
  controls: controlsReducer,
  files: filesReducer,
  sdk: sdkReducer,
  /* chat */
  chat: MessagesReducer,
  contosoClient: ContosoReducer,
  conversations: ConversationsReducer,
  thread: ThreadReducer,
  threadMembers: ThreadMembersReducer
});
