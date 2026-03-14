"use client";

import { FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function UnselectedContractPage() {
    const router = useRouter();

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[70vh]">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="bg-slate-900/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                    <FileSearch className="w-10 h-10 text-slate-500" />
                </div>
                
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Context Required</h2>
                    <p className="text-slate-400">
                        Select a contract to use this module.
                    </p>
                </div>

                <div className="pt-4 border-t border-slate-800">
                    <Button 
                        onClick={() => router.push('/contracts')}
                        className="bg-cyan-600 hover:bg-cyan-700 w-full"
                    >
                        Browse Global Contracts
                    </Button>
                </div>
            </div>
        </div>
    );
}
