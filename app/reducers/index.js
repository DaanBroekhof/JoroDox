// @flow
import {combineReducers} from 'redux';
import {routerReducer as router} from 'react-router-redux';
import {Reducers as gridReducers} from 'react-redux-grid';

const rootReducer = combineReducers({
  router,
  ...gridReducers
});

export default rootReducer;
