# Sports Team Lineup Generator

## Overview
The **Sports Team Lineup Generator** is a web-based application designed to help users create, manage, and customize sports team formations. Users can add players, assign them to positions, and modify lineups dynamically using a simple drag-and-drop interface.

## Features
- **Player Management**: Create and maintain a list of players.
- **Custom Formations**: Arrange players into formations for various sports.
- **Interactive Field**: Drag players onto the field to assign positions.
- **Dynamic Role Switching**: Double-click players on the field to toggle between main and guest roles.
- **Position Adjustments**: Drag player icons within the field to rearrange positions easily.

## Installation & Setup

### Prerequisites
Ensure you have the following installed:
- **Python 3.8+** (for the backend)
- **Node.js 16+** (for the frontend)
- **npm** (comes with Node.js)

### Backend Setup (FastAPI)
1. Navigate to the `backend` directory:
   ```sh
   cd backend
   ```
2. Install required Python packages:
   ```sh
   pip install fastapi uvicorn pydantic sqlite3
   ```
3. Start the FastAPI server with Uvicorn:
   ```sh
   uvicorn backend.main:app --reload
   ```
   The API will now be running at `http://127.0.0.1:8000/`.

### Frontend Setup (React + Vite)
1. Navigate to the `frontend` directory:
   ```sh
   cd frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm run dev
   ```
   The frontend will now be running at the URL provided in the terminal (usually `http://localhost:5173/`).

## Usage
1. **Add Players**: Create a list of players that can be assigned to formations.
2. **Drag & Drop Players**: Move players from the sidebar into the field to set up a formation.
3. **Adjust Player Positions**: Click and drag players within the field to reposition them.
4. **Switch Player Roles**: Double-click a player to toggle between main and guest status.
5. **Modify Formations**: Experiment with different setups to optimize your team’s strategy.

## Contributing
Contributions are welcome! If you’d like to improve the project, please submit a pull request or open an issue.

## License
This project is licensed under the MIT License.

