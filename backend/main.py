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

class PlayerInGame(BaseModel):
    uid: str = ""
    x: float = 0.5
    y: float = 0.5

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

def remove_from_game(game, team, uid):
    if team not in game["teams"]:
        return False
    
    print(game["teams"][team]["players"])
    print(uid)
    game["teams"][team]["players"] = [p for p in game["teams"][team]["players"] if p["uid"] != uid]
    return True

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


@app.get("/game")
def get_game():
    return load_game()

@app.delete("/game/{team}")
def remove_player(team: str, player: PlayerInGame):
    game = load_game()

    if not remove_from_game(game, team, player.uid):
        raise HTTPException(status_code=400, detail="Invalid team")
    
    save_game(game)
    return {"message": "Player removed", "uid": player.uid}

@app.post("/game/{team}")
def add_player_to_game(team : str, player: PlayerInGame):
    players = load_players()
    print(players)
    print(player)
    if not any(p["uid"] == player.uid for p in players):
        raise HTTPException(status_code=400, detail="Invalid uid")
        
    game = load_game()
    print("player")

    if team not in game["teams"]:
        raise HTTPException(status_code=400, detail="Invalid team")
    
    if any(p["uid"] == player.uid for p in game["teams"][team]["players"]):
        raise HTTPException(status_code=400, detail="Already Added")

    print (team)
    if team == "A":
        remove_from_game(game, "B", player.uid)
    elif team == "B":
       remove_from_game(game, "A", player.uid)
    
    player_dict = player.model_dump()
    game["teams"][team]["players"].append(player_dict)
    save_game(game)
    return {"message": "Player added", "team": team, "uid": player.uid}

@app.put("/game/{team}")
def update_player_in_game(team : str, updatePlayer: PlayerInGame):
    print("player")
    game = load_game()

    if team not in game["teams"]:
        raise HTTPException(status_code=400, detail="Invalid team")
    
    for player in game["teams"][team]["players"]:
        if player["uid"] == updatePlayer.uid:
            player["x"], player["y"] = updatePlayer.x, updatePlayer.y
            save_game(game)
            return {"message": "Player updated", "uid": updatePlayer.uid}
    raise HTTPException(status_code=404, detail="Player not found")

@app.delete("/remove_player")
def remove_player(team: str, uid: int):
    game = load_game()
    game["teams"][team]["players"] = [p for p in game["teams"][team]["players"] if p["uid"] != uid]
    save_game(game)
    return {"message": "Player removed", "uid": uid}

