// © Microsoft Corporation. All rights reserved.

import React, { useEffect, useState } from 'react';
import { Stack, Spinner, PrimaryButton } from '@fluentui/react';
import LocalPreview from './LocalPreview';
import LocalSettings from './LocalSettings';
import DisplayNameField from './DisplayNameField';
import {
  VideoDeviceInfo,
  AudioDeviceInfo,
  LocalVideoStream,
  DeviceManager,
  CallAgent
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
import { MAXIMUM_LENGTH_OF_NAME } from '../constants';
import {
  CAT,
  // MOUSE,
  // KOALA,
  // OCTOPUS,
  // MONKEY,
  // FOX,
  getThreadId
} from '../Utils/Utils';

export interface ConfigurationScreenProps {
  userId: string;
  groupId: string;
  callAgent: CallAgent;
  deviceManager: DeviceManager;
  setUserId(userId: string): void;
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
  joinChatHandler(): void;
  setup(displayName: string, emoji: string, joinChatHandler: Function, userId: string): void;
  isValidThread(threadId: string | null): any;
  addThreadMemberError: boolean | undefined;
  setAddThreadMemberError(addThreadMemberError: boolean | undefined): void;
}

export default (props: ConfigurationScreenProps): JSX.Element => {
  const spinnerLabel = 'Initializing call client...';
  const buttonText = 'Start call';

  const [name, setName] = useState(props.userId);
  const [emptyWarning, setEmptyWarning] = useState(false);

  const [isJoining, setIsJoining] = useState(false);

  const { userId, groupId, setUserId, initCallClient, setGroup, unsupportedStateHandler, endCallHandler } = props;

  const [isLoadingThread, setIsLoadingThread] = useState(true);

  /* chat */
  const [selectedAvatar ] = useState(CAT);
  const [isNameLengthExceedLimit, setNameLengthExceedLimit] = useState(false);
  const [isValidThread, setIsValidThread] = useState<boolean | undefined>(
    undefined
  );

  const getThreadIdFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const threadId = urlParams.get('threadId');
    console.log('The thread id is ' + threadId);
    return threadId;
  };


  const { addThreadMemberError } = props;

  const validateName = () => {
    if (!name) {
      setEmptyWarning(true);
      setNameLengthExceedLimit(false);
    } else if (name.length > MAXIMUM_LENGTH_OF_NAME) {
      setEmptyWarning(false);
      setNameLengthExceedLimit(true);
    } else {
      setEmptyWarning(false);
      setNameLengthExceedLimit(false);
      if (!isJoining) {
        props.setup(name, selectedAvatar, props.startCallHandler, name);
        setIsJoining(true);
      }
    }
  };

  const isValidThreadProp = props.isValidThread;

  useEffect(() => {
    if (addThreadMemberError) {
      alert(
        "You can't be added at this moment. Please wait at least 60 seconds to try again."
      );
      props.setAddThreadMemberError(undefined);
      setIsJoining(false);
    } else if (addThreadMemberError === false) {
      // props.joinChatHandler();
    }
  }, [addThreadMemberError]);

  useEffect(() => {
    const isValidThread = async () => {
      if (await isValidThreadProp(getThreadId())) {
        setIsValidThread(true);
      } else {
        setIsValidThread(false);
      }
    };
    isValidThread();

  }, [isValidThreadProp]);
  /* end chat */

  useEffect(() => {
    setUserId(userId);
    initCallClient(userId, unsupportedStateHandler, endCallHandler);
    setGroup(groupId);
  }, [userId, groupId, setUserId, initCallClient, setGroup, unsupportedStateHandler, endCallHandler]);

  useEffect(() => {
    let listener: NodeJS.Timeout = setInterval(async () => {
      const threadId = getThreadIdFromUrl();
      if(threadId && !isValidThread){
        setIsLoadingThread(false);
        if (await isValidThreadProp(threadId)) {
          setIsValidThread(true);
        } else {
          setIsValidThread(false);
        }
       }
    }, 500);
    return () => {
      clearInterval(listener);
    };
  }, [isValidThread]);


  const joinCallLoading = () => {
    return (
      <Spinner label={spinnerLabel} ariaLive="assertive" labelPosition="top" />
    );
  };

  const invalidChatThread = () => {
    return (
      <div>
        <p>thread Id is not valid</p>
      </div>
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
            <DisplayNameField 
              setName={setName} 
              name={name} 
              validateName={validateName}
              setNameLengthExceedLimit={setNameLengthExceedLimit}
              isNameLengthExceedLimit={isNameLengthExceedLimit}
              setEmptyWarning={setEmptyWarning} 
              isEmpty={emptyWarning} />
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
                  if (!name) {
                    setEmptyWarning(true);
                  } else {
                    setEmptyWarning(false);
                    props.setUserId(name);
                    props.callAgent.updateDisplayName(name);
                    validateName();
                    // props.startCallHandler();
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
         {isValidThread === false ? invalidChatThread() : joinCallArea()}
      </Stack>
  )};

  return (isJoining || !props.deviceManager || isLoadingThread) ? joinCallLoading() : configurationScreen();
};
