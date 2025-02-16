// formations.js
const formations = [
  {
    id: 1,
    name: "2-2",
    num_players: 5,
    positions: [
      { name: "GK", x: 0.5, y: 1.0 },
      { name: "DF", x: 0.3, y: 0.5 },
      { name: "DF", x: 0.7, y: 0.5 },
      { name: "FW", x: 0.4, y: 0.2 },
      { name: "FW", x: 0.6, y: 0.2 }
    ]
  },
  {
    id: 2,
    name: "2-2-1",
    num_players: 6,
    positions: [
      { name: "GK", x: 0.5, y: 1.0 },
      { name: "DF", x: 0.3, y: 0.6 },
      { name: "DF", x: 0.7, y: 0.6 },
      { name: "MF", x: 0.4, y: 0.4 },
      { name: "MF", x: 0.6, y: 0.4 },
      { name: "FW", x: 0.5, y: 0.2 }
    ]
  },
  {
    id: 3,
    name: "2-3-1",
    num_players: 7,
    positions: [
      { name: "GK", x: 0.5, y: 1.0 },
      { name: "DF", x: 0.2, y: 0.6 },
      { name: "DF", x: 0.8, y: 0.6 },
      { name: "MF", x: 0.3, y: 0.4 },
      { name: "MF", x: 0.5, y: 0.4 },
      { name: "MF", x: 0.7, y: 0.4 },
      { name: "FW", x: 0.5, y: 0.2 }
    ]
  },
  {
    id: 4,
    name: "3-3-1",
    num_players: 8,
    positions: [
      { name: "GK", x: 0.5, y: 1.0 },
      { name: "DF", x: 0.2, y: 0.6 },
      { name: "DF", x: 0.5, y: 0.6 },
      { name: "DF", x: 0.8, y: 0.6 },
      { name: "MF", x: 0.3, y: 0.4 },
      { name: "MF", x: 0.5, y: 0.4 },
      { name: "MF", x: 0.7, y: 0.4 },
      { name: "FW", x: 0.5, y: 0.2 }
    ]
  },
  {
    id: 5,
    name: "3-3-2",
    num_players: 9,
    positions: [
      { name: "GK", x: 0.5, y: 1.0 },
      { name: "DF", x: 0.2, y: 0.7 },
      { name: "DF", x: 0.5, y: 0.7 },
      { name: "DF", x: 0.8, y: 0.7 },
      { name: "MF", x: 0.3, y: 0.5 },
      { name: "MF", x: 0.5, y: 0.5 },
      { name: "MF", x: 0.7, y: 0.5 },
      { name: "FW", x: 0.4, y: 0.2 },
      { name: "FW", x: 0.6, y: 0.2 }
    ]
  },
  {
    id: 6,
    name: "4-3-2",
    num_players: 10,
    positions: [
      { name: "GK", x: 0.5, y: 1.0 },
      { name: "DF", x: 0.1, y: 0.7 },
      { name: "DF", x: 0.4, y: 0.7 },
      { name: "DF", x: 0.6, y: 0.7 },
      { name: "DF", x: 0.9, y: 0.7 },
      { name: "MF", x: 0.3, y: 0.5 },
      { name: "MF", x: 0.5, y: 0.5 },
      { name: "MF", x: 0.7, y: 0.5 },
      { name: "FW", x: 0.4, y: 0.2 },
      { name: "FW", x: 0.6, y: 0.2 }
    ]
  },
  {
    id: 7,
    name: "4-4-2",
    num_players: 11,
    positions: [
      { name: "GK", x: 0.5, y: 1.0 },
      { name: "LB", x: 0.1, y: 0.7 },
      { name: "CB1", x: 0.3, y: 0.7 },
      { name: "CB2", x: 0.7, y: 0.7 },
      { name: "RB", x: 0.9, y: 0.7 },
      { name: "LM", x: 0.2, y: 0.5 },
      { name: "CM1", x: 0.4, y: 0.5 },
      { name: "CM2", x: 0.6, y: 0.5 },
      { name: "RM", x: 0.8, y: 0.5 },
      { name: "ST1", x: 0.35, y: 0.2 },
      { name: "ST2", x: 0.65, y: 0.2 }
    ]
  },
  {
    id: 8,
    name: "3-5-2",
    num_players: 11,
    positions: [
      { name: "GK", x: 0.5, y: 1.0 },
      { name: "CB", x: 0.2, y: 0.7 },
      { name: "CB", x: 0.5, y: 0.7 },
      { name: "CB", x: 0.8, y: 0.7 },
      { name: "LM", x: 0.1, y: 0.5 },
      { name: "CM1", x: 0.3, y: 0.5 },
      { name: "CM2", x: 0.5, y: 0.5 },
      { name: "CM3", x: 0.7, y: 0.5 },
      { name: "RM", x: 0.9, y: 0.5 },
      { name: "ST1", x: 0.35, y: 0.2 },
      { name: "ST2", x: 0.65, y: 0.2 }
    ]
  },
  {
    id: 9,
    name: "4-4-3",
    num_players: 12,
    positions: [
      { name: "GK", x: 0.5, y: 1.0 },
      { name: "LB", x: 0.1, y: 0.7 },
      { name: "CB1", x: 0.3, y: 0.7 },
      { name: "CB2", x: 0.7, y: 0.7 },
      { name: "RB", x: 0.9, y: 0.7 },
      { name: "LM", x: 0.2, y: 0.5 },
      { name: "CM1", x: 0.4, y: 0.5 },
      { name: "CM2", x: 0.6, y: 0.5 },
      { name: "RM", x: 0.8, y: 0.5 },
      { name: "LW", x: 0.25, y: 0.2 },
      { name: "ST", x: 0.5, y: 0.2 },
      { name: "RW", x: 0.75, y: 0.2 }
    ]
  }
];

export default formations;
