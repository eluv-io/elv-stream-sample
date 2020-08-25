import React from "react";
import {inject, observer} from "mobx-react";

@inject("videoStore")
@observer
class Profiles extends React.Component {
  render() {
    return (
      <div className="controls-container playout-controls">
        <h3 className="controls-header">Profile</h3>
        <select
          value={this.props.videoStore.profile}
          className="profile-select"
          onChange={event => this.props.videoStore.SetProfile(event.target.value)}
        >
          {
            Object.keys(this.props.videoStore.profileSettings).map(name =>
              <option value={name} key={`profile-${name}`}>{ name }</option>
            )
          }
        </select>
      </div>

    );
  }
}

export default Profiles;
