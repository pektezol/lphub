import React from "react";
import { Link } from "react-router-dom";

import {
    LogoIcon,
} from "../../images/Images";

const _Header: React.FC = () => {
    return (
        <div className="flex justify-center px-4 py-3 bg-gradient-to-t from-block to-bright md:w-80">
            <Link to="/" tabIndex={-1} className="flex gap-4">
                <img src={LogoIcon} alt="Logo" className="h-18 translate-y-0.5" />
                <div className="text-[#fff] flex flex-col justify-center not-md:hidden">
                    <div className="font-barlow-condensed-bold text-5xl truncate leading-10">
                        PORTAL 2
                    </div>
                    <div className="font-barlow-condensed-regular text-3xl leading-7">
                        Least Portals Hub
                    </div>
                </div>
            </Link>
        </div>
    )
}

export default _Header;
