// © Microsoft Corporation. All rights reserved.
import React, { useEffect, useState } from 'react';
import { Stack, PrimaryButton, Icon, Image, IImageStyles, /*Spinner*/ } from '@fluentui/react';
import { VideoCameraEmphasisIcon } from '@fluentui/react-icons-northstar';
import heroSVG from '../assets/hero.svg';
import {
  imgStyle,
  containerTokens,
  listStyle,
  iconStyle,
  headerStyle,
  upperStackTokens,
  videoCameraIconStyle,
  buttonStyle,
  nestedStackTokens,
  upperStackStyle, listItemStyle
} from './styles/HomeScreen.styles';
import DisplayNameField from './DisplayNameField';
import { MAXIMUM_LENGTH_OF_NAME } from '../constants';

export interface HomeScreenProps {
  startCallHandler(): void;
  setUser(userId: string): void;
  // createThreadHandler(): void;
  userId?: string;
}

const imageStyleProps: IImageStyles = {
  image: {
    height: '100%',
    width: '100%'
  },
  root: {}
};

const createRandomUserId = () => 'user' + Math.ceil(Math.random() * 1000);

export default (props: HomeScreenProps): JSX.Element => {
  const [name, setName] = useState(createRandomUserId());
  const [emptyWarning, setEmptyWarning] = useState(false);
  const [isNameLengthExceedLimit, setNameLengthExceedLimit] = useState(false);
  const [isUserCreateInProgress, setIsUserCreateInProgress] = useState(false);
  
  const iconName = 'SkypeCircleCheck';
  const imageProps = { src: heroSVG.toString() };
  const headerTitle = 'Exceptionally simple video calling';
  const startCallButtonText = 'Start a call';
  // const spinnerLabel = 'Initializing client...';
  const listItems = [
    'Customize with your web stack',
    'Connect with users with seamless collaboration across web',
    'High quality, low latency capabilities for an uninterrupted calling experience',
    'Learn about this'
  ];

  useEffect(() => {
    if (props.userId) {
      props.startCallHandler();
    }
  }, [props.userId]);

  // const [isCreatingThread, setIsCreatingThread] = useState(false);

  // const onCreateThread = () => {
  //   setIsCreatingThread(true);
  //   props.createThreadHandler();
  // };

  // const createThreadLoading = () => {
  //   return (
  //     <Spinner label={spinnerLabel} ariaLive="assertive" labelPosition="top" />
  //   );
  // };

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

      if (!isUserCreateInProgress) {
        setIsUserCreateInProgress(true);
        props.setUser(name);
      }
    }
  };

  const homeScreen = () => {
    return (
      <Stack horizontal horizontalAlign="center" verticalAlign="center" tokens={containerTokens}>
        <Stack className={upperStackStyle} tokens={upperStackTokens}>
          <div className={headerStyle}>{headerTitle}</div>
          <Stack tokens={nestedStackTokens}>
              <ul className={listStyle}>
                  <li className={listItemStyle}>
                      <Icon className={iconStyle} iconName={iconName} /> {listItems[0]}
                  </li>
                  <li className={listItemStyle}>
                      <Icon className={iconStyle} iconName={iconName} /> {listItems[1]}
                  </li>
                  <li className={listItemStyle}>
                      <Icon className={iconStyle} iconName={iconName} /> {listItems[2]}
                  </li>
                  <li className={listItemStyle}>
                      <Icon className={iconStyle} iconName={iconName} /> {listItems[3]}{' '}
                      <a href="https://aka.ms/ACS-CallingSample">sample</a>
                  </li>
              </ul>
          </Stack>
          <DisplayNameField 
              setName={setName} 
              name={name} 
              validateName={validateName}
              setNameLengthExceedLimit={setNameLengthExceedLimit}
              isNameLengthExceedLimit={isNameLengthExceedLimit}
              setEmptyWarning={setEmptyWarning} 
              isEmpty={emptyWarning} />
          <PrimaryButton 
            className={buttonStyle}
            disabled={emptyWarning || isNameLengthExceedLimit || isUserCreateInProgress}
            onClick={async () => {
              // onCreateThread();
              validateName();
            }}>
            <VideoCameraEmphasisIcon className={videoCameraIconStyle} size="medium" />
            {startCallButtonText}
          </PrimaryButton>
        </Stack>
        <Image
          alt="Welcome to the ACS Calling sample app"
          className={imgStyle}
          styles={imageStyleProps}
          {...imageProps}
        />
      </Stack>
    );
  };

  return homeScreen();
};
