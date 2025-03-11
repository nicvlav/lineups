import * as React from "react"
import FormationSelector  from "@/components/formation-selector"
import PlayerList  from "@/components/player-list"

import {
  Sidebar,
  SidebarContent,
  // SidebarGroup,
  // SidebarGroupContent,
  // SidebarGroupLabel,
  // SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

function PlayersSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      {/* <SidebarHeader>
        Players
      </SidebarHeader> */}
      <SidebarContent>

        <div className={`h-full flex flex-col gap-4 p-4 rounded-lg shadow-lg`}>
          {/* Content here */}

          <div className="p-2rounded-lg shadow-md flex-shrink-0">
            <FormationSelector />
          </div>

          {/* Player List - This will expand to fill remaining space */}
          <div className="p-0rounded-lg shadow-md flex-grow overflow-y-auto">
            <PlayerList />
          </div>
        </div>

      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

export default PlayersSidebar;