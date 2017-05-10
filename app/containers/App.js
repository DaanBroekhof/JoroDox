// @flow
import React, { Component } from 'react';
import type { Children } from 'react';
import FileTree from '../components/FileTree';
import SplitterLayout from 'react-splitter-layout';

export default class App extends Component {
  props: {
    children: Children
  };

  render() {
    return (
    <SplitterLayout vertical primaryIndex={1} secondaryInitialSize={100}>
      <nav className="navbar navbar-inverse navbar-fixed-top">
        <div class="navbar-header pull-left">
        <a class="navbar-brand" href="#">The JoroDox <span>vtest</span></a>
      </div>
      <div id="navbar">
        <ul class="nav navbar-nav" track-active>
          <li ui-sref-active="active"><a ui-sref="inspect">Explore</a></li>
          <li ui-sref-active="active"><a ui-sref="settings">Settings</a></li>
          <li ui-sref-active="active"><a ui-sref="about">About</a></li>
        </ul>
        <div class="loading-state"></div>
    </div></nav>
      <SplitterLayout horizontal primaryIndex={1} secondaryInitialSize={300}>
        <FileTree />
        <div>
            {this.props.children}
        </div>
      </SplitterLayout>
    </SplitterLayout>
    );
  }
}
