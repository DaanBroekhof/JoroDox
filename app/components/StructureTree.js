import React from 'react';
import Icon from '@material-ui/core/Icon';
import {inject, observer} from 'mobx-react';
import {autorun, observable, reaction, action, computed} from 'mobx';
import ItemGrid from './ItemGrid';
import {Column} from 'react-virtualized';

import 'react-infinite-tree/dist/react-infinite-tree.css';

@inject('store')
@observer
export default class StructureTree extends React.Component {

  @observable.shallow treeData = [];
  @observable expandedNodes = {};
  @observable selectedNode = null;

  componentDidMount() {
    this.disposeDataReaction = reaction(
      () => [this.props.project.id, this.props.project.definition],
      () => {
        this.loadData();
        _.forOwn(this.expandedNodes, (expanded, id) => {
          if (expanded) {
            this.toggleRowById(id);
          }
        });
      },
      {fireImmediately: true}
    );

    this.disposeRouteReaction = reaction(
      () => [this.props.routeParams, this.props.project.definition],
      () => {
        const mappedParams = {
          category: this.props.routeParams.kind === 'c' ? this.props.routeParams.type : null,
          type: this.props.routeParams.kind === 't' ? this.props.routeParams.type : null,
          id: this.props.routeParams.kind === 't' ? this.props.routeParams.id : null,
        };

        if (!mappedParams.category && mappedParams.type) {
          const typeDefinition = this.props.project.definition.types.find(x => x.id === mappedParams.type);
          if (typeDefinition) {
            mappedParams.category = typeDefinition.category;
          }
        }

        if (this.treeData[0]) {
          const node = this.doOpenToPath(this.treeData[0], ['root', mappedParams.category, mappedParams.type].filter(x => x).join('.'));
          if (node) {
            // this.tree.selectNode(node);
          }
        }
      },
      {fireImmediately: true}
    );

    if (this.props.expandToDepth !== undefined) {
      this.disposeExpandReaction = reaction(
        () => [this.props.expandToDepth, this.props.project.id],
        () => this.expandNodeChildren(this.treeData, this.props.expandToDepth)
      );
      this.expandNodeChildren(this.treeData, this.props.expandToDepth);
    }
  }

  componentWillUnmount() {
    this.disposeDataReaction();
    this.disposeRouteReaction();
    if (this.disposeExpandReaction) {
      this.disposeExpandReaction();
    }
  }

  doOpenToPath(node, path) {
    if (_.startsWith(path, node.id + '.') && !this.expandedNodes[node.id]) {
      this.toggleRowById(node.id);
    }
    if (node.id === path) {
      if (!this.expandedNodes[node.id]) {
        //this.toggleRowById(node.id);
      }
      node.selected = true;
      if (this.selectedNode) {
        this.selectedNode.selected = false;
      }
      this.selectedNode = node;
      this.itemGrid.tableRef.scrollToRow(this.treeData.findIndex(x => x && node && x.id === node.id));
      return node;
    }

    for (const childNode of node.children) {
      const foundNode = this.doOpenToPath(childNode, path);
      if (foundNode) {
        return foundNode;
      }
    }
  }

  navigateToNode(node) {
    if (node.kind === 'root') {
      this.props.store.goto('/structure');
    }
    if (node.kind === 'category') {
      this.props.store.goto(`/structure/c/${node.kindId}`);
    }
    if (node.kind === 'type') {
      this.props.store.goto(`/structure/t/${node.kindId}`);
    }
    if (node.kind === 'item') {
      this.props.store.goto(`/structure/t/${node.kindId}/${node.kindId}`);
    }
  }

  expandNodeChildren(nodeChildren, depth) {
    if (!nodeChildren) {
      return;
    }

    nodeChildren.forEach(x => {
      if (x.depth > depth) {
        return;
      }
      if (!this.expandedNodes[x.id]) {
        this.toggleRowById(x.id);
      }
      if (x.children.length > 0) {
        this.expandNodeChildren(x.children, depth);
      }
    });
  }

  loadData() {
    const rootNode = {
      id: 'root',
      name: this.props.project.name,
      kind: 'root',
      children: [],
      depth: 0,
    };

    rootNode.children = _(this.props.project.definition.types).map(type => type.category).uniq().map(category => ({
      id: `root.${category}`,
      name: category,
      loadOnDemand: true,
      kind: 'category',
      kindId: category,
      depth: 1,
      children: _(this.props.project.definition.types).filter(x => x.category === category).sortBy(x => x.title).map(type => {
        return {
          id: `root.${category}.${type.id}`,
          name: type.title,
          kind: 'type',
          kindId: type.id,
          depth: 2,
          children: []
        };
      }).value(),
    })).value();

    this.treeData = [rootNode];
  }

  toggleRowById(id) {
    const index = this.treeData.findIndex(x => x && x.id === id);
    if (index !== -1) {
      this.toggleRow({index, rowData: this.treeData[index]});
    }
  }

  toggleRow({index, rowData}, noToggle) {
    if (!noToggle) {
      this.expandedNodes[rowData.id] = !this.expandedNodes[rowData.id];
    }

    let change = 0;

    if (this.expandedNodes[rowData.id]) {
      this.treeData.splice(index + 1, 0, ...rowData.children);

      rowData.children.forEach((child, key) => {
        if (this.expandedNodes[child.id]) {
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
    const subSum = _.sumBy(node.children, (x) => this.expandedNodes[x.id] ? this.getExpandedCount(x) : 0);
    return node.children.length + subSum;
  }

  render() {
    return (
      <ItemGrid
        ref={(ref) => { this.itemGrid = ref; }}
        list={this.treeData}
        headerHeight={0}
        rowHeight={22}
        rowStyle={{border: 'none'}}
        style={{background: 'white'}}
        onRowClick={(data) => {
          this.toggleRow(data);
          this.navigateToNode(data.rowData);
        }}
        headerRowRenderer={() => null}
        className="tree-sidebar"
        style={{overflowX: 'hidden'}}
        rowClassName={({index}) => this.selectedNode && this.treeData[index] && this.treeData[index].id === this.selectedNode.id ? 'selected-row' : ''}
        topMargin={5}>
        <Column
          width={30}
          dataKey="name"
          label="Name"
          cellRenderer={({rowData}) => (
            <span style={{marginLeft: (rowData.depth) * 20, position: 'relative', fontSize: 13.4}}>
              <a style={{position: 'absolute', display: 'block', left: -20, top: -4, width: 18, height: 20, textAlign: 'center', fontSize: 14, transform: this.expandedNodes[rowData.id] ? 'rotate(90deg)' : ''}}>{rowData.children.length ? '❯' : ''}</a>

              {rowData.children.length ?
                <Icon style={{fontSize: '19px', paddingTop: 4, display: 'inline', verticalAlign: 'bottom', marginRight: 2}}>folder</Icon> :
                <Icon style={{fontSize: '19px', paddingTop: 4, display: 'inline', verticalAlign: 'bottom', marginRight: 2}}>description</Icon>}
              {rowData.name}
            </span>
          )}
        />
      </ItemGrid>
    );
  }
}
