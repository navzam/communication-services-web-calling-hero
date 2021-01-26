import React from 'react';
import NewLocalSettings from './LocalSettings';
import ParticipantStack from '../containers/ParticipantStack';
import { VideoDeviceInfo, AudioDeviceInfo } from '@azure/communication-calling';
import { Stack } from '@fluentui/react';
import ChatScreen from '../containers/ChatScreen';
import {
  fullHeightStyles,
  paneHeaderStyle,
  settingsContainerStyle,
  paneHeaderTextStyle
} from './styles/CommandPanel.styles';
import Footer from './Footer';
import FilesList from '../containers/FilesList';
import FilesFooter from './FilesFooter';

export interface CommandPanelProps {
  selectedPane: string;
  userId: string;
  videoDeviceInfo: VideoDeviceInfo;
  videoDeviceList: VideoDeviceInfo[];
  audioDeviceList: AudioDeviceInfo[];
  audioDeviceInfo: AudioDeviceInfo;
  setSelectedPane: any;
  setVideoDeviceInfo(device: VideoDeviceInfo): void;
  setAudioDeviceInfo(device: AudioDeviceInfo): void;
  onFileChosen(file: File): unknown;
  onPhotoTaken(dataUrl: string): unknown;
  errorHandler(): void;
}
export enum CommandPanelTypes {
  None = 'none',
  People = 'People',
  Settings = 'Settings',
  Files = 'Files',
  Chat = 'Chat'
}

export default (props: CommandPanelProps): JSX.Element => {

  return (
    <Stack styles={fullHeightStyles}>
      <Stack.Item className={paneHeaderStyle}>
        <div className={paneHeaderTextStyle}>{props.selectedPane}</div>
      </Stack.Item>

        {props.selectedPane === CommandPanelTypes.People && (
          <Stack.Item styles={fullHeightStyles}>
            <ParticipantStack />
          </Stack.Item>
        )}
        {props.selectedPane === CommandPanelTypes.People && (
          <Stack.Item>
            <Footer />
          </Stack.Item>
        )}
        {props.selectedPane === CommandPanelTypes.Chat && (
          <Stack.Item styles={fullHeightStyles}>
            <ChatScreen userId={props.userId} errorHandler={props.errorHandler}/>
          </Stack.Item>
        )}
        {props.selectedPane === CommandPanelTypes.Settings && (
          <Stack.Item>
          <div className={settingsContainerStyle}>
            <NewLocalSettings
              videoDeviceList={props.videoDeviceList}
              audioDeviceList={props.audioDeviceList}
              audioDeviceInfo={props.audioDeviceInfo}
              videoDeviceInfo={props.videoDeviceInfo}
              setVideoDeviceInfo={props.setVideoDeviceInfo}
              setAudioDeviceInfo={props.setAudioDeviceInfo}
            />
          </div>
          </Stack.Item>
        )}
        {props.selectedPane === CommandPanelTypes.Files && (
          <Stack.Item styles={fullHeightStyles}>
            <FilesList showNoFilesMessage={true} />
          </Stack.Item>
        )}
        {props.selectedPane === CommandPanelTypes.Files && (
          <Stack.Item>
            <FilesFooter onFileChosen={props.onFileChosen} onPhotoTaken={props.onPhotoTaken} />
          </Stack.Item>
        )}

    </Stack>
  );
};
