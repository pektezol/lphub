import React from "react";
import { Link } from "react-router-dom";
import type { Map } from "@customTypes/Map";

interface MapProps {
    map: Map;
    catNum: number;
};

const Map: React.FC<MapProps> = ({ map, catNum }) => {
    return (

        <div className="bg-panel rounded-3xl overflow-hidden">
            <Link to={`/maps/${map.id}`}>
                <span className="text-center text-base sm:text-xl w-full block my-1.5 text-foreground truncate">
                    {map.name}
                </span>
                <div
                    className="flex h-40 sm:h-48 bg-cover relative"
                    style={{ backgroundImage: `url(${map.image})` }}
                >
                    <div className="backdrop-blur-[4px] w-full flex items-center justify-center">
                        <span className="text-3xl sm:text-5xl font-barlow-semicondensed-semibold text-white mr-1.5">
                            {map.is_disabled
                                ? map.category_portals[0].portal_count
                                : map.category_portals.find(
                                    obj => obj.category.id === catNum + 1
                                )?.portal_count}
                        </span>
                        <span className="text-2xl sm:text-4xl font-barlow-semicondensed-regular text-white">
                            {map.is_disabled
                                ? map.category_portals[0].portal_count == 1 ? "portal" : "portals"
                                : map.category_portals.find(
                                    obj => obj.category.id === catNum + 1
                                )?.portal_count == 1 ? "portal" : "portals"}
                        </span>
                    </div>
                </div>

                <div className="flex mx-5 my-4">
                    <div className="flex w-full items-center justify-center gap-1.5 rounded-[2000px] ml-0.5 translate-y-px">
                        {[1, 2, 3, 4, 5].map((point) => (
                            <div
                                key={point}
                                className={`flex h-[3px] w-full rounded-3xl ${point <= (map.difficulty + 1)
                                    ? map.difficulty === 0
                                        ? "bg-green-500"
                                        : map.difficulty === 1 || map.difficulty === 2
                                            ? "bg-lime-500"
                                            : map.difficulty === 3
                                                ? "bg-red-400"
                                                : "bg-red-600"
                                    : "bg-block"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </Link>
        </div>
    );
};

export default Map;
