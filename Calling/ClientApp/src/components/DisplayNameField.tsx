import React from 'react';
import { TextField } from '@fluentui/react';

import {
  inputBoxStyle,
  inputBoxTextStyle,
  inputBoxWarningStyle,
  labelFontStyle,
  warningStyle
} from './styles/Configuration.styles';

import { MAXIMUM_LENGTH_OF_NAME, ENTER_KEY } from '../constants';

interface DisplayNameFieldProps {
  setName(name: string): void;
  name: string;
  setEmptyWarning(isEmpty: boolean): void;
  isEmpty: boolean;
  validateName(): void;
  isNameLengthExceedLimit: boolean;
  setNameLengthExceedLimit(isNameLengthExceedLimit: boolean): void;
}

const TextFieldStyleProps = {
  wrapper: {
    height: '2.3rem'
  },
  fieldGroup: {
    height: '2.3rem'
  }
};

export default (props: DisplayNameFieldProps): JSX.Element => {
  const onNameTextChange = (event: any) => {
    props.setName(event.target.value);
    if (event.target.value) {
      props.setEmptyWarning(false);
    }  else if (event.target.value.length > MAXIMUM_LENGTH_OF_NAME) {
      props.setNameLengthExceedLimit(true);
    } else {
      props.setEmptyWarning(true);
      props.setNameLengthExceedLimit(false);
    }
  };

  return (
    <div>
      <div className={labelFontStyle}>Name</div>
      <TextField
        autoComplete="off"
        inputClassName={inputBoxTextStyle}
        ariaLabel="Choose your name"
        borderless={true}
        className={props.isEmpty ? inputBoxWarningStyle : inputBoxStyle}
        onChange={onNameTextChange}
        id="name"
        placeholder="Enter your name"
        onKeyDown={(ev) => {
          if (ev.which === ENTER_KEY) {
            props.validateName();
          }
        }}
        defaultValue={props.name}
        styles={TextFieldStyleProps}
      />
      {props.isEmpty && (
        <div role="alert" className={warningStyle}>
          {' '}
          Name cannot be empty{' '}
        </div>
      )}
    </div>
  );
};
