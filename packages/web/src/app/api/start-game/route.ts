import { NextResponse } from 'next/server';
import { GameService } from '@/lib/core/game.service';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Start matching
        // In the future this might be async processing, but GameService.startMatching handles the logic
        const result = await GameService.startMatching(userId);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
