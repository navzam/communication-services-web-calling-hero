import React, { useState } from 'react';
import { DocumentCard, DocumentCardActions, DocumentCardImage, DocumentCardTitle, IButtonProps, IconButton, IIconProps, ImageFit, Modal, Spinner, Stack } from '@fluentui/react';
import { filesListStyle, filesGridStyle } from './styles/FilesList.styles';
import AutoDownloadLink from './AutoDownloadLink';

export interface FilesListProps {
    files: Map<string, {
        filename: string;
        blobUrl: string | null;
        isDownloading: boolean;
    }>;
    fileId: string;
    groupId: string;
    downloadFile: (fileId: string) => void;
    clearFileBlobUrl: (fileId: string) => void;
    showNoFilesMessage: boolean;
}

export default (props: FilesListProps): JSX.Element => {
    const [showingPhotoUrl, setShowingPhotoUrl] = useState<string | null>(null);
    const [downloadClicked, setDownloadClicked] = useState<Map<string, boolean>>(new Map<string, boolean>());

    if (!props.files || props.files.size === 0) {
        if (props.showNoFilesMessage) {
            return <div className={filesListStyle}>No files have been shared yet.</div>
        }

        return <></>
    }

    const fileGridElements: JSX.Element[] = [];

    var files: Map<string, {
        filename: string;
        blobUrl: string | null;
        isDownloading: boolean;
    } | undefined> | undefined;


    //Display Image
    const imageDisplay = (file: { filename: string; blobUrl: string | null; isDownloading: boolean; }, fileId: string) => {

        const isImage = file.filename.toLowerCase().endsWith('.png') || file.filename.toLowerCase().endsWith('.jpg');
        const hasImagePreview = isImage && file.blobUrl !== null;
        const nonImageIcon: IIconProps = { iconName: 'Document' };
        const imageIcon: IIconProps = { iconName: 'FileImage' };
        const downloadButton: IButtonProps =
            !file.isDownloading ? {
                iconProps: {
                    iconName: 'Download',
                },
                onClick: (e) => {
                    setDownloadClicked(new Map(downloadClicked.set(fileId, true)));
                    if (!props.files.get(fileId)?.blobUrl) {
                        props.downloadFile(fileId);
                    }
                },
                ariaLabel: 'download file',
                disabled: file.isDownloading || (downloadClicked.get(fileId) && file.blobUrl !== null),
            }
                : {
                    children: <Spinner />,
                    disabled: true,
                };
        const previewButton: IButtonProps = {
            iconProps: {
                iconName: 'MiniExpand',
            },
            onClick: e => setShowingPhotoUrl(file.blobUrl),
            ariaLabel: 'preview file',
            disabled: !hasImagePreview,
        };
        fileGridElements.push((
            <DocumentCard key={fileId} style={{ minWidth: '0px' }}>
                <DocumentCardImage
                    height={150}
                    imageFit={ImageFit.cover}
                    imageSrc={hasImagePreview ? file.blobUrl! : undefined}
                    iconProps={hasImagePreview ? undefined : (isImage ? imageIcon : nonImageIcon)} />
                <DocumentCardTitle title={file.filename} />
                { downloadClicked.get(fileId) && file.blobUrl !== null &&
                    <AutoDownloadLink link={file.blobUrl} downloadName={file.filename} onTriggered={() => {
                        setDownloadClicked(new Map(downloadClicked.set(fileId, false)));
                        if (!isImage) {
                            // TODO: should also revoke the object URL somewhere
                            props.clearFileBlobUrl(fileId);
                        }
                    }} />
                }
                <DocumentCardActions actions={isImage ? [downloadButton, previewButton] : [downloadButton]} />
            </DocumentCard>
        ));
    }

    var file;
    if (props.fileId != undefined)
        file = props.files.get(props.fileId.trim());
    if (file !== undefined && props.fileId !== undefined) {
        files?.set(props.fileId.trim(), file);
        imageDisplay(file, props.fileId.trim());
    }
    else {
        props.files.forEach((file, fileId) => {
            imageDisplay(file, fileId);

        });
    }

    const numRows = props.fileId != undefined? 1: Math.floor(props.files.size / 2);
    const numCols = 1;

    return (
        <>
            <div className={filesListStyle}>
                <div className={filesGridStyle} style={{ gridTemplateRows: `repeat(${numRows}, 1fr)`, gridTemplateColumns: `repeat(${numCols}, 1fr)` }}>
                    {fileGridElements}
                </div>
            </div>
            <Modal isOpen={showingPhotoUrl !== null} onDismissed={() => setShowingPhotoUrl(null)}>
                {showingPhotoUrl &&
                    <Stack>
                        <IconButton iconProps={{ iconName: 'Cancel' }} onClick={() => setShowingPhotoUrl(null)} />
                        <Stack.Item grow>
                            <img src={showingPhotoUrl} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                        </Stack.Item>
                    </Stack>}
            </Modal>
        </>
    );
};
