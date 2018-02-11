// @flow
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'react-router-redux';
import { Route } from 'react-router';
import App from '../containers/App';
import BackgroundApp from '../containers/BackgroundApp';


type Props = {
  store: {},
  history: {}
};

export default class Root extends Component<Props> {
    render() {
        let isBackgroundWindow = window.location.pathname.endsWith('background.html');
        return (
            <Provider store={store}>
              <ConnectedRouter history={history}>
                  <Route name="home" breadcrumbName="Home" component={isBackgroundWindow ? BackgroundApp : App} />
              </ConnectedRouter>
            </Provider>
        );
    }
}
