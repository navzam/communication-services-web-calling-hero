import { State } from 'core/reducers';
import { setUser } from 'core/sideEffects';
import { connect } from 'react-redux';

import HomeScreen from '../components/HomeScreen';
// import { createThread } from '../core/sideEffects';


const mapStateToProps = (state: State) => ({
  // createThreadHandler: () => {
  //   createThread();
  // }
  userId: state.sdk.userId,
});

const mapDispatchToProps = (dispatch: any) => ({
  setUser: (userId: string) => dispatch(setUser(userId)),
});


export default connect(mapStateToProps, mapDispatchToProps)(HomeScreen);