import React, { useEffect, useRef } from 'react';

export interface AutoDownloadLinkProps {
    link: string;
    downloadName: string;
    onTriggered: () => void;
}

export default (props: AutoDownloadLinkProps): JSX.Element => {
    const aRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (aRef.current !== null) {
            aRef.current.click();
            props.onTriggered();
        }
    }, [aRef]);

    return (
        <a
            ref={aRef}
            href={props.link}
            download={props.downloadName}
            style={{ display: 'none' }} />
    );
};