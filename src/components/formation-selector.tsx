import { usePlayers } from "@/data/players-provider";
import { Formation } from "@/data/player-types";
import formations from "@/data/formations";
import { Select, SelectTrigger, SelectGroup, SelectItem, SelectLabel, SelectContent, SelectValue } from "@/components/ui/select";

type GroupedFormations = {
    [key: number]: Formation[];
};

const FormationSelector = () => {
    const { applyFormation } = usePlayers();

    const handleChange = (value: string) => {
        if (value) {
            applyFormation(value);
        }
    };

    // Group formations by num_players
    const groupedFormations: GroupedFormations = formations.reduce(
        (groups, formation) => {
            const numPlayers = formation.num_players;
            if (!groups[numPlayers]) {
                groups[numPlayers] = [];
            }
            groups[numPlayers].push(formation);
            return groups;
        },
        {} as GroupedFormations
    );

    return (
        <Select onValueChange={handleChange}>
            {/* Trigger button for the select */}
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Set Formation">Set Formation</SelectValue>
            </SelectTrigger>

            {/* Dropdown content with dynamically grouped formations */}
            <SelectContent className="w-full">
                {Object.keys(groupedFormations)
                    .sort((a, b) => parseInt(a) - parseInt(b)) // Sort formations by number of players
                    .map((numPlayers) => (
                        <SelectGroup key={numPlayers}>
                            <SelectLabel>{`${numPlayers} Players`}</SelectLabel>
                            {groupedFormations[parseInt(numPlayers)].map((formation) => (
                                <SelectItem key={formation.id} value={formation.id.toString()}>
                                    {formation.name}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))}
            </SelectContent>
        </Select>
    );
};

export default FormationSelector;
