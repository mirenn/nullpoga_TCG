import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOG_FILE_PATH = path.join(process.cwd(), 'perf-metrics.log');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entry = {
      receivedAt: new Date().toISOString(),
      ...body,
    };
    fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(entry) + '\n', 'utf8');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 400 });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(LOG_FILE_PATH)) {
      return NextResponse.json({ entries: [] });
    }
    const content = fs.readFileSync(LOG_FILE_PATH, 'utf8').trim();
    const lines = content ? content.split('\n').slice(-30) : [];
    const entries = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
