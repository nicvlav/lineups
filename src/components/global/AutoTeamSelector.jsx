import React, { useState, useContext, useEffect } from "react";
import { PlayersContext } from "../../utility/PlayersContext";
import { Users, Dumbbell, Wand2, Check, RotateCcw, Search, ChevronDown, ChevronUp } from "lucide-react";

// Main component with tabs
const AutoTeamSelector = () => {
  const [activeTab, setActiveTab] = useState("generation");
  const [selectedPlayers, setSelectedPlayers] = useState([]);


  const { 
    players, 
    generateTeams, 
    zoneWeights, 
    setZoneWeights, 
    resetToDefaultWeights 
  } = useContext(PlayersContext);
  
  // Get non-temporary players and initialize selected players
  useEffect(() => {
    if (players && Array.isArray(players)) {
      const nonTemps = players.filter(player => !player.temp_formation);
      setSelectedPlayers(nonTemps.filter(player => player.team !== null && player.team !== "").map(player => player.id));
    }
  }, [players]);

  // Generate teams with selected players and weights
  const handleGenerateTeams = async () => {
    if (selectedPlayers.length < 2) {
      console.warn("Need at least 8 players to form teams");
      return;
    }

    const selectedPlayerObjects = players.filter(
      player => selectedPlayers.includes(player.id)
    );

    // Pass both selectedPlayerObjects and zoneWeights
    await generateTeams(selectedPlayerObjects);
  };

  // Tab button style with header bar-like appearance
  const tabButtonStyle = (isActive) => ({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    color: isActive ? '#3b82f6' : '#ffffff',
    flex: 1,
    cursor: 'pointer',
    margin: '0 4px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  });

  // Main component container style - fixed height
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '70vh',
    maxHeight: '70vh',
    minHeight: '70vh',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    color: '#1f2937'
  };

  // Top tabs area style - fixed at top
  const tabsAreaStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    padding: '8px',
    marginBottom: '8px'
  };

  // Content area style - flexible height
  const contentAreaStyle = {
    flex: '1 1 auto',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    border: '1px solid rgba(229, 231, 235, 0.5)'
  };

  // Generate button area style - fixed at bottom
  const generateButtonAreaStyle = {
    position: 'sticky',
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingTop: '12px'
  };

  return (
    <div style={containerStyle}>
      {/* Tab Navigation with buttons in a row */}
      <div style={tabsAreaStyle}>
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '8px' }}>
          <button
            style={tabButtonStyle(activeTab === "generation")}
            onClick={() => setActiveTab("generation")}
          >
            <Users size={16} style={{ marginRight: '8px' }} />
            <span>Teams</span>
          </button>
          <button
            style={tabButtonStyle(activeTab === "weighting")}
            onClick={() => setActiveTab("weighting")}
          >
            <Dumbbell size={16} style={{ marginRight: '8px' }} />
            <span>Weights</span>
          </button>
        </div>
      </div>

      {/* Main Content Area - Flexbox Container */}
      <div style={contentAreaStyle}>
        {activeTab === "generation" ? (
          <TeamGenerationTab
            players={players}
            selectedPlayers={selectedPlayers}
            setSelectedPlayers={setSelectedPlayers}
          />
        ) : (
          <WeightingTab
            zoneWeights={zoneWeights}
            setZoneWeights={setZoneWeights}
            resetZoneWeights={resetToDefaultWeights}
          />
        )}
      </div>
      
      {/* Generate Button - Fixed at Bottom */}
      <div style={generateButtonAreaStyle}>
        <button
          onClick={handleGenerateTeams}
          disabled={selectedPlayers.length < 2}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            width: '100%',
            backgroundColor: selectedPlayers.length < 2 ? 'rgba(209, 213, 219, 0.8)' : '#059669',
            color: selectedPlayers.length < 2 ? '#4b5563' : 'white',
            borderRadius: '6px',
            fontWeight: 500,
            cursor: selectedPlayers.length < 2 ? 'not-allowed' : 'pointer',
          }}
        >
          <Wand2 size={18} style={{ marginRight: '8px' }} />
          <span>Generate Two Teams</span>
        </button>
      </div>
    </div>
  );
};

// Team Generation Tab
const TeamGenerationTab = ({ players, selectedPlayers, setSelectedPlayers }) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter non-temporary players
  const getNonTemps = () => {
    if (!players || !Array.isArray(players)) {
      return [];
    }
    return players.filter(player => !player.temp_formation);
  };

  const nonTempPlayers = getNonTemps();
  
  // Filter players based on search
  const filteredPlayers = nonTempPlayers.filter(player => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle all players selection
  const toggleAll = () => {
    if (selectedPlayers.length === nonTempPlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(nonTempPlayers.map(p => p.id));
    }
  };

  // Toggle individual player selection
  const togglePlayer = (playerId) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  // Container style for the team generation tab
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    gap: '12px'
  };

  // Search area style - fixed at top
  const searchAreaStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    padding: '12px',
    borderBottom: '1px solid rgba(229, 231, 235, 0.5)',
    backdropFilter: 'blur(8px)'
  };

  // Info area style with modern design
  const infoAreaStyle = {
    padding: '0 12px',
    fontSize: '14px',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  // Player list container style
  const playerListContainerStyle = {
    flex: '1 1 auto',
    overflow: 'auto',
    padding: '0 12px 12px 12px',
    color: '#ffffff'
  };

  // Player card style
  const playerCardStyle = (isSelected) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    border: '1px solid rgba(229, 231, 235, 0.5)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    gap: '12px'
  });

  // Stat badge style
  const statBadgeStyle = (color, bgColor) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: color,
    backgroundColor: bgColor,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  });

  return (
    <div style={containerStyle}>
      {/* Search and Toggle Controls */}
      <div style={searchAreaStyle}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: '12px',
          width: '100%'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            flex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '8px 12px',
            border: '1px solid rgba(229, 231, 235, 0.5)',
            transition: 'all 0.2s ease'
          }}>
            <Search size={18} style={{ color: '#9ca3af', marginRight: '12px' }} />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                backgroundColor: 'transparent',
                color: '#ffffff',
                fontSize: '14px'
              }}
            />
          </div>
          
          <button
            onClick={toggleAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(229, 231, 235, 0.5)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {selectedPlayers.length === nonTempPlayers.length ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>

      {/* Selected count info with icon */}
      <div style={infoAreaStyle}>
        <Users size={16} style={{ color: '#ffffff' }} />
        <span>
          Selected {selectedPlayers.length} of {nonTempPlayers.length} players
          {selectedPlayers.length < 2 && (
            <span style={{ 
              color: '#ef4444',
              marginLeft: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              • Need at least 2 players
            </span>
          )}
        </span>
      </div>

      {/* Player List - Modern Cards */}
      <div style={playerListContainerStyle}>
        {filteredPlayers.length > 0 ? (
          filteredPlayers.map(player => (
            <div
              key={player.id}
              style={playerCardStyle(selectedPlayers.includes(player.id))}
              onClick={() => togglePlayer(player.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = selectedPlayers.includes(player.id) 
                  ? 'rgba(255, 255, 255, 0.3)' 
                  : 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = selectedPlayers.includes(player.id)
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {/* Checkbox */}
              <div style={{ 
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(player.id)}
                  onChange={() => togglePlayer(player.id)}
                  style={{ 
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#3b82f6'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Player Name */}
              <div style={{ 
                flex: 1,
                fontWeight: 500,
                fontSize: '14px',
                color: '#ffffff'
              }}>
                {player.name}
              </div>

              {/* Stats */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={statBadgeStyle('#b91c1c', 'rgba(254, 226, 226, 0.8)')}>
                  A:{player.attack || 0}
                </span>
                <span style={statBadgeStyle('#1e40af', 'rgba(219, 234, 254, 0.8)')}>
                  D:{player.defense || 0}
                </span>
                <span style={statBadgeStyle('#92400e', 'rgba(254, 243, 199, 0.8)')}>
                  P:{player.athleticism || 0}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#6b7280',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(229, 231, 235, 0.5)',
            marginTop: '12px'
          }}>
            No players match your search
          </div>
        )}
      </div>
    </div>
  );
};

// Weighting Tab
const WeightingTab = ({ zoneWeights, setZoneWeights, resetZoneWeights }) => {
  // Function to update a specific weight
  const updateZoneWeight = (zone, attribute, value) => {
    // Clamp value between 0 and 100
    const newValue = Math.max(0, Math.min(100, value));
    
    setZoneWeights(prev => ({
      ...prev,
      [zone]: {
        ...prev[zone],
        [attribute]: newValue
      }
    }));
  };

  // Helper to adjust weight by a given amount
  const adjustWeight = (zone, attribute, adjustment) => {
    const currentValue = zoneWeights[zone][attribute];
    updateZoneWeight(zone, attribute, currentValue + adjustment);
  };

  // Zone titles and attribute labels
  const zoneLabels = {
    0: "Defense Zone",
    1: "Midfield Zone",
    2: "Attack Zone"
  };
  
  const attributeLabels = {
    attack: "Attack",
    defense: "Defense",
    athleticism: "Athletic"
  };

  const attributeColors = {
    attack: "#ef4444",    // Red
    defense: "#3b82f6",   // Blue
    athleticism: "#f59e0b" // Yellow/Amber
  };

  // Container style for the weighting tab
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent'
  };

  // Header area style - fixed at top
  const headerAreaStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    padding: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  // Description area style
  const descriptionAreaStyle = {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#ffffff'
  };

  // Weightings area style - flexible height
  const weightingsAreaStyle = {
    flex: '1 1 auto',
    overflow: 'auto',
    padding: '8px'
  };

  // Zone container style
  const zoneContainerStyle = {
    marginBottom: '16px',
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(229, 231, 235, 0.7)'
  };

  // Attributes grid style
  const attributesGridStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '12px'
  };

  // Single attribute row style
  const attributeRowStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: '8px',
    border: '1px solid rgba(229, 231, 235, 0.7)',
    color: '#1f2937'
  };

  // Bottom info area style
  const infoAreaStyle = {
    margin: '16px 8px',
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 246, 255, 0.7)',
    border: '1px solid rgba(191, 219, 254, 0.7)',
    color: '#1e40af'
  };

  // Arrow button style
  const arrowButtonStyle = (disabled) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // width: '28px',
    height: '28px',
    borderRadius: '4px',
    backgroundColor: disabled ? 'rgba(243, 244, 246, 0.7)' : 'rgba(229, 231, 235, 0.7)',
    color: disabled ? '#555555' : '#0b5563',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer'
  });

  // Order of zones to display
  const zoneOrder = [0, 1, 2]; // Defense, Midfield, Attack

  return (
    <div style={containerStyle}>
      {/* Header with Reset Button */}
      <div style={headerAreaStyle}>
        <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0, color: '#ffffff' }}>
          Zone Weightings
        </h3>
        <button
          onClick={resetZoneWeights}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '8px 12px',
            border: '1px solid rgba(224, 224, 224, 0.8)',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.15)',
            cursor: 'pointer',
            color: '#ffffff'
          }}
        >
          <RotateCcw size={16} style={{ marginRight: '8px' }} />
          <span>Reset to Default</span>
        </button>
      </div>
      
      {/* Description */}
      <div style={descriptionAreaStyle}>
        Adjust how much each player attribute contributes to team balancing in different zones.
        Higher values (0-100) give more importance to that attribute in that zone.
      </div>
      
      {/* Zone Weightings - Scrollable Area */}
      <div style={weightingsAreaStyle}>
        {/* Render each zone's weights in the specified order */}
        {zoneOrder.map(zone => (
          <div key={zone} style={zoneContainerStyle}>
            <h4 style={{ fontSize: '16px', fontWeight: 500, margin: 0, color: '#ffffff' }}>{zoneLabels[zone]}</h4>
            
            <div style={attributesGridStyle}>
              {/* Render controls for each attribute in this zone in rows */}
              {Object.keys(attributeLabels).map(attribute => (
                <div key={`${zone}-${attribute}`} style={attributeRowStyle}>
                  {/* Attribute label */}
                  <div style={{ flex: '0 0 120px', fontWeight: 500, color: '#ffffff' }}>
                    {attributeLabels[attribute]}
                  </div>
                  
                  {/* Weight value and progress bar */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Progress bar */}
                    <div style={{ height: '8px', backgroundColor: 'rgba(229, 231, 235, 0.7)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${zoneWeights[zone][attribute]}%`,
                          backgroundColor: attributeColors[attribute]
                        }} 
                      />
                    </div>
                  </div>
                  
                  {/* Controls */}
                  <div style={{ flex: '0 0 120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => adjustWeight(zone, attribute, -5)}
                      style={arrowButtonStyle(zoneWeights[zone][attribute] <= 0)}
                      disabled={zoneWeights[zone][attribute] <= 0}
                    >
                      <ChevronDown size={16} />
                    </button>
                    <div style={{ 
                      width: '40px', 
                      textAlign: 'center',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(243, 244, 246, 0.7)',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: '#1f2937'
                    }}>
                      {zoneWeights[zone][attribute]}
                    </div>
                    <button
                      onClick={() => adjustWeight(zone, attribute, 5)}
                      style={arrowButtonStyle(zoneWeights[zone][attribute] >= 100)}
                      disabled={zoneWeights[zone][attribute] >= 100}
                    >
                      <ChevronUp size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      
        {/* Info Box */}
        <div style={infoAreaStyle}>
          <h4 style={{ margin: 0, marginBottom: '8px', fontWeight: 500, color: '#1e40af', display: 'flex', alignItems: 'center' }}>
            <Check size={16} style={{ marginRight: '8px' }} />
            <span>How Zone Weightings Work</span>
          </h4>
          <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
            These weights determine how important each player attribute is when balancing teams across different zones.
            For example, a high Attack Skill value in the Attack Zone means players with high attack ratings will be 
            evenly distributed between teams for balanced offensive capabilities.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoTeamSelector;
