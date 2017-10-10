// @flow
import React, { Component } from 'react';
import FileTree from '../components/FileTree';
import SplitterLayout from 'react-splitter-layout';
import { Link } from 'react-router-dom';

import { Switch, Route } from 'react-router';
import FileView from '../components/FileView';
import HomePage from '../containers/HomePage';
import CounterPage from '../containers/CounterPage';

import { Layout, Menu as AntdMenu, Breadcrumb, Icon } from 'antd';
import { Row, Col, Button } from 'antd';
import { Tree } from 'antd';
const TreeNode = Tree.TreeNode;

const { Header, Content, Sider } = Layout;
const { Item } = AntdMenu;

export default class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            rootPath: "F:/Games/Steam/steamapps/common/Europa Universalis IV",
        }

        console.log(props)
    }

  render() {
    return (
    <Layout style={{ height: '100%' }}>
      <Header className="header">
        <div className="logo" />
        <AntdMenu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['2']}
            style={{ lineHeight: '64px' }}
        >
          <Item key="1"><Link to="/">Explore</Link></Item>
          <Item key="2">Settings</Item>
          <Item key="3">About</Item>
        </AntdMenu>
      </Header>
      <Layout>
        <SplitterLayout horizontal primaryIndex={1} secondaryInitialSize={200}>
          <FileTree root={this.state.rootPath}/>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb style={{ margin: '12px 0' }} />
            <Content style={{ background: '#fff', padding: 24, margin: 0, minHeight: 280 }}>
              <Switch>
                <Route path="/fileview/:path*" component={FileView} />
                <Route path="/counter" component={CounterPage} />
                <Route path="/" component={HomePage} />
              </Switch>
            </Content>
          </Layout>
        </SplitterLayout>
      </Layout>
    </Layout>
    );
  }
}
