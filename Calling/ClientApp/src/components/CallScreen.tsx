import { Stack } from '@fluentui/react';
import React from 'react';

import GroupCall from '../containers/GroupCall';
import ChatScreen from '../containers/ChatScreen';

interface ChatScreenProps {
    groupId: string;
    userId: string;
    screenWidth: number;
    endCallHandler(): void;
    errorHandler(): void;
  }

export default (props: ChatScreenProps): JSX.Element => {
    return (
        <Stack horizontal verticalFill>
            <Stack.Item>
                <GroupCall
                    endCallHandler={props.endCallHandler}
                    groupId={props.groupId}
                    userId={props.userId}
                    screenWidth={props.screenWidth}
                />
            </Stack.Item>
            <Stack.Item>
                <ChatScreen
                    userId={props.userId}
                    errorHandler={props.errorHandler}
                />
            </Stack.Item>
        </Stack>
    );
 };