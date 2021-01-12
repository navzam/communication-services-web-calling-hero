import React, { useState } from 'react';
import { DocumentCard, DocumentCardActions, DocumentCardDetails, DocumentCardImage, DocumentCardTitle, IButtonProps, IconButton, IIconProps, ImageFit, Modal } from '@fluentui/react';

export interface FilesListProps {
    files: Map<string, {
        filename: string;
        imageUrl: string | null;
    }>;
}

export default (props: FilesListProps): JSX.Element => {
    const [showingPhotoUrl, setShowingPhotoUrl] = useState<string | null>(null);

    if (!props.files || props.files.size === 0) {
        return <div>No files have been shared yet.</div>
    }

    const fileGridElements: JSX.Element[] = [];
    props.files.forEach((file, fileId) => {
        const hasPreviewImage = file.imageUrl !== null;
        const isImage = file.filename.toLowerCase().endsWith('.png') || file.filename.toLowerCase().endsWith('.jpg')
        const nonImageIcon: IIconProps = { iconName: 'Document' };
        const imageIcon: IIconProps = { iconName: 'FileImage' };
        const downloadButton: IButtonProps = {
            iconProps: {
                iconName: 'Download',
            },
            // TODO: This only works because the API is currently not authenticated
            href: `http://localhost:5000/files/${fileId}`,
            target: '_blank',
            // onClick: e => console.log(`Download clicked`),
            ariaLabel: 'download file'
        };
        fileGridElements.push((
            <DocumentCard key={fileId} style={{ minWidth: '0px' }} onClick={hasPreviewImage ? (e) => setShowingPhotoUrl(file.imageUrl) : undefined} >
                <DocumentCardImage
                    height={150}
                    imageFit={ImageFit.cover}
                    imageSrc={file.imageUrl ?? undefined}
                    iconProps={hasPreviewImage ? undefined : (isImage ? imageIcon : nonImageIcon)} />
                <DocumentCardDetails>
                    <DocumentCardTitle title={file.filename}  shouldTruncate />
                </DocumentCardDetails>
                <DocumentCardActions actions={[downloadButton]} />
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