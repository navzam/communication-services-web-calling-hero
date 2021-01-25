import {
  Pivot,
  PivotItem,
  Stack,
} from '@fluentui/react';
import React, { Dispatch } from 'react';

import { ChatThread } from '@azure/communication-chat';

import {
  chatHeaderContainerStyle,
  topicNameLabelStyle,
} from './styles/ChatHeader.styles';
import { SidePanelTypes } from './SidePanel';

interface ChatHeaderProps {
  userId: string;
  generateHeaderMessage(): string;
  thread: ChatThread;
  selectedPane: SidePanelTypes;
  setSelectedPane: Dispatch<SidePanelTypes>;
  removeThreadMemberByUserId(userId: string): void;
}

export default (props: ChatHeaderProps): JSX.Element => {
  return (
    <Stack
      className={chatHeaderContainerStyle}
      horizontal={true}
      horizontalAlign="space-between"
    >
      <Stack.Item align="center">
        <div className={topicNameLabelStyle}>Chat</div>
      </Stack.Item>
      <Stack.Item align="center">
        <Stack horizontal={true}>
          <Stack.Item align="center">
            <Pivot
              onKeyDownCapture={(e) => {
                if (
                  (e.target as HTMLElement).id === SidePanelTypes.People &&
                  e.keyCode === 39
                )
                  e.preventDefault();
              }}
              getTabId={(itemKey: string) => itemKey}
              defaultSelectedKey={SidePanelTypes.None}
              selectedKey={props.selectedPane}
            >
              <PivotItem itemKey={SidePanelTypes.None} />
            </Pivot>
          </Stack.Item>
        </Stack>
      </Stack.Item>
    </Stack>
  );
};
