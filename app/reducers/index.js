// @flow
import {combineReducers} from 'redux';
import {routerReducer as router} from 'react-router-redux';
import {Reducers as gridReducers} from 'react-redux-grid';
import database from './database';

const rootReducer = combineReducers({
  database,
  router,
  ...gridReducers
});

export default rootReducer;
