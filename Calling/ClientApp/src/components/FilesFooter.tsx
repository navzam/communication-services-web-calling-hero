import { Modal, PrimaryButton, Separator, Stack } from "@fluentui/react";
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
var fileSizeError=false;

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
        var sizeInMB = (file.size / (1024*1024)).toFixed(2);
        if(parseInt(sizeInMB)>5){
            fileSizeError=true; 
        }
        if(!fileSizeError)
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
        {fileSizeError === true ?
            <div id="failMessage" className="overlay">
                <div className="popup" >
                    <h2>File upload failed</h2>
                    <button className="close" onClick={attachFileClicked}>×</button>

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
            {takingPhoto && <PhotoCapture onPhotoCaptured={onPhotoCaptured} />}
        </Modal>
        <input id="file-input" type="file" name="name" onChange={fileInputChanged} style={{ display: 'none' }} />
    </Stack>;
}