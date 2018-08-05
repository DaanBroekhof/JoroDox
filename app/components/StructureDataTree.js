// @flow
import React, {Component} from 'react';
import {Column} from 'react-virtualized';
import ItemGrid from './ItemGrid';

import {inject, observer} from 'mobx-react';
import {autorun, observable, reaction, action} from 'mobx';


@observer
export default class StructureDataTree extends Component {

  @observable.shallow treeData = [];

  constructor(props) {
    super(props);

    this.state = {
      fileTreeData: this.props.data
    };
  }

  componentDidMount() {
    this.disposeAutorun = reaction(
      () => this.props.data,
      () => {
        this.loadData(this.props.data);
        if (this.props.expandToDepth !== undefined) {
          this.expandNodeChildren(this.treeData, this.props.expandToDepth);
        }
      },
      {fireImmediately: true}
    );
  }

  componentWillUnmount() {
    this.disposeAutorun();
    if (this.disposeReaction) {
      this.disposeReaction();
    }
  }

  @action
  expandNodeChildren(nodeChildren, depth) {
    if (!nodeChildren) {
      return;
    }

    nodeChildren.slice().forEach(x => {
      if (x.depth > depth) {
        return;
      }
      this.toggleRowById(x.id);
      if (x.children.length > 0) {
        this.expandNodeChildren(x.children, depth);
      }
    });
  }

  loadData() {
    const rootNode = this.createTreeNode('data', this.props.data, 'root');
    this.treeData = rootNode.children;
  }

  @action
  toggleRowById(id) {
    const index = this.treeData.findIndex(x => x && x.id === id);
    if (index !== -1) {
      this.toggleRow({index, rowData: this.treeData[index]});
    }
  }

  toggleRow({index, rowData}, noToggle) {
    if (!noToggle) {
      rowData.expanded = !rowData.expanded;
    }

    let change = 0;

    if (rowData.expanded) {
      this.treeData.splice(index + 1, 0, ...rowData.children);

      rowData.children.forEach((child, key) => {
        if (child.expanded) {
          change += this.toggleRow({index: index + key + change + 1, rowData: child}, true);
        }
      });

      change += rowData.children.length;
    } else {
      change = -this.getExpandedCount(rowData);
      this.treeData.splice(index + 1, -change);
    }

    return change;
  }

  getExpandedCount(node) {
    const subSum = _.sumBy(node.children, (x) => x.expanded ? this.getExpandedCount(x) : 0);
    return node.children.length + subSum;
  }


  createTreeNode(key, value, path, depth) {
    if (!depth) {
      depth = 0;
    }

    const node = {
      id: path + '.' + key,
      depth,
      name: key,
      children: [],
      value: null,
    };

    if (_.isArray(value) && value.length > 100 && value.slice(100).every(x => !_.isObject(x))) {
      node.value = value;
    } else if (_.isArray(value)) {
      node.children = _.values(value).map((x, index) => this.createTreeNode(index, x, path + '.' + key, depth + 1));
    } else if (_.isObject(value)) {
      node.children = _.entries(value).map(([k, v]) => this.createTreeNode(k, v, path + '.' + key, depth + 1));
    } else {
      node.value = value;
    }

    return node;
  }

  render() {
    return (
      <ItemGrid
        list={this.treeData}
        style={{minHeight: 200}}
        disableHeight
        maxHeight={this.props.maxHeight}
        onRowClick={this.toggleRow.bind(this)}
        className="structure-data-tree"
        rowClassName={({index}) => this.treeData[index] && this.treeData[index].children.length ? 'expandable-row' : ''}
        headerCorrectionWidth={-6}
        headerCorrectionHeight={-2}
      >
        <Column
          width={30}
          dataKey="name"
          label="Name"
          cellRenderer={({rowData}) => (
            <span style={{marginLeft: (rowData.depth) * 20, position: 'relative'}}>
              <a style={{position: 'absolute', display: 'block', left: -20, top: -2, width: 18, height: 22, textAlign: 'center', fontSize: 14, transform: rowData.expanded ? 'rotate(90deg)' : ''}}>{rowData.children.length ? '❯' : ''}</a>
              {rowData.name}
            </span>
          )}
        />
        <Column
          width={100}
          dataKey="value"
          label="Data"
          style={{color: 'green'}}
          cellRenderer={({rowData}) => {
            if (rowData.children.length) {
              if (rowData.expanded) {
                return '';
              }
              return <em style={{color: 'lightgrey'}}>{rowData.children.length} items</em>;
            }
            if (_.isArray(rowData.value)) {
              return rowData.value.length + ' items: [' + rowData.value.slice(0, 20).join(', ') + (rowData.value.length > 20 ? '... '+ (rowData.value.length - 20) + ' more items' : '') + ']';
            }
            console.log(rowData.value);
            return rowData.value;
          }}
        />
      </ItemGrid>
    );
  }
}
