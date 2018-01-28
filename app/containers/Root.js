// @flow
import React from 'react';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'react-router-redux';
import { Route } from 'react-router';
import App from '../containers/App';
import BackgroundApp from '../containers/BackgroundApp';


type RootType = {
  store: {},
  history: {}
};

export default function Root({ store, history }: RootType) {
  let isBackgroundWindow = window.location.pathname.endsWith('background.html');
  return (
    <Provider store={store}>
      <ConnectedRouter history={history}>
          <Route name="home" breadcrumbName="Home" component={isBackgroundWindow ? BackgroundApp : App} />
      </ConnectedRouter>
    </Provider>
  );
}
