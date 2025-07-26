import React from "react";
import { ZoneAverages } from "@/data/player-types";

interface PlayerCardProps {
    playerName: string;
    overall: number;
    top3Positions: string;
    averages: ZoneAverages;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ playerName, overall, top3Positions, averages }) => {
    return (
        <div className="w-full h-auto flex flex-col items-center bg-gradient-to-b from-yellow-200 to-yellow-400 rounded-2xl text-black shadow-lg p-4 text-center">
            <div className="flex items-center w-full gap-3 min-w-">
                {/* Badge */}
                <div className="bg-black text-white font-bold text-xl rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                    {overall}
                </div>



                {/* Name + Positions */}
                <div className="flex flex-col items-start">
                    <span className="font-bold text-lg text-left">{playerName}</span>
                    <span className="text-xs text-gray-700">{top3Positions}</span>
                </div>
            </div>


            <div className="mt-3 flex justify-center gap-3">
                {[
                    { label: "MEN", value: averages.mental },
                    { label: "PHY", value: averages.physical },
                    { label: "TEC", value: averages.technical },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="flex flex-col items-center bg-white/30 px-3 py-2 rounded-lg shadow-md w-16"
                    >
                        <span className="text-xs font-semibold">{stat.label}</span>
                        <span className="font-bold">{stat.value}</span>
                    </div>
                ))}
            </div>

            {/* <div className="mt-3 flex justify-center gap-3">
                {[
                    { label: "MEN", value: averages.mental },
                    { label: "PHY", value: averages.physical },
                    { label: "TEC", value: averages.technical },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="flex flex-col items-center bg-white/30 px-3 py-2 rounded-lg shadow-md w-16"
                    >
                        <span className="text-xs font-semibold">{stat.label}</span>
                        <span className="font-bold">{stat.value}</span>
                    </div>
                ))}
            </div> */}
        </div>
    );
}
export default PlayerCard;
