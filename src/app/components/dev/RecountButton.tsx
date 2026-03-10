'use client';

import { recountUsage } from '@/app/actions/user-actions-dev';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';

export function RecountButton() {
    const { user } = useUser();
    const [message, setMessage] = useState('');

    const handleRecount = async () => {
        if (!user) {
            setMessage('Please sign in to recount your usage.');
            return;
        }

        try {
            const result = await recountUsage(user.id);
            if (result.success) {
                setMessage(`Recount successful! Collections: ${result.collectionCount}, Cards: ${result.cardCount}`);
            } else {
                setMessage(`Error: ${result.message}`);
            }
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
    };

    return (
        <div>
            <button onClick={handleRecount}>Recount Usage</button>
            {message && <p>{message}</p>}
        </div>
    );
}
