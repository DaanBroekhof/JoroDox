import React from 'react';
import classNames from 'classnames';
import InfiniteTree from 'react-infinite-tree';
import Icon from '@material-ui/core/Icon';
import {Route} from 'react-router';
import 'react-infinite-tree/dist/react-infinite-tree.css';
import FileView from './FileView';

export default class ProjectsTree extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
    };
  }

  componentDidMount() {
    this.setTreeState(this.props.projects);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.projects !== nextProps.projects) {
      this.setTreeState(nextProps.projects);
    }
  }

  setTreeState(projects) {
    const treeData = [];
    projects.forEach(project => {
      treeData.push({
        id: project.id,
        name: project.name,
      });
    });

    return this.setState({
      treeData: {
        id: 'root',
        name: 'Projects',
        children: treeData,
      },
    }, () => {
      this.tree.loadData(this.state.treeData);
      this.tree.selectNode(this.tree.getNodeById(this.props.project.id));

      return true;
    });
  }


  render() {
    const fileTree = this;
    return (
      <Route render={({history}) => (
        <InfiniteTree
          style={{display: 'flex', flex: 1, backgroundColor: 'white'}}
          ref={(c) => { this.tree = c ? c.tree : null; }}
          autoOpen
          rowRenderer={(node, treeOptions) => {
            const {id, name, loadOnDemand = false, state} = node;
            const {depth, open, selected = false} = state;
            const more = node.hasChildren();

            return (
              <div className={classNames('infinite-tree-item', {'infinite-tree-selected': selected})} data-id={id}>
                <div className="infinite-tree-node" style={{marginLeft: (depth - 1) * 18}}>
                  {!more && loadOnDemand &&
                    <a className={classNames(treeOptions.togglerClass, 'infinite-tree-closed')}>❯</a>
                  }
                  {more && open &&
                    <a className={classNames(treeOptions.togglerClass)}>❯</a>
                  }
                  {more && !open &&
                    <a className={classNames(treeOptions.togglerClass, 'infinite-tree-closed')}>❯</a>
                  }
                  {!more && !loadOnDemand &&
                    <span className={classNames(treeOptions.togglerClass)} />
                  }
                  <span
                    className={classNames(['infinite-tree-type', more || loadOnDemand ? 'infinite-tree-type-more' : ''])}
                  >{more || loadOnDemand ?
                    <Icon style={{fontSize: '19px', paddingTop: '2px'}}>folder</Icon> :
                    <Icon style={{fontSize: '19px', paddingTop: '2px'}}>description</Icon>
                  }
                  </span>
                  <span className={classNames(['infinite-tree-title', FileView.getFileType(node) !== 'unknown' ? 'filetree-known-type' : ''])}>{name}</span>
                </div>
              </div>
            );
          }}
          selectable
          shouldSelectNode={(node) => {
            return true;
          }}
          onClick={(event) => {
            const target = event.target || event.srcElement; // IE8
            let nodeTarget = target;

            // Find the node
            while (nodeTarget && nodeTarget.parentElement !== this.tree.contentElement) {
              nodeTarget = nodeTarget.parentElement;
            }

            if (nodeTarget && nodeTarget.dataset) {
              const node = this.tree.getNodeById(nodeTarget.dataset.id);
              this.tree.selectNode(node);

            }
          }}
          onDoubleClick={(event) => {
            // dblclick event
          }}
          onKeyDown={(event) => {
            // keydown event
          }}
          onKeyUp={(event) => {
            // keyup event
          }}
          onOpenNode={(node) => {
            fileTree.doOpenToType(node);
          }}
          onCloseNode={(node) => {}}
          onSelectNode={(node) => {
            if (node && node.id !== 'root') {
              this.props.selectProject(node.id);
            }
          }}
          onClusterWillChange={() => {}}
          onClusterDidChange={() => {}}
          onContentWillUpdate={() => {}}
          onContentDidUpdate={() => {}}
        />)}
      />
    );
  }
}
