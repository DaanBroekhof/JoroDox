import React from 'react';
import {render} from 'react-dom';
import {AppContainer} from 'react-hot-loader';

import Root from './containers/Root';
import createHashHistory from 'history/createHashHistory';
import {syncHistoryWithStore} from 'mobx-react-router';
import RootStore from './store/RootStore';

import './app.global.css';

const store = new RootStore();

console.log(window.location.pathname);

const browserHistory = createHashHistory();
const history = syncHistoryWithStore(browserHistory, store.routingStore);

render(
  <AppContainer>
    <Root store={store} history={history} />
  </AppContainer>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./containers/Root', () => {
    const NextRoot = require('./containers/Root'); // eslint-disable-line global-require
    render(
      <AppContainer>
        <NextRoot store={store} history={history} />
      </AppContainer>,
      document.getElementById('root')
    );
  });
}
