import { SourceAttribution } from '@/types/brief';

export interface SourceValidationResult {
  isValid: boolean;
  credibilityScore: number;
  warnings: string[];
  recommendations: string[];
}

export class SourceValidator {
  // Known credible domains with their credibility scores
  private static readonly CREDIBLE_DOMAINS = {
    // News Sources (High Credibility)
    'reuters.com': 10,
    'ap.org': 10,
    'bbc.com': 9,
    'bbc.co.uk': 9,
    'nytimes.com': 9,
    'washingtonpost.com': 9,
    'wsj.com': 9,
    'bloomberg.com': 8,
    'cnn.com': 7,
    'foxnews.com': 7,
    'npr.org': 8,
    'pbs.org': 8,
    'theguardian.com': 8,
    'independent.co.uk': 7,
    'telegraph.co.uk': 7,
    'ft.com': 9,
    'economist.com': 9,
    
    // Weather Sources
    'weather.com': 9,
    'accuweather.com': 9,
    'weather.gov': 10,
    'noaa.gov': 10,
    'metoffice.gov.uk': 9,
    
    // Event Platforms
    'eventbrite.com': 8,
    'meetup.com': 8,
    'facebook.com': 7,
    'linkedin.com': 8,
    'ticketmaster.com': 8,
    'stubhub.com': 7,
    
    // Academic and Government
    'edu': 8,
    'gov': 9,
    'org': 6,
    
    // Technology and Business
    'techcrunch.com': 7,
    'arstechnica.com': 8,
    'wired.com': 8,
    'theverge.com': 7,
    'github.com': 8,
    'stackoverflow.com': 8,
  };

  // Known unreliable domains
  private static readonly UNRELIABLE_DOMAINS = [
    'blogspot.com',
    'wordpress.com',
    'tumblr.com',
    'medium.com',
    'quora.com',
    'reddit.com',
    '4chan.org',
    'buzzfeed.com',
    'dailymail.co.uk',
    'breitbart.com',
    'infowars.com',
    'naturalnews.com',
  ];

  // Suspicious patterns in URLs
  private static readonly SUSPICIOUS_PATTERNS = [
    /bit\.ly/i,
    /tinyurl\.com/i,
    /goo\.gl/i,
    /t\.co/i,
    /fb\.me/i,
    /short\.link/i,
  ];

  /**
   * Validates a source and calculates its credibility score
   */
  static validateSource(url: string, sourceName?: string): SourceValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let credibilityScore = 5; // Default score

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      
      // Check for suspicious URL patterns
      if (this.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(url))) {
        warnings.push('URL uses a URL shortener');
        credibilityScore -= 2;
      }

      // Check for HTTPS
      if (urlObj.protocol !== 'https:') {
        warnings.push('URL does not use HTTPS');
        credibilityScore -= 1;
      }

      // Check against known credible domains
      const domainScore = this.getDomainCredibilityScore(domain);
      if (domainScore > 0) {
        credibilityScore = domainScore;
      } else {
        // Check against unreliable domains
        if (this.UNRELIABLE_DOMAINS.some(unreliable => domain.includes(unreliable))) {
          warnings.push('Domain is known to be unreliable');
          credibilityScore -= 3;
        }
      }

      // Check for subdomain patterns
      if (domain.includes('blog.') || domain.includes('news.')) {
        recommendations.push('Consider verifying the main domain credibility');
      }

      // Check for country-specific domains
      const countryDomains = ['.ru', '.cn', '.ir', '.kp'];
      if (countryDomains.some(country => domain.endsWith(country))) {
        warnings.push('Domain from potentially restricted country');
        credibilityScore -= 1;
      }

      // Validate source name if provided
      if (sourceName) {
        const nameCredibility = this.validateSourceName(sourceName, domain);
        if (nameCredibility < 0.5) {
          warnings.push('Source name does not match domain');
          credibilityScore -= 1;
        }
      }

      // Additional checks
      if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
        warnings.push('Local development URL detected');
        credibilityScore = 1;
      }

      // Ensure score is within bounds
      credibilityScore = Math.max(1, Math.min(10, credibilityScore));

      return {
        isValid: credibilityScore >= 6,
        credibilityScore,
        warnings,
        recommendations
      };

    } catch (error) {
      return {
        isValid: false,
        credibilityScore: 1,
        warnings: ['Invalid URL format'],
        recommendations: ['Please provide a valid URL']
      };
    }
  }

  /**
   * Get credibility score for a domain
   */
  private static getDomainCredibilityScore(domain: string): number {
    // Check exact matches first
    for (const [credibleDomain, score] of Object.entries(this.CREDIBLE_DOMAINS)) {
      if (domain === credibleDomain || domain.endsWith('.' + credibleDomain)) {
        return score;
      }
    }

    // Check for TLD patterns
    if (domain.endsWith('.edu')) return 8;
    if (domain.endsWith('.gov')) return 9;
    if (domain.endsWith('.org')) return 6;
    if (domain.endsWith('.com')) return 5;
    if (domain.endsWith('.net')) return 5;

    return 0; // Unknown domain
  }

  /**
   * Validate if source name matches the domain
   */
  private static validateSourceName(sourceName: string, domain: string): number {
    const cleanDomain = domain.replace(/^www\./, '').split('.')[0];
    const cleanSourceName = sourceName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check if source name contains domain name or vice versa
    if (cleanSourceName.includes(cleanDomain) || cleanDomain.includes(cleanSourceName)) {
      return 1.0;
    }

    // Check for common news organization patterns
    const newsPatterns = ['news', 'times', 'post', 'journal', 'tribune', 'herald', 'gazette'];
    const hasNewsPattern = newsPatterns.some(pattern => 
      cleanSourceName.includes(pattern) || cleanDomain.includes(pattern)
    );

    return hasNewsPattern ? 0.8 : 0.3;
  }

  /**
   * Get source type based on domain
   */
  static getSourceType(url: string): SourceAttribution['type'] {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      if (domain.includes('weather') || domain.includes('metoffice') || domain.includes('noaa')) {
        return 'weather';
      }
      
      if (domain.includes('eventbrite') || domain.includes('meetup') || domain.includes('facebook.com/events')) {
        return 'event';
      }
      
      if (domain.includes('calendar') || domain.includes('google.com') || domain.includes('outlook')) {
        return 'calendar';
      }
      
      if (domain.includes('news') || domain.includes('times') || domain.includes('post') || 
          domain.includes('bbc') || domain.includes('cnn') || domain.includes('reuters')) {
        return 'news';
      }
      
      return 'service';
    } catch {
      return 'service';
    }
  }

  /**
   * Generate recommendations for improving source credibility
   */
  static generateRecommendations(validationResult: SourceValidationResult): string[] {
    const recommendations = [...validationResult.recommendations];

    if (validationResult.credibilityScore < 6) {
      recommendations.push('Consider using a more established news source');
    }

    if (validationResult.warnings.includes('URL does not use HTTPS')) {
      recommendations.push('Use HTTPS-enabled sources for better security');
    }

    if (validationResult.warnings.includes('URL uses a URL shortener')) {
      recommendations.push('Use direct URLs instead of shortened links');
    }

    return recommendations;
  }

  /**
   * Check if a URL is accessible (placeholder for actual implementation)
   */
  static async checkUrlAccessibility(url: string): Promise<boolean> {
    try {
      // In a real implementation, you would make an HTTP HEAD request
      // to check if the URL is accessible
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors' // This is a limitation of browser CORS
      });
      return true; // Placeholder - always return true for now
    } catch {
      return false;
    }
  }
}
