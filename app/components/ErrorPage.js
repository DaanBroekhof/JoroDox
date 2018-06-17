// @flow
import React, {Component} from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import _ from 'lodash';
import {Link} from 'react-router-dom';
import {connect} from 'react-redux';
import {Column} from 'react-virtualized';
import JdxDatabase from '../utils/JdxDatabase';
import {incrementVersion} from '../actions/database';
import ItemGrid from './ItemGrid';

class ErrorPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      typeCounts: {},
      definition: JdxDatabase.getDefinition(props.project.gameType),
      errors: [],
    };
  }

  componentDidMount() {
    this.loadErrors(this.props.project);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.project.gameType !== this.state.gameType) {
      this.setState({definition: JdxDatabase.getDefinition(nextProps.project.gameType)});
    }
    if (nextProps.project.rootPath !== this.props.project.rootPath) {
      // reload
      this.loadErrors(nextProps.project);
    }
  }

  async loadErrors(project) {
    const errors = await (await JdxDatabase.getErrors(project)).toArray();

    return this.setState({errors});
  }


  render() {
    return (
      <Paper style={{flex: 1, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden'}}>
        <div className="ItemGrid">
          <ItemGrid list={this.state.errors}>
            <Column
              width={200}
              dataKey="message"
              label="Error message"
              cellRenderer={({rowData}) => <Link to={`/structure/t/${rowData.id}`}>{rowData.message}</Link>}
            />
            <Column
              width={100}
              dataKey="path"
              label="Path"
            />
            <Column
              width={100}
              dataKey="actions"
              label="Actions"
              cellRenderer={({rowData}) => <div>{JSON.stringify(rowData)}</div>}
            />
          </ItemGrid>
        </div>
      </Paper>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  incrementDatabaseVersion: () => {
    dispatch(incrementVersion());
  }
});

const mapStateToProps = state => {
  return {
    databaseVersion: state.database,
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(ErrorPage);
