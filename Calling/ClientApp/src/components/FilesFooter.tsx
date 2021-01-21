import { IconButton, Modal, PrimaryButton, Separator, Stack } from "@fluentui/react";
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
var fileSizeError=false;

export default (props: FilesFooterProps): JSX.Element => {
    const hiddenFileInputRef = useRef<HTMLInputElement>(null);
    const [takingPhoto, setTakingPhoto] = useState(false);

    const fileInputChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files === null || event.target.files.length === 0) {
          return;
        }
    
        fileSizeError=false;
        const file = event.target.files[0];
        var sizeInMB = (file.size / (1024*1024)).toFixed(2);
        if(parseInt(sizeInMB)>5){
            fileSizeError=true; 
        }
        if(!fileSizeError)
            props.onFileChosen(file);
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
        {fileSizeError === true ?
            <div id="failMessage" className="overlay">
                <div className="popup" >
                    <h2>File upload failed</h2>
                    <a className="close" href='#failMessage'>×</a>

                    <div className="content">
                        Please upload file with size less than 5 MB
                    </div>
                </div>
            </div>
            : null
        }
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
        <input ref={hiddenFileInputRef} type="file" name="name" onChange={fileInputChanged} style={{ display: 'none' }} />
    </Stack>;
}