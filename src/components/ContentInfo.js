import React from "react";
import {inject, observer} from "mobx-react";
import {Action, onEnterPressed} from "elv-components-js";

@inject("videoStore")
@observer
class ContentInfo extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      contentId: this.props.videoStore.contentId || ""
    };
  }

  AvailableContent() {
    const content = EluvioConfiguration.availableContent;

    if(!content || content.length === 0) { return null; }

    const options = content.map(({title, versionHash}) =>
      <option key={`available-content-${versionHash}`} value={versionHash}>{title}</option>
    );

    return (
      <select
        value={this.props.videoStore.contentId}
        className="available-content-select"
        onChange={event => {
          this.props.videoStore.LoadVideo({contentId: event.target.value});
          this.setState({contentId: event.target.value});
        }}
      >
        <option value="">{"Sample Content..."}</option>
        { options }
      </select>
    );
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
        <h1 className="title content-title error">{ this.props.videoStore.error }</h1>
      );
    }

    const sampleContent = (EluvioConfiguration.availableContent || [])
      .find(({versionHash}) => versionHash === this.props.videoStore.contentId);

    if(sampleContent) {
      return (
        <div className="title content-title-sample">
          <h1 className="content-title">{ sampleContent.title || this.props.videoStore.title }</h1>
          { sampleContent.subHeader ? <h3>{ sampleContent.subHeader }</h3> : null }
        </div>
      );
    }

    return (
      <h1 className="title content-title">{ this.props.videoStore.title }</h1>
    );
  }

  render() {
    return (
      <React.Fragment>
        <div className="selection content-info-container">
          { this.ContentInput() }
          { this.AvailableContent() }
        </div>
        { this.Title() }
      </React.Fragment>
    );
  }
}

export default ContentInfo;
