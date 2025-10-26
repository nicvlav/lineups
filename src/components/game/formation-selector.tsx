import { usePlayers } from "@/context/players-provider";
import { formationTemplates } from "@/data/position-types";
import { Select, SelectTrigger, SelectGroup, SelectItem, SelectLabel, SelectContent, SelectValue } from "@/components/ui/select";

const FormationSelector = () => {
    const { applyFormation } = usePlayers();

    const handleChange = (value: string) => {
        if (!value) return;

        const allFormations = Object.values(formationTemplates).flat();
        const selected = allFormations.find(f => f.name === value);

        if (!selected) return;
        applyFormation(selected);

    };

    return (
        <Select onValueChange={handleChange}>
            {/* Trigger button for the select */}
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Set Formation">Set Formation</SelectValue>
            </SelectTrigger>

            {/* Dropdown content with dynamically grouped formations */}
            <SelectContent className="w-full rounded">
                {Object.entries(formationTemplates).map(([numPlayers, formations]) => (
                    <SelectGroup key={numPlayers}>
                        <SelectLabel>{`${numPlayers} Players`}</SelectLabel>
                        {formations.map((formation) => (
                            <SelectItem key={formation.name} value={formation.name}>
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
