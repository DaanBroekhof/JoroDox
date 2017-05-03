import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Header from '../components/Header';
import MainSection from '../components/MainSection';
import * as TodoActions from '../actions/todos';
import style from './App.css';
import FileTree from '../components/FileTree';
import SplitterLayout from 'react-splitter-layout';

@connect(
  state => ({
    todos: state.todos
  }),
  dispatch => ({
    actions: bindActionCreators(TodoActions, dispatch)
  })
)
export default class App extends Component {

  static propTypes = {
    todos: PropTypes.array.isRequired,
    actions: PropTypes.object.isRequired
  };

  render() {
    const { todos, actions } = this.props;

    return (
        <SplitterLayout vertical>
            <div>Header</div>
            <SplitterLayout horizontal>
                <FileTree />
                <div>
                    <Header addTodo={actions.addTodo} />
                    <MainSection todos={todos} actions={actions} />
                </div>
            </SplitterLayout>
        </SplitterLayout>
    );
  }
}
