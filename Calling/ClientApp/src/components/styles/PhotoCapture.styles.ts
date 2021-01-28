import { IStackTokens, mergeStyles } from "@fluentui/react";

export const stackTokens: IStackTokens = {
    childrenGap: '0.5rem',
    padding: '0.5rem',
};

export const buttonStackTokens: IStackTokens = {
    childrenGap: '0.5rem',
};

export const buttonStyle = mergeStyles({
    fontWeight: 600,
    fontSize: '0.875rem',
    height: '2.5rem',
    width: '100%',
});

export const buttonIconStyle = mergeStyles({
    marginRight: '0.5em',
});

export const photoAreaStyle = mergeStyles({
    maxWidth: '640px',
    maxHeight: '480px',
});