import React, { useContext } from 'react';
import { PlayersContext } from "../../utility/PlayersContext.jsx";
import { encodeStateToURL } from "../../utility/StateManager.jsx";

const ShareButton = () => {
    const { players } =  useContext(PlayersContext);

    const handleShare = () => {
        const shareUrl = encodeStateToURL(players);
        navigator.clipboard.writeText(shareUrl).then(() => alert("Shareable link copied!"));
    };

    return <button onClick={handleShare}>Share</button>;
};

export default ShareButton;
