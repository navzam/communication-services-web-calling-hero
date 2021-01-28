import { IconButton, MessageBar, MessageBarType, Modal, PrimaryButton, Separator, Stack } from "@fluentui/react";
import { CameraIcon, PaperclipIcon } from "@fluentui/react-northstar";
import React, { useRef, useState } from "react";
import PhotoCapture from "./PhotoCapture";
import { attachButtonStyle, attachIconStyle, paneFooterStyles, paneFooterTokens } from "./styles/CommandPanel.styles";

export interface FilesFooterProps {
    onFileChosen: (file: File) => unknown;
    onPhotoTaken: (dataUrl: string) => unknown;
}

const attachFileString = 'Attach file';
const takePhotoString = 'Take photo';

export default (props: FilesFooterProps): JSX.Element => {
    const hiddenFileInputRef = useRef<HTMLInputElement>(null);
    const [takingPhoto, setTakingPhoto] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    const fileInputChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files === null || event.target.files.length === 0) {
          return;
        }

        const file = event.target.files[0];
        if (file.size > 5 * 1024 * 1024) {
            setFileError('The selected file exceeds the size limit of 5 MB');
        } else {
            setFileError(null);
            props.onFileChosen(file);
        }

        // Reset the file input so that choosing the same file again still triggers the onChange handler
        event.target.value = "";
    };

    const attachFileClicked = () => {
        hiddenFileInputRef.current?.click();
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
        {fileError && (
            <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setFileError(null)}>
                {fileError}
            </MessageBar>
        )}
        <PrimaryButton className={attachButtonStyle} onClick={attachFileClicked}>
            <PaperclipIcon className={attachIconStyle} />
            {attachFileString}
        </PrimaryButton>
        <PrimaryButton className={attachButtonStyle} onClick={takePhotoClicked}>
            <CameraIcon className={attachIconStyle} />
            {takePhotoString}
        </PrimaryButton>
        <Modal isOpen={takingPhoto}>
            <Stack>
                <IconButton iconProps={{ iconName: 'Cancel' }} onClick={() => setTakingPhoto(false)} />
                {takingPhoto && <PhotoCapture onPhotoCaptured={onPhotoCaptured} />}
            </Stack>
        </Modal>
        <input ref={hiddenFileInputRef} type="file" name="name" onChange={fileInputChanged} style={{ display: 'none' }} />
    </Stack>;
}