// © Microsoft Corporation. All rights reserved.

import React, { useEffect, useState } from 'react';
import { Stack, Spinner, PrimaryButton } from '@fluentui/react';
import LocalPreview from './LocalPreview';
import LocalSettings from './LocalSettings';
import {
  VideoDeviceInfo,
  AudioDeviceInfo,
  LocalVideoStream,
  DeviceManager,
} from '@azure/communication-calling';
import { VideoCameraEmphasisIcon } from '@fluentui/react-icons-northstar';
import {
  videoCameraIconStyle,
  configurationStackTokens,
  buttonStyle,
  localSettingsContainerStyle,
  mainContainerStyle,
  fullScreenStyle,
  verticalStackStyle
} from './styles/Configuration.styles';

/* chat */
import { CAT } from '../Utils/Utils';

export interface ConfigurationScreenProps {
  userId: string | undefined;
  groupId: string;
  deviceManager: DeviceManager;
  initCallClient(userId: string, unsupportedStateHandler: () => void, endCallhandler: () => void): void;
  setGroup(groupId: string): void;
  startCallHandler(): void;
  unsupportedStateHandler: () => void;
  endCallHandler: () => void;
  videoDeviceList: VideoDeviceInfo[];
  audioDeviceList: AudioDeviceInfo[];
  setVideoDeviceInfo(device: VideoDeviceInfo): void;
  setAudioDeviceInfo(device: AudioDeviceInfo): void;
  setMic(mic: boolean): void;
  setLocalVideoStream(stream: LocalVideoStream | undefined): void;
  localVideoRendererIsBusy: boolean;
  videoDeviceInfo: VideoDeviceInfo;
  audioDeviceInfo: AudioDeviceInfo;
  localVideoStream: LocalVideoStream;
  screenWidth: number;
  /* chat */
  setup(displayName: string, emoji: string, joinChatHandler: Function, userId: string, groupId: string): void;
  addThreadMemberError: boolean | undefined;
  setAddThreadMemberError(addThreadMemberError: boolean | undefined): void;
}

export default (props: ConfigurationScreenProps): JSX.Element => {
  const spinnerLabel = 'Initializing call client...';
  const buttonText = 'Start call';

  const [isJoining, setIsJoining] = useState(false);

  const { userId, groupId, initCallClient, setGroup, unsupportedStateHandler, endCallHandler } = props;

  /* chat */
  const [selectedAvatar ] = useState(CAT);

  const { addThreadMemberError } = props;

  useEffect(() => {
    if (addThreadMemberError) {
      alert(
        "You can't be added at this moment. Please wait at least 60 seconds to try again."
      );
      props.setAddThreadMemberError(undefined);
      setIsJoining(false);
    } 
  }, [addThreadMemberError]);

  useEffect(() => {
    setGroup(groupId);
  }, [groupId, setGroup]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    initCallClient(userId, unsupportedStateHandler, endCallHandler);
  }, [userId, initCallClient, unsupportedStateHandler, endCallHandler]);

  const joinCallLoading = () => {
    return (
      <Spinner label={spinnerLabel} ariaLive="assertive" labelPosition="top" />
    );
  };

  const joinCallArea = () => {
    return (
      <Stack
          className={props.screenWidth > 750 ? fullScreenStyle : verticalStackStyle}
          horizontal={props.screenWidth > 750}
          horizontalAlign="center"
          verticalAlign="center"
          tokens={props.screenWidth > 750 ? configurationStackTokens : undefined}
        >
          <LocalPreview
            setMic={props.setMic}
            setLocalVideoStream={props.setLocalVideoStream}
            videoDeviceInfo={props.videoDeviceInfo}
            audioDeviceInfo={props.audioDeviceInfo}
            localVideoStream={props.localVideoStream}
            videoDeviceList={props.videoDeviceList}
            audioDeviceList={props.audioDeviceList}
          />
          <Stack className={localSettingsContainerStyle}>
            <div>
              <LocalSettings
                videoDeviceList={props.videoDeviceList}
                audioDeviceList={props.audioDeviceList}
                audioDeviceInfo={props.audioDeviceInfo}
                videoDeviceInfo={props.videoDeviceInfo}
                setVideoDeviceInfo={props.setVideoDeviceInfo}
                setAudioDeviceInfo={props.setAudioDeviceInfo}
              />
            </div>
            <div>
              <PrimaryButton
                className={buttonStyle}
                onClick={() => {
                  if (!isJoining) {
                    setIsJoining(true);
                    props.setup(props.userId!, selectedAvatar, props.startCallHandler, props.userId!, groupId);
                  }
                }}
              >
                <VideoCameraEmphasisIcon className={videoCameraIconStyle} size="medium" />
                {buttonText}
              </PrimaryButton>
            </div>
          </Stack>
        </Stack>
    );
  };

  const configurationScreen = () => {
    return (
      <Stack className={mainContainerStyle} horizontalAlign="center" verticalAlign="center">
         {joinCallArea()}
      </Stack>
  )};

  return (isJoining || !props.deviceManager) ? joinCallLoading() : configurationScreen();
};
