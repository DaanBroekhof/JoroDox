import React from 'react';
import {Treebeard} from 'react-treebeard';
//import jorodox from '../themes/jorodox';
import styles from './FileTree.jss';
import injectSheet from 'react-jss'

const treeData = {
    name: 'blas',
    toggled: true,
    children: [
        {
            name: 'parent',
            children: [
                { name: 'child1' },
                { name: 'child2' }
            ]
        },
        {
            name: 'loading parent',
            loading: true,
            children: []
        },
        {
            name: 'parent',
            children: [
                {
                    name: 'nested parent',
                    children: [
                        { name: 'nested child 1' },
                        { name: 'nested child 2' }
                    ]
                }
            ]
        }
    ]
};

@injectSheet(styles)
export default class FileTree extends React.Component {
    constructor(props){
        super(props);
        this.state = {};
        this.onToggle = this.onToggle.bind(this);
    }
    onToggle(node, toggled){
        if(this.state.cursor){this.state.cursor.active = false;}
        node.active = true;
        if(node.children){ node.toggled = toggled; }
        this.setState({ cursor: node });
    }
    render(){
        return (
            <Treebeard
                data={treeData}
                onToggle={this.onToggle}
                animations={false}
                style={styles}
            />
        );
    }
}