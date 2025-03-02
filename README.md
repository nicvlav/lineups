# Sports Team Lineup Generator

## Overview
The **Sports Team Lineup Generator** is a web-based application designed to help users create, manage, and customize sports team formations. Users can add players, assign them to positions, and modify lineups dynamically using a simple drag-and-drop interface.

## Features
- **Player Management**: Create and maintain a list of players.
- **Custom Formations**: Arrange players into formations for various sports.
- **Interactive Field**: Drag players onto the field to assign positions.
- **Dynamic Role Switching**: Double-click players on the field to toggle between main and guest roles.
- **Position Adjustments**: Drag player icons within the field to rearrange positions easily.
- **Generate Balanced Teams**: Automatically generate balanced teams based on adjustable zone weights.
- **Session Persistence**: Uses IndexedDB to cache tabs for session continuity.
- **Sharable Links**: Packs all game data into the URL for easy sharing without external storage.
- **Privacy-Conscious**: No data is stored on a server; all data remains local to the user.

## Deployment
The app is hosted and available at:
🔗 [https://nicvlav.github.io/lineups/](https://nicvlav.github.io/lineups/)

## How It Works
1. **Add Players**: Create a list of players that can be assigned to formations.
2. **Drag & Drop Players**: Move players from the sidebar into the field to set up a formation.
3. **Adjust Player Positions**: Click and drag players within the field to reposition them.
4. **Switch Player Roles**: Double-click a player to toggle between main and guest status.
5. **Modify Formations**: Experiment with different setups to optimize your team’s strategy.
6. **Generate Balanced Teams**: Assign players automatically using weighted attributes (attack, defense, athleticism) that add up to 1.
7. **Session Caching**: IndexedDB ensures tabs retain session data locally, even after refreshes.
8. **Share Your Setup**: The entire game state is encoded into the URL, making it easy to share formations with others.
    - No URL shortener is used by default to ensure transparency and data control.
    - Since no external storage is used, there is no persistent data collection.

## Contributing
Contributions are welcome! If you’d like to improve the project, please submit a pull request or open an issue.

## License
This project is licensed under the MIT License.

