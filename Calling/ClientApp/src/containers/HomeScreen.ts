import { State } from 'core/reducers';
import { setUser } from 'core/sideEffects';
import { connect } from 'react-redux';

import HomeScreen from '../components/HomeScreen';


const mapStateToProps = (state: State) => ({
  userId: state.sdk.userId,
});

const mapDispatchToProps = (dispatch: any) => ({
  setUser: (userId: string) => dispatch(setUser(userId)),
});


export default connect(mapStateToProps, mapDispatchToProps)(HomeScreen);