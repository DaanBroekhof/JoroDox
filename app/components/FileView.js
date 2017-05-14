// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');


export default class FileView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            file: jetpack.inspect(this.props.match.params.path),
        };
    }

    componentWillReceiveProps(nextProps) {
        this.state = {
            file: jetpack.inspect(nextProps.match.params.path),
        };
    }

    render() {
        return (
            <div>
                <h2>{this.state.file.name}</h2>
                <p>Size: {this.state.file.size}</p>
            </div>
        );
    }
}
