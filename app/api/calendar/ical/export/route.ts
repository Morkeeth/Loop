import { NextRequest, NextResponse } from 'next/server';
import { generateIcsForEvents } from '@/lib/ical-service';

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json();

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'events array required' },
        { status: 400 }
      );
    }

    const ics = generateIcsForEvents(events);

    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="loop-recommendations.ics"',
      },
    });
  } catch (error) {
    console.error('ICS export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ICS' },
      { status: 500 }
    );
  }
}
