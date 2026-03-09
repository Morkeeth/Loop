export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-black px-6 py-16 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 9, 2026</p>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-black mb-2">What Loop does</h2>
          <p>
            Loop connects to your Google Calendar to understand your interests and lifestyle.
            It uses this information to find one personalized event recommendation for you each week.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">Data we access</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your Google Calendar events (read-only access to event titles, times, and locations)</li>
            <li>Your Google profile name and email address</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">How we use your data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Calendar data is processed in real-time to build your interest profile</li>
            <li>Your profile is used to find a relevant event recommendation</li>
            <li>Discovered events may be added to your Google Calendar with your permission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black mb-2">Data storage</h2>
          <p>
            Loop does not store your calendar data on our servers. Your data is processed
            in-session and cached locally in your browser. You can clear this cache at any time
            by clearing your browser data.
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
