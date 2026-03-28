import { useEffect, useRef, useState } from "react";

interface WindowSize {
    width: number;
    height: number;
}

export function useWindowSize(): WindowSize {
    const [windowSize, setWindowSize] = useState<WindowSize>({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const rafId = useRef(0);

    useEffect(() => {
        const handleResize = () => {
            cancelAnimationFrame(rafId.current);
            rafId.current = requestAnimationFrame(() => {
                setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            });
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(rafId.current);
        };
    }, []);

    return windowSize;
}
