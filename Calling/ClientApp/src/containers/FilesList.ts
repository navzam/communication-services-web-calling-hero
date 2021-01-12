import { connect } from 'react-redux';
import { State } from '../core/reducers';
import FilesList from '../components/FilesList';
import { } from '@azure/communication-common';

const mapStateToProps = (state: State) => ({
    files: state.files.files
});

const connector: any = connect(mapStateToProps);
export default connector(FilesList);
