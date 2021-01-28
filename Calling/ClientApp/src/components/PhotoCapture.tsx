import { Dropdown, IDropdownOption, MessageBar, MessageBarType, PrimaryButton, Spinner, Stack } from "@fluentui/react";
import { CameraIcon, SendIcon, UndoIcon } from "@fluentui/react-northstar";
import React, { useEffect, useRef, useState } from "react";
import { buttonIconStyle, buttonStackTokens, buttonStyle, photoAreaStyle, stackTokens } from "./styles/PhotoCapture.styles";

export interface PhotoCaptureProps {
    onPhotoCaptured: (dataUrl: string) => unknown;
}

export default (props: PhotoCaptureProps): JSX.Element => {
    const refVideo = useRef<HTMLVideoElement>(null);
    const refCanvas = useRef<HTMLCanvasElement>(null);
    const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[] | null>(null);
    const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState<string | null>(null);
    const [selectedCameraDeviceFailed, setSelectedCameraDeviceFailed] = useState<boolean>(false);
    const [videoWidth, setVideoWidth] = useState(0);
    const [videoHeight, setVideoHeight] = useState(0);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isCaptured, setIsCaptured] = useState(false);

    useEffect(() => {
        // Ensure that browser supports getUserMedia()
        const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        if (!hasGetUserMedia) {
            console.error(`getUserMedia() is not supported by this browser`);
            setCameraDevices([]);
            return;
        }

        // Find camera devices
        navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
            const cameraDevices = deviceInfos.filter(device => device.kind === 'videoinput');
            setCameraDevices(cameraDevices);
            if (cameraDevices.length > 0) {
                setSelectedCameraDeviceId(cameraDevices[0].deviceId);
            }
        });
    }, []);

    // Effect when selected camera changes
    useEffect(() => {
        if (selectedCameraDeviceId === null) return;

        if (refVideo.current === null) {
            console.error(`refVideo is null`);
            return;
        }

        // Get stream for the selected camera and display it
        const mediaConstraints: MediaStreamConstraints = { video: { deviceId: { exact: selectedCameraDeviceId } } };
        navigator.mediaDevices.getUserMedia(mediaConstraints).then(stream => {
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
        }).catch((reason) => {
            setSelectedCameraDeviceFailed(true);
            console.error('Failed to get media from device: ', reason);
        });
    }, [selectedCameraDeviceId]);

    // Event when user selects a different camera
    const onCameraDropdownChanged = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption, index?: number) => {
        if (option === undefined) return;

        const newCameraDeviceId = option.key as string;
        if (newCameraDeviceId !== selectedCameraDeviceId) {
            setIsVideoReady(false);
            setSelectedCameraDeviceFailed(false);
            setSelectedCameraDeviceId(newCameraDeviceId);
        }
    };

    const onCaptureClicked = () => {
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
    };

    const onRetakeClicked = () => {
        setIsCaptured(false);
    };

    const onSendClicked = () => {
        const dataUrl = refCanvas.current!.toDataURL();
        props.onPhotoCaptured(dataUrl);
    };

    // Check for error conditions in case we need to display an error banner
    let errorMessage: string | null = null;
    if (selectedCameraDeviceFailed) {
        errorMessage = "Failed to open the selected camera. Please try a different camera."
    } else if (cameraDevices !== null && cameraDevices.length === 0) {
        errorMessage = "No cameras found.";
    }

    return (
        <Stack tokens={stackTokens}>
            {errorMessage && <MessageBar messageBarType={MessageBarType.error}>{errorMessage}</MessageBar>}
            <Dropdown
                label="Cameras"
                selectedKey={selectedCameraDeviceId ?? undefined}
                onChange={onCameraDropdownChanged}
                placeholder="Select a camera"
                disabled={cameraDevices === null || cameraDevices.length === 0}
                options={(cameraDevices ?? []).map(device => ({ key: device.deviceId, text: device.label }))}
            />
            {(!isVideoReady && !selectedCameraDeviceFailed) && <Spinner />}
            <video autoPlay ref={refVideo} hidden={isCaptured || !isVideoReady} className={photoAreaStyle} />
            <canvas ref={refCanvas} hidden={!isCaptured} className={photoAreaStyle} />
            <Stack horizontal tokens={buttonStackTokens}>
                {isCaptured ? (
                    <Stack.Item grow>
                        <PrimaryButton disabled={!isVideoReady} className={buttonStyle} onClick={onRetakeClicked}>
                            <UndoIcon className={buttonIconStyle} />
                            Retake
                        </PrimaryButton>
                    </Stack.Item>
                ) : (
                    <Stack.Item grow>
                        <PrimaryButton disabled={!isVideoReady} className={buttonStyle} onClick={onCaptureClicked}>
                            <CameraIcon className={buttonIconStyle} />
                            Capture
                        </PrimaryButton>
                    </Stack.Item>
                )}
                <Stack.Item grow>
                    <PrimaryButton disabled={!isVideoReady || !isCaptured} className={buttonStyle} onClick={onSendClicked}>
                        <SendIcon className={buttonIconStyle} />
                        Send
                    </PrimaryButton>
                </Stack.Item>
            </Stack>
        </Stack>
    );
}