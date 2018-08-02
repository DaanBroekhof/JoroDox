import React from 'react';
import {Column, Table, AutoSizer, InfiniteLoader} from 'react-virtualized';
import {inject, observer} from 'mobx-react';
import Draggable from 'react-draggable';
import {Link} from 'react-router-dom';
import _ from 'lodash';
import PropTypes from 'prop-types';
import ItemGrid from "./ItemGrid";

@observer
class InfiniteItemGrid extends React.Component {
  state = {
    list: [],
  };

  componentDidMount() {
    //this.loadColumns(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.databaseVersion !== this.props.databaseVersion) {
      this.reloadLastRows();
    }
  }

  isRowLoaded({index}) {
    return !!this.state.list[index];
  }

  reloadLastRows() {
    this.state.list = [];
    this.loaderRef.resetLoadMoreRowsCache(true);
  }

  async loadMoreRows({startIndex, stopIndex}) {
    const rows = await this.props.loadMoreRows({startIndex, stopIndex});

    for (let i = startIndex; i <= stopIndex; i += 1) {
      this.state.list[i] = rows[i - startIndex];
    }

    return this.state.list.slice(startIndex, stopIndex);
  }

  render() {
    return (
      <InfiniteLoader
        ref={(ref) => { this.loaderRef = ref; }}
        isRowLoaded={({index}) => !!this.state.list[index]}
        loadMoreRows={this.loadMoreRows.bind(this)}
        rowCount={this.props.rowCount}
      >
        {({onRowsRendered, registerChild}) => (
          <ItemGrid
            onRowsRendered={onRowsRendered}
            registerChild={registerChild}
            rowCount={this.props.rowCount}
            rowGetter={({index}) => (this.state.list[index] ? this.state.list[index] : ({}))}
          >
            {this.props.children}
          </ItemGrid>
        )}
      </InfiniteLoader>
    );
  }
}

InfiniteItemGrid.propTypes = {
  loadMoreRows: PropTypes.func,
  children: PropTypes.node,
  rowCount: PropTypes.number,
  databaseVersion: PropTypes.number,
};

InfiniteItemGrid.defaultProps = {
  loadMoreRows: null,
  rowCount: null,
  children: [],
  databaseVersion: null,
};


export default InfiniteItemGrid;
