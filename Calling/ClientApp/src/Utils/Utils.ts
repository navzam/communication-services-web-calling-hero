// © Microsoft Corporation. All rights reserved.
import { AudioDeviceInfo, VideoDeviceInfo, RemoteVideoStream } from '@azure/communication-calling';
import {
  CommunicationUser,
  UnknownIdentifier,
  CallingApplication,
  PhoneNumber,
  isCommunicationUser,
  isCallingApplication,
  isPhoneNumber
} from '@azure/communication-common';
import preval from 'preval.macro';

export const utils = {
  getAppServiceUrl: (): string => {
    return window.location.origin;
  },
  getTokenForUser: async (userId: string): Promise<any> => {
    const response = await fetch('/userToken', { headers: { 'Authorization': userId } });
    if (response.ok) {
      return response.json();
    }
    throw new Error('Invalid token response');
  },
  isSelectedAudioDeviceInList(selected: AudioDeviceInfo, list: AudioDeviceInfo[]): boolean {
    return list.filter((item) => item.name === selected.name).length > 0;
  },
  isSelectedVideoDeviceInList(selected: VideoDeviceInfo, list: VideoDeviceInfo[]): boolean {
    return list.filter((item) => item.name === selected.name).length > 0;
  },
  isMobileSession() {
    return window.navigator.userAgent.match(/(iPad|iPhone|iPod|Android|webOS|BlackBerry|Windows Phone)/g)
      ? true
      : false;
  },
  isSmallScreen() {
    return window.innerWidth < 700 || window.innerHeight < 400;
  },
  isUnsupportedBrowser() {
    return window.navigator.userAgent.match(/(Firefox)/g)
      ? true
      : false;
  },
  getId: (identifier: CommunicationUser | CallingApplication | UnknownIdentifier | PhoneNumber): string => {
    if (isCommunicationUser(identifier)) {
      return identifier.communicationUserId;
    } else if (isCallingApplication(identifier)) {
      return identifier.callingApplicationId;
    } else if (isPhoneNumber(identifier)) {
      return identifier.phoneNumber;
    } else {
      return identifier.id;
    }
  },
  getStreamId: (userId: string, stream: RemoteVideoStream): string => {
    var id = (stream as any)['id'];
    return `${userId}-${id}-${stream.type}`;
  },
  /*
   * TODO:
   *  Remove this method once the SDK improves error handling for unsupported browser.
   */
  isOnIphoneAndNotSafari(): boolean {
    const userAgent = navigator.userAgent;
    // Chrome uses 'CriOS' in user agent string and Firefox uses 'FxiOS' in user agent string.
    if (userAgent.includes('iPhone') && (userAgent.includes('FxiOS') || userAgent.includes('CriOS'))) {
      return true;
    }
    return false;
  },
  getBuildTime: () => {
    const dateTimeStamp = preval`module.exports = new Date().toLocaleString();`;
    return dateTimeStamp;
  }
};

/* Chat */
export const compareMessages = (firstMessage: any, secondMessage: any) => {
  if (firstMessage.createdOn === undefined) return 1;
  if (secondMessage.createdOn === undefined) return -1;
  const firstDate = new Date(firstMessage.createdOn).getTime();
  const secondDate = new Date(secondMessage.createdOn).getTime();
  return firstDate - secondDate;
};

export const CAT = '🐱';
export const MOUSE = '🐭';
export const KOALA = '🐨';
export const OCTOPUS = '🐙';
export const MONKEY = '🐵';
export const FOX = '🦊';

export const getBackgroundColor = (avatar: string) => {
  switch (avatar) {
    case CAT:
      return {
        backgroundColor: 'rgba(255, 250, 228, 1)'
      };
    case MOUSE:
      return {
        backgroundColor: 'rgba(33, 131, 196, 0.1)'
      };
    case KOALA:
      return {
        backgroundColor: 'rgba(197, 179, 173, 0.3)'
      };
    case OCTOPUS:
      return {
        backgroundColor: 'rgba(255, 240, 245, 1)'
      };
    case MONKEY:
      return {
        backgroundColor: 'rgba(255, 245, 222, 1)'
      };
    case FOX:
      return {
        backgroundColor: 'rgba(255, 231, 205, 1)'
      };
    default:
      return {
        backgroundColor: 'rgba(255, 250, 228, 1)'
      };
  }
};

// export const getThreadId = () => {
//   const urlParams = new URLSearchParams(window.location.search);
//   return urlParams.get('threadId');
// };