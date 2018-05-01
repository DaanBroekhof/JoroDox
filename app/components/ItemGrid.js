import React from 'react';
import {Column, Table, AutoSizer} from 'react-virtualized';
import Draggable from 'react-draggable';
import {Link} from 'react-router-dom';
import _ from 'lodash';

export default class ItemGrid extends React.Component {
  state = {
    widths: {
      title: 0.33,
      totalCount: 0.33,
      actions: 0.33
    },
  };

  headerRenderer(width) {
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

  resizeRow = ({dataKey, deltaX, width}) => {
    this.setState(prevState => {
      const prevWidths = prevState.widths;
      const percentDelta = deltaX / width;

      const keys = _.keys(prevState.widths);

      const nextDataKey = keys[keys.indexOf(dataKey) + 1];

      return {
        widths: {
          ...prevWidths,
          [dataKey]: prevWidths[dataKey] + percentDelta,
          [nextDataKey]: prevWidths[nextDataKey] - percentDelta
        }
      };
    });
  };


  render() {
    const {list} = this.props;
    const {widths} = this.state;

    const rowHeight = 26;
    const headerHeight = 28;
    const fullHeight = (rowHeight * list.length) + headerHeight;

    return (
      <AutoSizer>
        {({ height, width }) => {
          height = height - 6;
          width = width - 2;

          if (fullHeight < height) {
            height = fullHeight;
          }

          return <Table
            headerHeight={headerHeight}
            rowHeight={rowHeight}
            height={height}
            width={width}
            rowCount={list.length}
            rowGetter={({index}) => list[index]}
            headerRowRenderer={({className, columns, style}) => {
              // Bugfix for when paddingRight is passed (we don't want it)
              style.paddingRight = 0;
              return <div className={className} role="row" style={style}>{columns}</div>;
            }}
          >
            <Column
              headerRenderer={this.headerRenderer(width)}
              dataKey="title"
              label="Title"
              width={widths.title * width}
              cellRenderer={({rowData}) => <Link to={`/structure/t/${rowData.id}`}>{rowData.title}</Link>}
            />
            <Column
              headerRenderer={this.headerRenderer(width)}
              dataKey="totalCount"
              label="Item count"
              width={widths.totalCount * width}
            />
            <Column
              dataKey="actions"
              label="Actions"
              width={widths.actions * width}
              cellRenderer={({rowData}) => <div></div>}
            />
          </Table>;
        }}
      </AutoSizer>
    );
  }
}
