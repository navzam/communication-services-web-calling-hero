import { Stack } from '@fluentui/react';
import React, { useEffect, useState } from 'react';

import ChatArea from '../containers/ChatArea';
import SidePanel from '../containers/SidePanel';
import {
  chatScreenBottomContainerStyle,
  chatScreenContainerStyle,
} from './styles/ChatScreen.styles';
import { SidePanelTypes } from './SidePanel';

import {
  chatHeaderContainerStyle,
  topicNameLabelStyle,
} from './styles/ChatHeader.styles';

interface ChatScreenProps {
  userId: string;
  threadMembersError: boolean;
  endChatHandler(): void;
  errorHandler(): void;
  getThreadMembers(): void;
  getThread(): void;
  getMessages(): void;
}

export default (props: ChatScreenProps): JSX.Element => {
  // People pane will be visible when a chat is joined if the window width is greater than 600
  const [selectedPane, setSelectedPane] = useState(SidePanelTypes.None);

  const { errorHandler, threadMembersError, getThread } = props;

  useEffect(() => {
    props.getMessages();
  }, []);

  useEffect(() => {
    if (threadMembersError) {
      errorHandler();
    }
  }, [errorHandler, threadMembersError]);

  useEffect(() => {
    let listener: NodeJS.Timeout = setInterval(() => {
      getThread();
    }, 2000);
    document.getElementById('sendbox')?.focus();
    return () => {
      clearInterval(listener);
    };
  }, [getThread]);

  return (
    <Stack className={chatScreenContainerStyle}>
      <Stack
          className={chatHeaderContainerStyle}
          horizontal={true}
          horizontalAlign="space-between"
        >
          <Stack.Item align="center">
            <div className={topicNameLabelStyle}>Chat</div>
          </Stack.Item>
    </Stack>
      <Stack className={chatScreenBottomContainerStyle} horizontal={true}>
        <ChatArea endChatHandler={props.endChatHandler} />
        <Stack.Item grow disableShrink>
          <SidePanel
            selectedPane={selectedPane}
            setSelectedPane={setSelectedPane}
          />
        </Stack.Item>
      </Stack>
    </Stack>
  );
};
