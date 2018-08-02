import React, {Component} from 'react';
import {Provider} from 'mobx-react';
import App from './App';
import BackgroundApp from './BackgroundApp';


type Props = {
  store: {},
  history: {}
};

export default class Root extends Component<Props> {
  render() {
    const isBackgroundWindow = window.location.pathname.endsWith('background.html');
    return (
      isBackgroundWindow ?
        <BackgroundApp store={this.props.store} history={this.props.history} /> :
        <App store={this.props.store} history={this.props.history} />
    );
  }
}
