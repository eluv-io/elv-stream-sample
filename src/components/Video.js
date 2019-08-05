import React from "react";
import PropTypes from "prop-types";
import HLSPlayer from "../../node_modules/hls.js/dist/hls";
import DashJS from "dashjs";

class Video extends React.Component {
  constructor(props) {
    super(props);

    this.InitializeVideo = this.InitializeVideo.bind(this);
  }

  InitializeVideo(video) {
    if(!video) { return; }

    const videoUrl = this.props.playoutOptions.playoutUrl;
    if(this.props.videoType === "hls") {
      if(video.canPlayType("application/vnd.apple.mpegURL")) {
        // This browser can play HLS natively
        video.src = videoUrl;
      } else {
        const player = new HLSPlayer();
        player.loadSource(videoUrl);
        player.attachMedia(video);
      }
    } else {
      const player = DashJS.MediaPlayer().create();

      if(this.props.drm === "widevine") {
        const widevineUrl = this.props.playoutOptions.drms.widevine.licenseServers[0];

        player.setProtectionData({
          "com.widevine.alpha": {
            "serverURL": widevineUrl,
            "httpRequestHeaders": {
              "Authorization": `Bearer ${this.props.authToken}`
            },
            "withCredentials": false
          }
        });
      }

      player.initialize(video, videoUrl, false);
    }
  }

  render() {
    return (
      <div className="video-container">
        <h1>{this.props.metadata.name}</h1>
        <video
          poster={this.props.posterUrl}
          crossOrigin="anonymous"
          ref={this.InitializeVideo}
          muted={false}
          autoPlay={false}
          controls={true}
          preload="auto"
        />
      </div>
    );
  }
}

Video.propTypes = {
  authToken: PropTypes.string,
  drm: PropTypes.string,
  metadata: PropTypes.object,
  playoutOptions: PropTypes.object.isRequired,
  posterUrl: PropTypes.string,
  videoType: PropTypes.string.isRequired,
};

export default Video;
