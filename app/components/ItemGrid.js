import React from 'react';
import {Column, Table, AutoSizer} from 'react-virtualized';
import Draggable from 'react-draggable';
import {inject, observer} from 'mobx-react';
import {Link} from 'react-router-dom';
import _ from 'lodash';
import PropTypes from 'prop-types';


@observer
class ItemGrid extends React.Component {
  state = {
    widths: []
  };

  componentDidMount() {
    this.loadColumns(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.list !== this.props.list) {
      this.loadColumns(nextProps);
    }
  }

  loadColumns(props) {
    if (props.children) {
      let newWidths = [];
      let total = 0;
      props.children.forEach((column, i) => {
        newWidths[i] = column.props.width;
        total += column.props.width;
      });
      newWidths = newWidths.map(x => x / total);

      this.setState({widths: newWidths});
    }
  }

  headerRenderer(width, colIndex) {
    return ({
      columnData,
      dataKey,
      disableSort,
      label,
      sortBy,
      sortDirection
    }) => {
      return (
        <React.Fragment key={dataKey}>
          <div className="ReactVirtualized__Table__headerTruncatedText">
            {label}
          </div>
          <Draggable
            axis="x"
            defaultClassName="DragHandle"
            defaultClassNameDragging="DragHandleActive"
            onDrag={(event, {deltaX}) =>
              this.resizeRow({
                dataKey,
                colIndex,
                deltaX,
                width
              })
            }
            position={{x: 0}}
            zIndex={999}
          >
            <span className="DragHandleIcon">⋮</span>
          </Draggable>
        </React.Fragment>
      );
    };
  }

  resizeRow = ({dataKey, colIndex, deltaX, width}) => {
    this.setState(prevState => {
      const newWidths = prevState.widths.slice();
      const percentDelta = deltaX / width;

      newWidths[colIndex] += percentDelta;
      newWidths[colIndex + 1] -= percentDelta;


      return {
        widths: newWidths
      };
    });
  };


  render() {
    let {rowCount, rowGetter} = this.props;
    const {widths} = this.state;

    if (this.props.list) {
      rowCount = this.props.list.length;
      rowGetter = ({index}) => this.props.list[index];
    }

    const rowHeight = 26;
    const headerHeight = 28;
    const fullHeight = (rowHeight * rowCount) + headerHeight;

    return (
      <AutoSizer disableHeight={this.props.disableHeight}>
        {({height, width}) => {
          height -= 6;
          width -= 2;

          if (fullHeight < height) {
            height = fullHeight;
          }
          if (this.props.disableHeight) {
            height = fullHeight;
          }

          return (
            <Table
              ref={this.props.registerChild}
              headerHeight={headerHeight}
              rowHeight={rowHeight}
              height={height}
              width={width}
              rowCount={rowCount}
              rowGetter={rowGetter}
              onRowsRendered={this.props.onRowsRendered}
              headerRowRenderer={({className, columns, style}) => {
                // Bugfix for when paddingRight is passed (we don't want it)
                style.paddingRight = 0;
                return <div className={className} role="row" style={style}>{columns}</div>;
              }}
            >
              {React.Children.map(this.props.children, (child, i) => {
                return React.cloneElement(child, {
                  width: widths[i] * width,
                  headerRenderer: this.headerRenderer(width, i),
                });
              })}
            </Table>
          );
        }}
      </AutoSizer>
    );
  }
}

ItemGrid.propTypes = {
  list: PropTypes.arrayOf(PropTypes.object),
  rowCount: PropTypes.number,
  rowGetter: PropTypes.func,
  children: PropTypes.node,
  disableHeight: PropTypes.bool,
  onRowsRendered: PropTypes.func,
};

ItemGrid.defaultProps = {
  list: null,
  rowCount: null,
  rowGetter: null,
  children: [],
  disableHeight: false,
  onRowsRendered: undefined,
};


export default ItemGrid;
