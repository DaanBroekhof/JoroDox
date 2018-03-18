// @flow
import { combineReducers } from 'redux';
import { routerReducer as router } from 'react-router-redux';
import counter from './counter';
import { Reducers as gridReducers } from 'react-redux-grid';

const rootReducer = combineReducers({
  counter,
  router,
  ...gridReducers
});

export default rootReducer;
