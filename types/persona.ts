export interface PersonaProfile {
  id: string;
  userId: string;
  generatedAt: string;
  
  // Professional Life
  professional: {
    jobTitle?: string;
    industry?: string;
    workPattern: 'morning' | 'afternoon' | 'evening' | 'flexible' | 'unknown';
    meetingFrequency: 'low' | 'medium' | 'high';
    workLocation: 'office' | 'remote' | 'hybrid' | 'unknown';
    workHours: {
      start: string;
      end: string;
    };
  };
  
  // Education
  education: {
    isStudent: boolean;
    fieldOfStudy?: string;
    classSchedule?: string[];
    academicLevel?: 'undergraduate' | 'graduate' | 'phd' | 'other';
  };
  
  // Personal Interests
  interests: {
    hobbies: string[];
    sports: string[];
    recurringActivities: string[];
    entertainment: string[];
  };
  
  // Social Patterns
  social: {
    frequentContacts: string[];
    socialEventFrequency: 'low' | 'medium' | 'high';
    relationshipStatus?: 'single' | 'dating' | 'married' | 'other';
    socialPreferences: string[];
  };
  
  // Schedule Patterns
  schedule: {
    wakeTime: string;
    sleepTime: string;
    busyPeriods: string[];
    freeTimeSlots: string[];
    timeZone: string;
  };
  
  // Location
  location: {
    primaryLocation: string;
    travelPatterns: string[];
    frequentLocations: string[];
  };
  
  // Lifestyle Indicators
  lifestyle: {
    exerciseRoutine: string[];
    diningPreferences: string[];
    entertainmentChoices: string[];
    healthHabits: string[];
  };
  
  // Personality Traits (inferred)
  personality: {
    traits: string[];
    communicationStyle: string;
    productivityStyle: string;
    stressIndicators: string[];
  };
  
  // Confidence scores
  confidence: {
    overall: number;
    professional: number;
    social: number;
    lifestyle: number;
  };
}

export interface PersonaInsights {
  keyInsights: string[];
  recommendations: string[];
  patterns: string[];
  anomalies: string[];
}

export interface LoadingComment {
  id: string;
  text: string;
  category: 'professional' | 'personal' | 'social' | 'lifestyle' | 'general';
  timestamp: string;
}
