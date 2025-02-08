from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from uuid import uuid4
from typing import Optional

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

def populate_formations():
    conn = get_db_connection()
    conn.execute("DELETE FROM formations")
    cursor = conn.cursor()

    formations = [
        # 5-player formations
        ("2-2", 5, [(0.5, 1.0, "GK"), (0.3, 0.5, "DF"), (0.7, 0.5, "DF"), (0.4, 0.2, "FW"), (0.6, 0.2, "FW")]),
        
        # 6-player formations
        ("2-2-1", 6, [(0.5, 1.0, "GK"), (0.3, 0.6, "DF"), (0.7, 0.6, "DF"), (0.4, 0.4, "MF"), (0.6, 0.4, "MF"), (0.5, 0.2, "FW")]),
        
        # 7-player formations
        ("2-3-1", 7, [(0.5, 1.0, "GK"), (0.2, 0.6, "DF"), (0.8, 0.6, "DF"),
                      (0.3, 0.4, "MF"), (0.5, 0.4, "MF"), (0.7, 0.4, "MF"), (0.5, 0.2, "FW")]),
        
        # 8-player formations
        ("3-3-1", 8, [(0.5, 1.0, "GK"), (0.2, 0.6, "DF"), (0.5, 0.6, "DF"), (0.8, 0.6, "DF"),
                      (0.3, 0.4, "MF"), (0.5, 0.4, "MF"), (0.7, 0.4, "MF"), (0.5, 0.2, "FW")]),
        
        # 9-player formations
        ("3-3-2", 9, [(0.5, 1.0, "GK"), (0.2, 0.7, "DF"), (0.5, 0.7, "DF"), (0.8, 0.7, "DF"),
                      (0.3, 0.5, "MF"), (0.5, 0.5, "MF"), (0.7, 0.5, "MF"), (0.4, 0.2, "FW"), (0.6, 0.2, "FW")]),
        
        # 10-player formations
        ("4-3-2", 10, [(0.5, 1.0, "GK"), (0.1, 0.7, "DF"), (0.4, 0.7, "DF"), (0.6, 0.7, "DF"), (0.9, 0.7, "DF"),
                       (0.3, 0.5, "MF"), (0.5, 0.5, "MF"), (0.7, 0.5, "MF"), (0.4, 0.2, "FW"), (0.6, 0.2, "FW")]),
        
        # 11-player formations
        ("4-4-2", 11, [(0.5, 1.0, "GK"), (0.1, 0.7, "LB"), (0.3, 0.7, "CB1"), (0.7, 0.7, "CB2"), (0.9, 0.7, "RB"),
                       (0.2, 0.5, "LM"), (0.4, 0.5, "CM1"), (0.6, 0.5, "CM2"), (0.8, 0.5, "RM"),
                       (0.35, 0.2, "ST1"), (0.65, 0.2, "ST2")]),
        ("3-5-2", 11, [(0.5, 1.0, "GK"), (0.2, 0.7, "CB"), (0.5, 0.7, "CB"), (0.8, 0.7, "CB"),
                       (0.1, 0.5, "LM"), (0.3, 0.5, "CM1"), (0.5, 0.5, "CM2"), (0.7, 0.5, "CM3"), (0.9, 0.5, "RM"),
                       (0.35, 0.2, "ST1"), (0.65, 0.2, "ST2")]),
        
        # 12-player formations
        ("4-4-3", 12, [(0.5, 1.0, "GK"), (0.1, 0.7, "LB"), (0.3, 0.7, "CB1"), (0.7, 0.7, "CB2"), (0.9, 0.7, "RB"),
                       (0.2, 0.5, "LM"), (0.4, 0.5, "CM1"), (0.6, 0.5, "CM2"), (0.8, 0.5, "RM"),
                       (0.25, 0.2, "LW"), (0.5, 0.2, "ST"), (0.75, 0.2, "RW")])
    ]

    for name, num_players, positions in formations:
        cursor.execute("INSERT INTO formations (name, num_players) VALUES (?, ?)", (name, num_players))
        formation_id = cursor.lastrowid  # Get the last inserted formation ID
        
        for x, y, position_name in positions:
            cursor.execute("INSERT INTO formation_positions (formation_id, x, y, position_name) VALUES (?, ?, ?, ?)",
                           (formation_id, x, y, position_name))

    conn.commit()
    conn.close()



def initialize_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            uid INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            attack INTEGER DEFAULT 3,
            defense INTEGER DEFAULT 3,
            athleticism INTEGER DEFAULT 3      
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            base_player_uid INTEGER DEFAULT NULL,
            name TEXT NOT NULL,
            team TEXT NOT NULL,
            x REAL DEFAULT 0.5,
            y REAL DEFAULT 0.5,
            FOREIGN KEY (base_player_uid) REFERENCES players(uid) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS formations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            num_players INTEGER NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS formation_positions (
            formation_id INTEGER,
            x REAL NOT NULL,
            y REAL NOT NULL,
            position_name TEXT,
            FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()

    # Populate default formations
    populate_formations()

# Run the initialization
initialize_db()

class Player(BaseModel):
    name: str
    defense: int = 3
    attack: int = 3
    athleticism: int = 3 

class PlayerInGame(BaseModel):
    id: Optional[int] = None
    base_player_uid: Optional[int] = None
    name: str = "Guest"
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
    conn.execute("INSERT INTO players (name) VALUES (?)", (player.name,))
    conn.commit()
    conn.close()
    return {"name": player.name}

@app.delete("/players/{uid}")
def delete_player(uid: int):
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

@app.post("/game/clear")
def clear_game():
    conn = get_db_connection()
    conn.execute("DELETE FROM game")
    conn.close()
    return {"detail": "Game cleared successfully"}

@app.post("/game/{team}")
def add_player_to_game(team: str, player: PlayerInGame):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if player is already in the game
    existing_entry = cursor.execute("SELECT team FROM game WHERE id = ?", (player.id,)).fetchone()

    if existing_entry:
        # If the player exists, update the team if different
        cursor.execute("UPDATE game SET team = ?, x = ?, y = ? WHERE id = ?", (team, player.x, player.y, player.id))
        print("found!")
    else:  
        # if we have an existing 
        player_data = cursor.execute("SELECT name FROM players WHERE uid = ?", (player.base_player_uid,)).fetchone()

        if (not player.base_player_uid == None) and (player_data):
            cursor.execute("INSERT INTO game (base_player_uid, name, team, x, y) VALUES (?, ? , ?, ?, ?)", (player.base_player_uid, player_data[0], team, player.x, player.y,))
            print("not found!")
        else:
            cursor.execute("INSERT INTO game (name, team, x, y) VALUES (?, ?, ? , ?, ?, ?)", (player.name, team, player.x, player.y))

    conn.commit()
    conn.close()
    return {"message": "Player added or updated", "team": team, "base_player_uid": player.base_player_uid}

@app.put("/game/{team}")
def update_player_in_game(team: str, player: PlayerInGame):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not player.id:
        conn.close()
        raise HTTPException(status_code=404, detail="Invalid ID")

    # Ensure the player exists in the game
    existing_entry = cursor.execute("SELECT 1 FROM game WHERE id = ?", (player.id,)).fetchone()

    if not existing_entry:
        conn.close()
        raise HTTPException(status_code=404, detail="Player not found in game")

    # Update the player's position
    cursor.execute("UPDATE game SET x = ?, y = ? WHERE id = ?", (player.x, player.y, player.id))

    conn.commit()
    conn.close()
    return {"message": "Player position updated", "team": team, "id": player.id}

@app.put("/game/switch/{team}")
def switch_player_in_game(team: str, player: PlayerInGame):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Step 1: Validate that player.id exists in the game table
    existing_entry = cursor.execute("SELECT team FROM game WHERE id = ?", (player.id,)).fetchone()
    if not existing_entry:
        raise HTTPException(status_code=404, detail="Player not found in game")
    
    player_data = cursor.execute("SELECT name FROM players WHERE uid = ?", (player.base_player_uid,)).fetchone()

    # Step 2: If base_player_uid is not None and exists in the players table
    if player.base_player_uid and  player_data:
        # Check if another game entry exists with this base_player_uid
        matching_player = cursor.execute("SELECT id FROM game WHERE base_player_uid = ?", (player.base_player_uid,)).fetchone()

        if matching_player:
            # Case 2: Remove the existing game entry with the same base_player_uid
            cursor.execute("DELETE FROM game WHERE base_player_uid = ?", (player.base_player_uid,))
        
        # Case 2 & 3: Update current game entry with new base_player_uid and name
        cursor.execute("UPDATE game SET base_player_uid = ?, name = ?, team = ? WHERE id = ?", 
                        (player.base_player_uid, player_data[0], team, player.id))
    else:
        # Case 4: If base_player_uid is None, set base_player_uid to NULL
        cursor.execute("UPDATE game SET base_player_uid = NULL WHERE id = ?", (player.id,))

    conn.commit()
    conn.close()
    
    return {"message": "Player switched successfully", "team": team, "id": player.id, "new_base_player_uid": player.base_player_uid}


@app.delete("/game/{uid}")
def remove_player_from_game(uid: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM game")
    cursor = conn.cursor()

    # Delete the player from the game table
    cursor.execute("DELETE FROM game WHERE uid = ?", (uid,))

    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Player not found in game")

    conn.commit()
    conn.close()
    return {"message": "Player removed", "uid": uid}

@app.get("/formations")
def get_formations():
    conn = get_db_connection()
    formations = conn.execute("SELECT * FROM formations").fetchall()
    conn.close()
    return [dict(f) for f in formations]

@app.post("/game/formation/{formation_id}")
def apply_formation(formation_id: int):
    print(formation_id)
    conn = get_db_connection()
    conn.execute("DELETE FROM game")
    
    positions = conn.execute(
        "SELECT x, y, position_name FROM formation_positions WHERE formation_id = ?", 
        (formation_id,)
    ).fetchall()

    for pos in positions:
        conn.execute(
            "INSERT INTO game (team, base_player_uid, name, x, y) VALUES (?, ?, ?, ?, ?)",
            ("A", None, pos["position_name"] or "Guest", pos["x"], pos["y"])
        )
        conn.execute(
            "INSERT INTO game (team, base_player_uid, name, x, y) VALUES (?, ?, ?, ?, ?)",
            ("B", None, pos["position_name"] or "Guest", pos["x"], pos["y"])
        )

    conn.commit()
    conn.close()
    return {"message": "Formation applied", "formation_id": formation_id}