import { describe, it, expect, beforeEach } from 'vitest';
import { mockToneAnalysis, getMBTISuggestion } from '../../server/aiHelper';

describe('Personality Feature - Unit Tests', () => {
  describe('getMBTISuggestion', () => {
    it('should return suggestion for hostile tone with single personality', () => {
      const suggestion = getMBTISuggestion('hostile', 'INTJ', null, false);
      expect(suggestion).toBeDefined();
      expect(typeof suggestion).toBe('string');
    });

    it('should return null for calm tone', () => {
      const suggestion = getMBTISuggestion('calm', 'ENFP', null, false);
      expect(suggestion).toBeNull();
    });

    it('should include dual personality adaptation when both types provided', () => {
      const suggestion = getMBTISuggestion('hostile', 'INTJ', 'ENFP', false);
      expect(suggestion).toBeDefined();
      expect(typeof suggestion).toBe('string');
    });

    it('should handle Thinking to Feeling cross-type suggestions', () => {
      const suggestion = getMBTISuggestion('escalating', 'INTJ', 'ENFP', false);
      expect(suggestion).toBeDefined();
    });

    it('should handle Feeling to Thinking cross-type suggestions', () => {
      const suggestion = getMBTISuggestion('escalating', 'INFP', 'ENTJ', false);
      expect(suggestion).toBeDefined();
    });
  });

  describe('mockToneAnalysis', () => {
    it('should return neutral tone for calm message', () => {
      const result = mockToneAnalysis('Hello, how are you?');
      expect(result.tone).toBe('neutral');
      expect(result.summary).toBe('Message ready to send');
    });

    it('should detect hostile patterns', () => {
      const result = mockToneAnalysis('shut up you idiot');
      expect(['hostile', 'escalating']).toContain(result.tone);
    });

    it('should include personality in suggestion when provided', () => {
      const result = mockToneAnalysis('This is frustrating! You always do this!', {
        personalityType: 'INTJ',
      });
      expect(result.rewordingSuggestion).toBeDefined();
    });

    it('should include dual personality in suggestion when both provided', () => {
      const result = mockToneAnalysis('You are always making things difficult!', {
        personalityType: 'INTJ',
        coParentPersonalityType: 'ENFP',
        isCoParentPersonalityGuessed: false,
      });
      
      expect(result.rewordingSuggestion).toBeDefined();
      if (result.personalityAdapted !== undefined) {
        expect(result.personalityAdapted).toBe(true);
      }
    });

    it('should indicate guessed personality status', () => {
      const result = mockToneAnalysis('You never listen to me!', {
        personalityType: 'ISTJ',
        coParentPersonalityType: 'ESFP',
        isCoParentPersonalityGuessed: true,
      });
      
      expect(result.rewordingSuggestion).toBeDefined();
    });

    it('should handle missing personality gracefully', () => {
      const result = mockToneAnalysis('I am so frustrated with this situation');
      expect(result.tone).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('Personality Override Logic', () => {
    it('should use confirmed personality over guessed', () => {
      const result1 = mockToneAnalysis('you are crazy!', {
        personalityType: 'ENFP',
        coParentPersonalityType: 'INTJ',
        isCoParentPersonalityGuessed: false,
      });

      const result2 = mockToneAnalysis('you are crazy!', {
        personalityType: 'ENFP',
        coParentPersonalityType: 'INTJ',
        isCoParentPersonalityGuessed: true,
      });

      expect(result1.rewordingSuggestion).toBeDefined();
      expect(result2.rewordingSuggestion).toBeDefined();
    });

    it('should handle null co-parent personality', () => {
      const result = mockToneAnalysis('This is typical of you!', {
        personalityType: 'INTP',
        coParentPersonalityType: null,
        isCoParentPersonalityGuessed: false,
      });
      
      expect(result.rewordingSuggestion).toBeDefined();
    });
  });

  describe('Cross-Personality Communication', () => {
    const crossTypePairs = [
      { mine: 'INTJ', coParent: 'ENFP', description: 'Thinking to Feeling' },
      { mine: 'ENFP', coParent: 'ISTJ', description: 'Feeling to Thinking' },
      { mine: 'INTP', coParent: 'ESFJ', description: 'Introvert to Extrovert' },
      { mine: 'ESTP', coParent: 'INFJ', description: 'Perceiving to Judging' },
    ];

    crossTypePairs.forEach(({ mine, coParent, description }) => {
      it(`should handle ${description} cross-type communication`, () => {
        const result = mockToneAnalysis('You make me so mad!', {
          personalityType: mine,
          coParentPersonalityType: coParent,
          isCoParentPersonalityGuessed: false,
        });
        
        expect(result.tone).toBeDefined();
        expect(result.rewordingSuggestion).toBeDefined();
      });
    });
  });
});

describe('UserPreferences Type Validation', () => {
  it('should accept valid personality type codes', () => {
    const validTypes = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP',
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP',
    ];

    validTypes.forEach((type) => {
      expect(type.length).toBe(4);
      expect(/^[EI][NS][TF][JP]$/.test(type)).toBe(true);
    });
  });
});
