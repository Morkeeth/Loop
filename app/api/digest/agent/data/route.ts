import { NextRequest, NextResponse } from 'next/server';

// Store agent data in memory (in production, use a database)
const agentDataStore = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { agentId, digestContent, persona, calendarData } = await request.json();

    if (!agentId || !digestContent || !persona || !calendarData) {
      return NextResponse.json(
        { error: 'Agent ID, digest content, persona, and calendar data are required' },
        { status: 400 }
      );
    }

    // Store the agent's data
    agentDataStore.set(agentId, {
      digestContent,
      persona,
      calendarData,
      createdAt: new Date().toISOString()
    });

    console.log(`Stored data for agent ${agentId}`);

    return NextResponse.json({
      success: true,
      message: 'Agent data stored successfully'
    });

  } catch (error) {
    console.error('Agent data storage error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to store agent data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    const agentData = agentDataStore.get(agentId);

    if (!agentData) {
      return NextResponse.json(
        { error: 'Agent data not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: agentData
    });

  } catch (error) {
    console.error('Agent data retrieval error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve agent data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
