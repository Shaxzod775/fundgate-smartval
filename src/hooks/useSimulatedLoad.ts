import { useState, useEffect } from 'react';

const visitedPages = new Set<string>();

export const useSimulatedLoad = (key: string, duration: number = 800) => {
    const [isLoading, setIsLoading] = useState(() => !visitedPages.has(key));

    useEffect(() => {
        if (visitedPages.has(key)) {
            setIsLoading(false);
            return;
        }

        const timer = setTimeout(() => {
            setIsLoading(false);
            visitedPages.add(key);
        }, duration);

        return () => clearTimeout(timer);
    }, [key, duration]);

    return isLoading;
};
