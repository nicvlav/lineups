import * as React from "react"
import FormationSelector from "@/components/formation-selector"
// import PlayerList from "@/components/player-list"
import { usePlayers } from "@/context/players-provider"
import { Button } from "@/components/ui/button"
import { Share, Trash2 } from "lucide-react";
import { encodeStateToURL } from "@/data/state-manager";

import {
  Sidebar,
  SidebarContent,
  // SidebarGroup,
  // SidebarGroupContent,
  // SidebarGroupLabel,
  // SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

interface PlayersSidebarProps {
  compact: boolean;
  props?: React.ComponentProps<typeof Sidebar>;
}

const PlayersSidebar: React.FC<PlayersSidebarProps> = ({ compact, props }) => {
  const { clearGame, gamePlayers } = usePlayers();

  const handleShare = () => {
    const shareUrl = encodeStateToURL(gamePlayers);
    navigator.clipboard.writeText(shareUrl).then(() => alert("Shareable link copied!"));
  };

  return (
    <Sidebar {...(props ?? {})}>
      {/* <SidebarHeader>
        Players
      </SidebarHeader> */}
      <SidebarContent>

        <div className={`h-full flex flex-col gap-4 p-4 rounded-lg shadow-lg`}>
          {/* Content here */}


          <FormationSelector />

          {compact && (
            <Button variant="ghost"
              className={`flex-1 flex items-center justify-center p-2  transition-all duration-200 max-h-[60px]`}
              onClick={handleShare}>
              <Share size={18} />
              <span>Share Game</span>
            </Button>
          )}

          <Button variant="ghost"
            className={`flex-1 flex items-center justify-center p-2  transition-all duration-200 text-red-600 max-h-[60px]`}
            onClick={clearGame}>
            <Trash2 size={18} />
            <span>Clear Game</span>
          </Button>


          {/* Player List - This will expand to fill remaining space */}
          {/* <div className="p-0rounded-lg shadow-md flex-grow overflow-y-auto">
            <PlayerList />
          </div> */}
        </div>

      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}


export default PlayersSidebar;