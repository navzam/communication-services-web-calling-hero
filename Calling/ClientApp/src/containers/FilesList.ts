import { connect } from 'react-redux';
import { getFiles } from '../core/sideEffects';
import { State } from '../core/reducers';
import FilesList from '../components/FilesList';
import { } from '@azure/communication-common';

const mapStateToProps = (state: State) => ({
    files: state.files.files
});

const mapDispatchToProps = (dispatch: any) => ({
    updateFiles: () => {
        dispatch(getFiles);
    },
});

const connector: any = connect(mapStateToProps, mapDispatchToProps);
export default connector(FilesList);
