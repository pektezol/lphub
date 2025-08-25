import React from "react";
import { Link, useLocation } from "react-router-dom";

import styles from "./BreadcrumbNav.module.css";

export interface Breadcrumb {
    to: string;
    label: string;
};

interface BreadcrumbNavProps {
    chapter?: Breadcrumb;
};

const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ chapter }) => {
    const [breadcrumbs, setBreadcrumbs] = React.useState<Breadcrumb[]>([]);

    const path = useLocation();

    React.useEffect(() => {
        let _paths = path.pathname.split("/").filter(Boolean);
        console.log(_paths);
        let _breadcrumbs: Breadcrumb[] = [];

        if (_paths.length >= 2) {
            _breadcrumbs.push({
                to: "/games",
                label: "Games List"
            })

            // To test 3 crumbs
            // _breadcrumbs.push({
            //     to: "/games",
            //     label: "Test"
            // })

            if (_paths[0] == "maps") {
                if (chapter) {
                    _breadcrumbs.push({
                        to: chapter.to,
                        label: chapter.label
                    });
                }
            }
        }

        setBreadcrumbs(_breadcrumbs);
    }, [path])

    return (
        <nav className={styles.container}>
            {breadcrumbs.map((crumb, i) => {
                let _styles = ``;

                if (i == 0) {
                    _styles += `${styles.first} `;
                }

                if (i + 1 == breadcrumbs.length) {
                    _styles += `${styles.last}`;
                }

                return <Link className={`${styles.crumb} ${_styles}`} key={i} to={crumb.to}>
                    <i className="triangle"></i>
                    <span className="translate-y-[-2px]">{crumb.label}</span>
                </Link>
            })}
        </nav>
    )
}

export default BreadcrumbNav;
