import React, { useEffect, useState } from 'react';
import { Code2, Building2 } from 'lucide-react';

const DeveloperCredit = () => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`fixed bottom-4 right-4 z-[1000] flex items-center gap-3 bg-dark-900/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-2xl transition-all duration-1000 pointer-events-auto ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none md:opacity-100 md:translate-y-0 md:pointer-events-auto'}`}>
            {/* Logo Placeholder */}
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                <span className="text-[10px] font-bold text-white">NIOM</span>
            </div>

            <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <Code2 size={10} className="text-blue-400" />
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Developer</span>
                </div>
                <div className="text-xs font-bold text-white tracking-wide">
                    Niraj Choudhary
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-gray-400">@ NIOM SolutionX</span>
                </div>
            </div>
        </div>
    );
};

export default DeveloperCredit;
