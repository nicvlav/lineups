import React, { useEffect, useState, useRef, useContext } from 'react';
import { PlayersContext } from "../../global/PlayersContext.jsx";
import { encodeStateToURL } from "../../global/stateManager";

const ShareButton = () => {
    const { players } =  useContext(PlayersContext);

    const handleShare = () => {
        const shareUrl = encodeStateToURL(players);
        navigator.clipboard.writeText(shareUrl).then(() => alert("Shareable link copied!"));
    };

    return <button onClick={handleShare}>Share Game State</button>;
};

export default ShareButton;
