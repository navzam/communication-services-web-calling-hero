import React, { useState } from 'react';
import { DocumentCard, DocumentCardActions, DocumentCardDetails, DocumentCardImage, DocumentCardTitle, IButtonProps, IconButton, IIconProps, ImageFit, Link, Modal, Spinner } from '@fluentui/react';

export interface FilesListProps {
    files: Map<string, {
        filename: string;
        blobUrl: string | null;
        isDownloading: boolean;
    }>;
    groupId: string;
    downloadFile: (fileId: string) => void;
    clearFileBlobUrl: (fileId: string) => void;
}

export default (props: FilesListProps): JSX.Element => {
    const [showingPhotoUrl, setShowingPhotoUrl] = useState<string | null>(null);
    const [downloadClicked, setDownloadClicked] = useState<Map<string, boolean>>(new Map<string, boolean>());

    if (!props.files || props.files.size === 0) {
        return <div>No files have been shared yet.</div>
    }

    const fileGridElements: JSX.Element[] = [];
    props.files.forEach((file, fileId) => {
        const isImage = file.filename.toLowerCase().endsWith('.png') || file.filename.toLowerCase().endsWith('.jpg');
        const hasImagePreview = isImage && file.blobUrl !== null;
        const nonImageIcon: IIconProps = { iconName: 'Document' };
        const imageIcon: IIconProps = { iconName: 'FileImage' };
        const downloadButton: IButtonProps = {
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
                <DocumentCardDetails>
                    <DocumentCardTitle title={file.filename}  shouldTruncate />
                    { file.isDownloading && <Spinner /> }
                    { downloadClicked.get(fileId) && file.blobUrl !== null && 
                        <Link
                            href={file.blobUrl}
                            download={file.filename}
                            onClick={() => {
                                setDownloadClicked(new Map(downloadClicked.set(fileId, false)));
                                if (!isImage) {
                                    // TODO: should also revoke the object URL somewhere
                                    props.clearFileBlobUrl(fileId);
                                }
                            }}>
                            Click to download
                        </Link>
                    }
                </DocumentCardDetails>
                <DocumentCardActions actions={isImage ? [downloadButton, previewButton] : [downloadButton]} />
            </DocumentCard>
        ));
    });

    const numRows = Math.floor(props.files.size / 2);
    const numCols = 2;

    return (
        <>
            <div style={{ height: '100%', display: 'grid', gridTemplateRows: `repeat(${numRows}, 1fr)`, gridTemplateColumns: `repeat(${numCols}, 50%)` }}>
                {fileGridElements}
            </div>
            <Modal isOpen={showingPhotoUrl !== null} onDismissed={() => setShowingPhotoUrl(null)}>
                {showingPhotoUrl &&
                    <div style={{ width: 640, height: 480 }}>
                        <IconButton iconProps={{ iconName: 'Cancel' }} onClick={() => setShowingPhotoUrl(null)} />
                        <img src={showingPhotoUrl} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    </div>}
            </Modal>
        </>
    );
};