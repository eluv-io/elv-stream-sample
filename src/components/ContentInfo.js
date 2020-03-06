import React from "react";
import {inject, observer} from "mobx-react";
import {Action, onEnterPressed} from "elv-components-js";

@inject("videoStore")
@observer
class ContentInfo extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      contentId: this.props.videoStore.contentId
    };
  }

  ContentInput() {
    const Submit = () => this.props.videoStore.LoadVideo({contentId: this.state.contentId});

    return (
      <div className="content-input">
        <input
          value={this.state.contentId}
          onKeyPress={onEnterPressed(Submit)}
          onChange={event => this.setState({contentId: event.target.value})}
          placeholder="Object ID or Version Hash..."
        />
        <Action onClick={Submit}>Load</Action>
      </div>
    );
  }

  Title() {
    if(this.props.videoStore.error) {
      return (
        <h1 className="content-title error">{ this.props.videoStore.error }</h1>
      );
    }

    return (
      <h1 className="content-title">{ this.props.videoStore.title }</h1>
    );
  }

  render() {
    return (
      <React.Fragment>
        <div className="content-info-container">
          { this.ContentInput() }
        </div>
        { this.Title() }
        <div className="buffer" />
      </React.Fragment>
    );
  }
}

export default ContentInfo;
