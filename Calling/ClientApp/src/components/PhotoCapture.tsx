import { PrimaryButton, Spinner, Stack } from "@fluentui/react";
import React, { useEffect, useRef, useState } from "react";

export interface PhotoCaptureProps {
    onPhotoCaptured: (dataUrl: string) => unknown;
}

export default (props: PhotoCaptureProps): JSX.Element => {
    const refVideo = useRef<HTMLVideoElement>(null);
    const refCanvas = useRef<HTMLCanvasElement>(null);
    const [videoWidth, setVideoWidth] = useState(0);
    const [videoHeight, setVideoHeight] = useState(0);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [needToCapture, setNeedToCapture] = useState(false);
    const [isCaptured, setIsCaptured] = useState(false);

    useEffect(() => {
        const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        if (!hasGetUserMedia) {
            console.error(`getUserMedia() is not supported by your browser`);
            return;
        }

        if (refVideo.current === null) {
            console.error(`refVideo is null`);
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: { width: { min: 1280 }, height: { min: 720 } } }).then(stream => {
            refVideo.current!.srcObject = stream;
            refVideo.current!.addEventListener('canplay', ev => {
                if (!isVideoReady) {
                    console.log(`videoWidth: ${refVideo.current!.videoWidth}`);
                    console.log(`videoHeight: ${refVideo.current!.videoHeight}`);
                    setVideoWidth(refVideo.current!.videoWidth);
                    setVideoHeight(refVideo.current!.videoHeight);
                    setIsVideoReady(true);
                }
            });
        });
    }, []);

    useEffect(() => {
        if (needToCapture) {
            if (refCanvas.current === null) {
                console.error(`refCanvas is null`);
                return;
            }

            const canvasContext = refCanvas.current.getContext('2d');
            if (canvasContext === null) {
                console.error(`Couldn't get canvas context`);
                return;
            }

            refCanvas.current.width = videoWidth;
            refCanvas.current.height = videoHeight;
            canvasContext.drawImage(refVideo.current!, 0, 0, videoWidth, videoHeight);

            setIsCaptured(true);
            setNeedToCapture(false);
        }
    }, [needToCapture]);

    const onCaptureClicked = () => {
        setNeedToCapture(true);
    };

    const onSendClicked = () => {
        const dataUrl = refCanvas.current!.toDataURL();
        props.onPhotoCaptured(dataUrl);
    };

    return <Stack>
        {!isVideoReady && <Spinner />}
        {!isCaptured && <video autoPlay ref={refVideo} />}
        {(needToCapture || isCaptured) && <canvas ref={refCanvas} />}
        <PrimaryButton onClick={onCaptureClicked}>
            Capture
        </PrimaryButton>
        <PrimaryButton onClick={onSendClicked}>
            Send
        </PrimaryButton>
    </Stack>;
}