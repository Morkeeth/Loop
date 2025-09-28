import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { persona, calendarData, digestContent } = await request.json();

    if (!persona || !calendarData) {
      return NextResponse.json(
        { error: 'Persona and calendar data are required' },
        { status: 400 }
      );
    }

    console.log('Generating PDF with persona and calendar data...');

    // Create PDF content (simplified version - in production use a proper PDF library)
    const pdfContent = `# Personal Assistant Knowledge Base

## Sunday Brief
${digestContent || 'No brief available'}

## Persona Summary
${JSON.stringify(persona, null, 2)}

## Recent Calendar Events
${JSON.stringify(calendarData, null, 2)}

---
Generated on: ${new Date().toISOString()}
    `.trim();

    // For now, return the content as text
    // In production, you would use a PDF generation library like puppeteer or jsPDF
    const pdfData = {
      content: pdfContent,
      filename: `personal-context-${Date.now()}.txt`,
      generatedAt: new Date().toISOString(),
      size: pdfContent.length
    };

    console.log('PDF content generated, size:', pdfContent.length, 'characters');

    return NextResponse.json({
      success: true,
      pdfData,
      message: 'Context document generated successfully'
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}