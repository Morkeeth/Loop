export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-black px-6 py-16 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 9, 2026</p>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-black mb-2">What Loop does</h2>
          <p>
            Loop reads your Google Calendar events from the past 3–6 months to build a personalized
            profile (persona) using AI. This persona is used to generate a daily morning briefing
            with relevant news, local events, and activity suggestions tailored to your schedule and interests.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">Google API Scopes</h2>
          <p className="mb-2">Loop requests the following Google API permissions:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>calendar.readonly</strong> — Read access to your calendar events (titles, times, locations, and attendees) to build your personalized profile</li>
            <li><strong>calendar.events</strong> — Write access to create events on your calendar when you choose to add a suggested event</li>
            <li><strong>userinfo.profile</strong> — Your name for account identification</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">How we use your data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Calendar data from the past 3–6 months is read to build a personalized profile (persona) using AI</li>
            <li>Your persona powers a daily morning briefing with relevant news, local events, and activity suggestions</li>
            <li>Suggested events are added to your Google Calendar only with your explicit consent</li>
            <li>Calendar read access requires full event details (titles, times, locations) — limited scopes like FreeBusy would not provide enough information for persona generation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">Data storage</h2>
          <p>
            Your raw calendar data is not permanently stored on our servers. Calendar events are
            processed in real-time to generate your profile. Your generated profile and authentication
            tokens are stored securely using encrypted cloud storage (Supabase) to enable
            daily automated briefings. You can delete your data at any time by revoking access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">Third-party services</h2>
          <p>
            Loop uses OpenAI to generate your interest profile and discover events. Calendar
            event data (titles, times, locations) is sent to OpenAI for processing. No data is
            retained by OpenAI beyond the API request.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">Data sharing</h2>
          <p>
            We do not sell, rent, or share your personal data with third parties for marketing
            purposes. Data is only shared with the AI providers necessary to deliver the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">Revoking access</h2>
          <p>
            You can revoke Loop's access to your Google account at any time by visiting{' '}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">
              Google Account Permissions
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">Contact</h2>
          <p>
            For questions about this privacy policy, contact us at omorke@gmail.com.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-100">
        <a href="/" className="text-sm text-gray-400 hover:text-black transition-colors">← Back to Loop</a>
      </div>
    </div>
  );
}
