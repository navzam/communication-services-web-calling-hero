import { connect } from 'react-redux';
import { State } from '../core/reducers';
import FilesList, { FilesListProps } from '../components/FilesList';
import { } from '@azure/communication-common';
import { getFile } from 'core/sideEffects';
import { setFileBlobUrl } from 'core/actions/files';

const mapStateToProps = (state: State, props: FilesListProps) => ({
    files: state.files.files,
    groupId: state.calls.group,
    fileId: props.fileId,
});

const mapDispatchToProps = (dispatch: any) => ({
    downloadFile: (fileId: string) => dispatch(getFile(fileId)),
    clearFileBlobUrl: (fileId: string) => dispatch(setFileBlobUrl(fileId, null))
});

const connector: any = connect(mapStateToProps, mapDispatchToProps);
export default connector(FilesList);
