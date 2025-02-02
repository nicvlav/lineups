from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load player data
class Player:
    def __init__(self, uid, name, x, y):
        self.uid = uid
        self.name = name
        self.x = x
        self.y = y

@app.get("/players")
def get_players():
    print("attempt")
    with open("players.json", "r") as file:
        data = json.load(file)
    players = [Player(p["uid"], p["name"], p["x"], p["y"]).__dict__ for p in data]
    return players

@app.put("/players/{uid}")
def update_player_position(uid: int, x: float, y: float):
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