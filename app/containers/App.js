// @flow
import React, { Component } from 'react';
import type { Children } from 'react';
import FileTree from '../components/FileTree';
import SplitterLayout from 'react-splitter-layout';
import { Link } from 'react-router-dom';

import { Layout, Menu, Breadcrumb, Icon } from 'antd';
import { Row, Col, Button } from 'antd';
import { Tree } from 'antd';
const TreeNode = Tree.TreeNode;

const { Header, Content, Sider } = Layout;

const treeData = [{
    label: 'Node1',
    value: '0-0',
    key: '0-0',
    children: [{
        label: 'Child Node1',
        value: '0-0-1',
        key: '0-0-1',
    }, {
        label: 'Child Node2',
        value: '0-0-2',
        key: '0-0-2',
    }],
}, {
    label: 'Node2',
    value: '0-1',
    key: '0-1',
}];

export default class App extends Component {
  props: {
    children: Children
  };

  render() {
    return (
    <Layout style={{ height: '100%' }}>
      <Header className="header">
        <div className="logo" />
        <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['2']}
            style={{ lineHeight: '64px' }}
        >
          <Menu.Item key="1"><Link to="/">Explore</Link></Menu.Item>
          <Menu.Item key="2">Settings</Menu.Item>
          <Menu.Item key="3">About</Menu.Item>
        </Menu>
      </Header>
      <Layout>
        <SplitterLayout horizontal primaryIndex={1} secondaryInitialSize={200}>
          <div style={{background: 'white', minHeight: '100%'}}>
            <FileTree/>
          </div>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb style={{ margin: '12px 0' }}>
              <Breadcrumb.Item>Home</Breadcrumb.Item>
              <Breadcrumb.Item>List</Breadcrumb.Item>
              <Breadcrumb.Item>App</Breadcrumb.Item>
            </Breadcrumb>
            <Content style={{ background: '#fff', padding: 24, margin: 0, minHeight: 280 }}>
                {this.props.children}
            </Content>
          </Layout>
        </SplitterLayout>
      </Layout>
    </Layout>
    );
  }
}
