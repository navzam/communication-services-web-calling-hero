import { connect } from 'react-redux';
import ConfigurationScreen, { ConfigurationScreenProps } from '../components/Configuration';
import { setGroup } from '../core/actions/calls';
import { setUserId } from '../core/actions/sdk';
import { setVideoDeviceInfo, setAudioDeviceInfo } from '../core/actions/devices';
import { initCallClient, updateDevices } from '../core/sideEffects';
import { setMic } from '../core/actions/controls';
import { State } from '../core/reducers';
import { AudioDeviceInfo, VideoDeviceInfo, LocalVideoStream } from '@azure/communication-calling';
import { setLocalVideoStream } from '../core/actions/streams';

/* chat */
import { addUserToThread, isValidThread } from '../core/sideEffects';
import { setAddThreadMemberError } from '../core/actions/ThreadMembersAction';

const mapStateToProps = (state: State, props: ConfigurationScreenProps) => ({
  deviceManager: state.devices.deviceManager,
  callAgent: state.calls.callAgent,
  userId: state.sdk.userId || props.userId,
  group: state.calls.group,
  mic: state.controls.mic,
  screenWidth: props.screenWidth,
  localVideoStream: state.streams.localVideoStream,
  audioDeviceInfo: state.devices.audioDeviceInfo,
  videoDeviceInfo: state.devices.videoDeviceInfo,
  videoDeviceList: state.devices.videoDeviceList,
  audioDeviceList: state.devices.audioDeviceList,
  cameraPermission: state.devices.cameraPermission,
  microphonePermission: state.devices.microphonePermission
});

const mapDispatchToProps = (dispatch: any) => ({
  setLocalVideoStream: (localVideoStream: LocalVideoStream) => dispatch(setLocalVideoStream(localVideoStream)),
  setMic: (mic: boolean) => dispatch(setMic(mic)),
  setAudioDeviceInfo: (deviceInfo: AudioDeviceInfo) => dispatch(setAudioDeviceInfo(deviceInfo)),
  setVideoDeviceInfo: (deviceInfo: VideoDeviceInfo) => dispatch(setVideoDeviceInfo(deviceInfo)),
  initCallClient: (userId: string, unsupportedStateHandler: () => void, endCallHandler: () => void) =>
    dispatch(initCallClient(userId, unsupportedStateHandler, endCallHandler)),
  setUserId: (userId: string) => dispatch(setUserId(userId)),
  setGroup: (groupId: string) => dispatch(setGroup(groupId)),
  updateDevices: () => dispatch(updateDevices()),
  /* chat */
  setup: async (displayName: string, emoji: string, goToNextScreen: Function, userId: string) => {
    await dispatch(addUserToThread(displayName, emoji, userId, goToNextScreen));
  },
  isValidThread: async (threadId: string) => dispatch(isValidThread(threadId)),
  setAddThreadMemberError: async (addThreadMemberError: boolean | undefined) => {
    dispatch(setAddThreadMemberError(addThreadMemberError));
  }
});

const connector: any = connect(mapStateToProps, mapDispatchToProps);
export default connector(ConfigurationScreen);
