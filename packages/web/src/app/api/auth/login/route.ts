import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username } = body;
        
        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }
        
        // In a real app, verify password here.
        // For now, just issue token for the username (acting as userId).
        const token = signToken(username);
        
        return NextResponse.json({ access_token: token });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
