from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import uuid

app = FastAPI()

PLAYERS_FILE = "players.json"

GAME_FILE = "game.json"

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load player data
class Player(BaseModel):
    name: str = ""
    uid: str = ""

def load_players():
    try:
        with open(PLAYERS_FILE, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        return []  # Return empty list if file does not exist
    
def save_players(players):
    with open(PLAYERS_FILE, "w") as file:
        json.dump(players, file, indent=4)


def load_game():
    with open(GAME_FILE, "r") as file:
        return json.load(file)

def save_game(data):
    with open(GAME_FILE, "w") as file:
        json.dump(data, file, indent=4)

def assign_zone(y):
    if y < 0.1:
        return "keeper"
    elif y < 0.4:
        return "defender"
    elif y < 0.7:
        return "midfielder"
    else:
        return "attacker"


@app.get("/players")
def get_players():
    return  load_players()

@app.post("/players")
def add_player(player: Player):
    try:
        players = load_players()
        player_dict = player.model_dump()
        player_dict["uid"] = str(uuid.uuid4())  # Assign generated UUID

        players.append(player_dict)
        save_players(players)
        return player_dict
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {e}")
    
@app.delete("/players/{uid}")
def delete_player(uid: str):
    try:
        players = load_players()
        players = [player for player in players if player["uid"] != uid]
        save_players(players)
        return {"detail": "Player deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error: {e}")
    
@app.put("/players/{uid}")
def update_player_position(uid: str, x: float, y: float):
    try:
        # Open players.json and load the data
        with open("players.json", "r") as file:
            data = json.load(file)

        # Create a dictionary for faster lookup
        player_dict = {p['uid']: p for p in data}

        # Check if the player exists by UID
        if uid not in player_dict:
            return {"error": f"Player with UID {uid} not found"}

        # Update the player's position
        player_dict[uid]["x"] = x
        player_dict[uid]["y"] = y

        # Convert the dictionary back to a list
        updated_data = list(player_dict.values())

        print("start write")

        # Save the updated player data to the file
        with open("players.json", "w") as file:
            json.dump(updated_data, file, indent=4)

        print("end write")

        return {"message": f"Player {uid} updated", "player": {"x": x, "y": y}}

    except Exception as e:
        return {"error": f"An error occurred: {str(e)}"}
    


@app.get("/game")
def get_game():
    return load_game()

@app.post("/add_player")
def add_player(team: str, uid: int, x: float, y: float):
    game = load_game()
    if team not in game["teams"]:
        raise HTTPException(status_code=400, detail="Invalid team")

    zone = assign_zone(y)
    game["teams"][team]["players"].append({"uid": uid, "x": x, "y": y, "zone": zone})
    save_game(game)
    return {"message": "Player added", "team": team, "uid": uid}

@app.post("/update_player")
def update_player(team: str, uid: int, x: float, y: float):
    game = load_game()
    for player in game["teams"][team]["players"]:
        if player["uid"] == uid:
            player["x"], player["y"] = x, y
            player["zone"] = assign_zone(y)
            save_game(game)
            return {"message": "Player updated", "uid": uid}
    raise HTTPException(status_code=404, detail="Player not found")

@app.delete("/remove_player")
def remove_player(team: str, uid: int):
    game = load_game()
    game["teams"][team]["players"] = [p for p in game["teams"][team]["players"] if p["uid"] != uid]
    save_game(game)
    return {"message": "Player removed", "uid": uid}