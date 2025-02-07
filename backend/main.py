from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from uuid import uuid4

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "game.db"

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create the players table (master list of all players)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            uid TEXT PRIMARY KEY,
            name TEXT NOT NULL
        )
    """)

    # Create the game table (tracks player positions and teams)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game (
            game_uid TEXT PRIMARY KEY,       -- Unique ID for each player entry in the game
            base_player_uid TEXT,   -- Foreign key referencing players(uid)
            team TEXT NOT NULL,
            x REAL DEFAULT 0.5,
            y REAL DEFAULT 0.5,
            FOREIGN KEY (base_player_uid) REFERENCES players(uid) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()

initialize_db()

class Player(BaseModel):
    name: str

class PlayerInGame(BaseModel):
    game_uid: str = ""
    base_player_uid: str = ""
    team: str = ""
    x: float = 0.5
    y: float = 0.5

@app.get("/players")
def get_players():
    conn = get_db_connection()
    players = conn.execute("SELECT * FROM players").fetchall()
    conn.close()
    return [dict(player) for player in players]

@app.post("/players")
def add_player(player: Player):
    conn = get_db_connection()
    uid = str(uuid4())
    conn.execute("INSERT INTO players (uid, name) VALUES (?, ?)", (uid, player.name))
    conn.commit()
    conn.close()
    return {"uid": uid, "name": player.name}

@app.delete("/players/{uid}")
def delete_player(uid: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM players WHERE uid = ?", (uid,))
    conn.commit()
    conn.close()
    return {"detail": "Player deleted successfully"}

@app.get("/game")
def get_game():
    conn = get_db_connection()
    game = conn.execute("SELECT * FROM game").fetchall()
    conn.close()
    return [dict(entry) for entry in game]

@app.post("/game/{team}")
def add_player_to_game(team: str, player: PlayerInGame):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Ensure the player exists in the main players table
    player_exists = cursor.execute("SELECT 1 FROM players WHERE uid = ?", (player.base_player_uid,)).fetchone()
    if not player_exists:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid UID")

    # Check if player is already in the game
    existing_entry = cursor.execute("SELECT team FROM game WHERE base_player_uid = ?", (player.base_player_uid,)).fetchone()

    if existing_entry:
        # If the player exists, update the team if different
        cursor.execute("UPDATE game SET team = ?, x = ?, y = ? WHERE base_player_uid = ?", (team, player.x, player.y, player.base_player_uid))
        print("found!")
    else:
        # Otherwise, insert the player into the game
        cursor.execute("INSERT INTO game (game_uid, base_player_uid, team, x, y) VALUES (?, ?, ?, ?, ?)", (str(uuid4()), player.base_player_uid, team, player.x, player.y))
        print("not found!")

    conn.commit()
    conn.close()
    return {"message": "Player added or updated", "team": team, "base_player_uid": player.base_player_uid}

@app.put("/game/{team}")
def update_player_in_game(team: str, player: PlayerInGame):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Ensure the player exists in the game
    existing_entry = cursor.execute("SELECT 1 FROM game WHERE base_player_uid = ?", (player.base_player_uid,)).fetchone()

    print(player)

    if not existing_entry:
        conn.close()
        raise HTTPException(status_code=404, detail="Player not found in game")

    # Update the player's position
    cursor.execute("UPDATE game SET x = ?, y = ? WHERE base_player_uid = ?", (player.x, player.y, player.base_player_uid))

    conn.commit()
    conn.close()
    return {"message": "Player position updated", "team": team, "uid": player.base_player_uid}

@app.delete("/game/{uid}")
def remove_player_from_game(uid: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Delete the player from the game table
    cursor.execute("DELETE FROM game WHERE uid = ?", (uid,))

    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Player not found in game")

    conn.commit()
    conn.close()
    return {"message": "Player removed", "uid": uid}