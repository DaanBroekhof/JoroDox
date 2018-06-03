import React, {Component} from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

export default class AboutPage extends Component {
  render() {
    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
        <Typography variant="display2" gutterBottom>About the Jorodox Tool</Typography>
        <p>
          The Jorodox Tool is an application to assist in the creation of user-made mods for
          <a href="https://www.paradoxplaza.com/paradox-development-studio" target="_blank" rel="noopener noreferrer">Paradox Development Studio </a>
          games like <a href="https://www.paradoxplaza.com/europa-universalis-4" target="_blank" rel="noopener noreferrer">Europa Universalis 4 </a>
          and <a href="https://www.paradoxplaza.com/crusader-kings-2" target="_blank" rel="noopener noreferrer">Crusader Kings 2 </a>.
        </p>

        {/*
        <dl class="dl-horizontal property-list">
          <dt>Version</dt><dd>v1.</dd>
          <dt>By</dt><dd>Daan Broekhof (<a href="mailto:Daan Broekhof <daan.broekhof@gmail.com>" target="_blank">daan.broekhof@gmail.com</a>)</dd>
          <dt>Source</dt><dd><a href="https://github.com/DaanBroekhof/JoroDox" target="_blank">https://github.com/DaanBroekhof/JoroDox</a> - please report issues here</dd>
        </dl>
        */}

        <h3>Changelog</h3>

        <h4>v2.0.0-beta (from 2017-10-23)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Switched to using Electron & React, because Chrome had stopped giving disk-access to Chrome extensions.</li>
        </ul>

        <hr />

        <h4>v0.7.0 (2015-05-05)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Export PdxMesh models from EU4/CK2 to Collada format.</li>
          <li>Experimental CSV import of data</li>
          <li>Editing of province data, and multiple at once</li>
        </ul>

        <h4>v0.6.0 (2015-02-22)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Province selection for map view</li>
          <li>Data views for map interface (EU4 only)</li>
        </ul>

        <h4>v0.5.1 (2015-02-09)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Add support for multiple UV layers.</li>
        </ul>

        <h4>v0.5.0 (2015-02-08)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Better collada animation import options</li>
          <li>Configurable shaders & textures for PDXmeshes</li>
        </ul>

        <h4>v0.4.0 (2015-02-05)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Added pdx animation reading &amp; export from collada</li>
          <li>Can select pdx animations from same dir or subdirs</li>
        </ul>

        <h4>v0.3.1 (2015-02-02)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Fixed bug in model converter where last triangle in model would have incorrect texture UVs</li>
          <li>Redirect on mesh conversion</li>
          <li>Updated about &amp; version info</li>
        </ul>

        <h4>v0.3 (2015-01-31)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Fixed texture mapping for multi-UV-per-vertex models</li>
          <li>Added data cache view &amp; management in `settings` tab</li>
        </ul>

        <h4>v0.2 (2015-01-31)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Basic static Collada-to-pdxmesh converter added</li>
          <li>Pimped model viewer</li>
          <li>Refresh directory button</li>
        </ul>

        <h4>v0.1 (2015-01-05)</h4>
        <h5>Changes</h5>
        <ul>
          <li>Added basic data reading tools
            <ul>
              <li>View Paradox-script files (.asset, .txt, .map, .gfx and many others) in data-tree
                                structure
              </li>
              <li>View Paradox binary format `pdxmesh` format for meshes &amp; animations: .mesh, .anim)
                                data
              </li>
              <li>View image files (including .tga files, excluding .dds files)</li>
            </ul>
          </li>
          <li>Added some map tools
            <ul>
              <li>Load map image &amp; zoom/pan through it a-la google maps.</li>
              <li>Check `provinces.bmp` for anomolies like stray pixels.</li>
              <li>Generate `definition.csv` for `provinces.bmp`.</li>
              <li>Compare `provinces.bmp` to current `definition.csv`.</li>
              <li>Create `sea_starts` list for `definition.csv` from `seas.png` (non-standard file with
                                just the sea-provinces of provinces.bmp).
              </li>
            </ul>
          </li>
        </ul>
        <h5>Known issues</h5>
        <ul>

          <li>Reading big asset/data files can be slooooow. Know issue with the tree renderer, not the reader
                        code. Will fix in future.
          </li>
          <li>Most data reading/analyzing is not done in the background. Will fix at a later moment.</li>
        </ul>
      </Paper>
    );
  }
}
