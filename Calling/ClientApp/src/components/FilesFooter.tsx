import { IconButton, Modal, PrimaryButton, Separator, Stack } from "@fluentui/react";
import { CameraIcon, PaperclipIcon } from "@fluentui/react-northstar";
import React, { useState } from "react";
import PhotoCapture from "./PhotoCapture";
import { attachButtonStyle, attachIconStyle, paneFooterStyles, paneFooterTokens } from "./styles/CommandPanel.styles";

export interface FilesFooterProps {
    onFileChosen: (file: File) => unknown;
    onPhotoTaken: (dataUrl: string) => unknown;
}

const attachFileString = 'Attach file';
const takePhotoString = 'Take photo';

const attachFileClicked = () => {
    console.log(`attach file clicked`);
    document.getElementById('file-input')?.click();
};

export default (props: FilesFooterProps): JSX.Element => {
    const [takingPhoto, setTakingPhoto] = useState(false);
    const fileInputChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files === null) {
          return;
        }
    
        const file = event.target.files[0];
        props.onFileChosen(file);
    };

    const takePhotoClicked = () => {
        setTakingPhoto(!takingPhoto);
    };

    const onPhotoCaptured = (dataUrl: string) => {
        props.onPhotoTaken(dataUrl);
        setTakingPhoto(false);
    };

    return <Stack styles={paneFooterStyles} tokens={paneFooterTokens}>
        <Separator />
        <PrimaryButton className={attachButtonStyle} onClick={attachFileClicked}>
            <PaperclipIcon className={attachIconStyle} />
            {attachFileString}
        </PrimaryButton>
        <PrimaryButton className={attachButtonStyle} onClick={takePhotoClicked}>
            <CameraIcon className={attachIconStyle} />
            {takePhotoString}
        </PrimaryButton>
        <Modal isOpen={takingPhoto}>
            <IconButton iconProps={{ iconName: 'Cancel' }} onClick={() => setTakingPhoto(false)} />
            {takingPhoto && <PhotoCapture onPhotoCaptured={onPhotoCaptured} />}
        </Modal>
        <input id="file-input" type="file" name="name" onChange={fileInputChanged} style={{ display: 'none' }} />
    </Stack>;
}