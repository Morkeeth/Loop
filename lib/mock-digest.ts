// Mock digest content for testing audio functionality
export const MOCK_DIGEST_CONTENT = `🎧 Listen To Your Digest: {{AUDIO_URL}}

Welcome to Loop Radio, your personalized Sunday digest.

Today's highlights:

🎯 **Focus Areas**
- You have 3 meetings scheduled this week, with Tuesday being your busiest day
- Your calendar shows a strong pattern of morning productivity sessions
- Social activities are concentrated around weekends

📊 **Calendar Insights**
- Average of 2.3 meetings per day this week
- Most productive hours: 9:00 AM - 11:00 AM
- Free time slots available: Wednesday afternoon, Friday morning

🎵 **Personalized Recommendations**
- Consider scheduling your deep work sessions during your peak hours
- Your social calendar suggests you prefer evening gatherings
- Next week looks lighter - perfect time for that project you've been planning

💡 **This Week's Opportunities**
- Tuesday's meeting with the design team could be a great networking opportunity
- Thursday's free afternoon is ideal for catching up on personal projects
- Weekend looks social - maybe plan something fun with friends

🔗 **Helpful Resources**
- Check out https://calendar.google.com for better scheduling
- Learn more at https://www.notion.so/productivity-tips
- Connect with us at https://loop.app/community

Remember: Your calendar reflects someone who values both productivity and social connection. Keep balancing work and play!

That's your Loop Radio digest for this week. Stay tuned for more personalized insights.`;

export function generateMockDigest() {
  const digestId = `test-${Date.now()}`;
  const audioUrl = `/digest/audio/${digestId}`;
  
  // Replace the placeholder with the actual audio URL
  const contentWithAudioLink = MOCK_DIGEST_CONTENT.replace('{{AUDIO_URL}}', audioUrl);
  
  return {
    content: contentWithAudioLink,
    digestId,
    audioUrl,
    createdAt: new Date().toISOString(),
  };
}
