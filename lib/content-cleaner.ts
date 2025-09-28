/**
 * Content cleaning utilities for text-to-speech conversion
 * Removes all non-readable elements from content to make it suitable for voice generation
 */

export function cleanContentForSpeech(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    // Remove audio link lines
    .replace(/🎧 Listen To Your Digest: \S+/g, '')
    // Remove all URLs (http, https, ftp, etc.)
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/ftp:\/\/[^\s]+/g, '')
    .replace(/www\.[^\s]+/g, '')
    // Remove email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
    // Remove all emojis and special symbols
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Regional indicator symbols
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Miscellaneous symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    // Remove markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/#{1,6}\s+/g, '') // Headers
    .replace(/^\s*[-*+]\s+/gm, '') // Bullet points
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links (keep text, remove URL)
    // Remove HTML-like tags
    .replace(/<[^>]+>/g, '')
    // Remove excessive punctuation and special characters
    .replace(/[^\w\s.,!?;:'"()-]/g, ' ')
    // Remove multiple spaces, newlines, and tabs
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Test function to demonstrate content cleaning
 */
export function testContentCleaning() {
  const testContent = `🎧 Listen To Your Digest: /digest/audio/123

🎙️ Welcome to Loop Radio, your personalized Sunday digest.

Today's highlights:

🎯 **Focus Areas**
- You have 3 meetings scheduled this week, with Tuesday being your busiest day
- Your calendar shows a strong pattern of morning productivity sessions
- Social activities are concentrated around weekends

📊 **Calendar Insights**
- Average of 2.3 meetings per day this week
- Most productive hours: 9:00 AM - 11:00 AM
- Free time slots available: Wednesday afternoon, Friday morning

🔗 **Helpful Resources**
- Check out https://calendar.google.com for better scheduling
- Learn more at https://www.notion.so/productivity-tips
- Connect with us at contact@loop.app

Remember: Your calendar reflects someone who values both productivity and social connection. Keep balancing work and play!

That's your Loop Radio digest for this week. Stay tuned for more personalized insights.`;

  const cleaned = cleanContentForSpeech(testContent);
  
  console.log('=== CONTENT CLEANING TEST ===');
  console.log('Original length:', testContent.length);
  console.log('Cleaned length:', cleaned.length);
  console.log('\nOriginal content:');
  console.log(testContent);
  console.log('\nCleaned content:');
  console.log(cleaned);
  
  return cleaned;
}
