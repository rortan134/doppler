import { useLocation, useNavigate } from "@tanstack/react-router";
import * as React from "react";

export const useHash = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const hash = location.hash;

    const removeHash = React.useCallback(() => {
        navigate({
            hash: "",
            replace: true,
            to: ".",
        });
    }, [navigate]);

    return { hash, removeHash };
};
