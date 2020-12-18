import React from 'react';
import { DetailsList, SelectionMode, Stack } from '@fluentui/react';

export interface FilesListProps {
    files: {
        filename: string,
        size: number;
    }[];
}

export default (props: FilesListProps): JSX.Element => {
    if (!props.files || props.files.length === 0) {
        return <div>No files have been shared yet.</div>
    }

    const fileListItems = props.files.map((file, index) => ({
        key: index,
        name: file.filename,
        size: `${Math.round(file.size / 1000)} KB`,
    }));

    return <DetailsList
            items={fileListItems}
            columns={[
                { key: 'column1', name: 'Name', fieldName: 'name', minWidth: 100, maxWidth: 200 },
                { key: 'column2', name: 'Size', fieldName: 'size', minWidth: 50, maxWidth: 50 }
            ]}
            selectionMode={SelectionMode.single}
            onActiveItemChanged={(item, index, event) => { console.log(item, index, event); }}
            onItemInvoked={(item, index, event) => { console.log(item, index, event); }}
        />;
};