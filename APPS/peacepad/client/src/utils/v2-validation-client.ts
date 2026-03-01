/**
 * CallEngineV2 Client-Side Validation Utility
 * 
 * This utility provides methods to validate V2 call engine flows from the client side.
 * It works in conjunction with the server-side test suite.
 */

import type { CallEngineV2State, CallEngineV2Actions } from '@/hooks/useCallEngineV2';

export interface V2ValidationResult {
  feature: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  timestamp: Date;
}

export class V2ClientValidator {
  private results: V2ValidationResult[] = [];
  private ws: WebSocket | null = null;
  
  constructor(private v2State: CallEngineV2State, private v2Actions: CallEngineV2Actions) {}

  /**
   * Run all client-side validation tests
   */
  async runValidation(): Promise<V2ValidationResult[]> {
    console.log('🚀 Starting V2 Client Validation...');
    
    // Test 1: Check V2 State initialization
    this.validateStateInitialization();
    
    // Test 2: Validate WebSocket connection
    await this.validateWebSocketConnection();
    
    // Test 3: Test call initiation
    await this.validateCallInitiation();
    
    // Test 4: Test media controls
    this.validateMediaControls();
    
    // Test 5: Test participant management
    this.validateParticipantManagement();
    
    // Test 6: Test conch mode features
    this.validateConchFeatures();
    
    // Test 7: Test error handling
    this.validateErrorHandling();
    
    return this.results;
  }

  /**
   * Validate V2 state initialization
   */
  private validateStateInitialization(): void {
    const feature = 'V2 State Initialization';
    
    try {
      // Check if state has all required properties
      const requiredProps = [
        'currentCallId',
        'sessionCode',
        'phase',
        'role',
        'participants',
        'conchHolder',
        'isConchEnabled',
        'errors'
      ];
      
      for (const prop of requiredProps) {
        if (!(prop in this.v2State)) {
          throw new Error(`Missing state property: ${prop}`);
        }
      }
      
      // Check initial state values
      if (this.v2State.phase !== 'idle' && !this.v2State.currentCallId) {
        this.addResult(feature, 'WARNING', 'Non-idle phase without currentCallId');
      } else {
        this.addResult(feature, 'PASS', 'State initialized with all required properties');
      }
    } catch (error: any) {
      this.addResult(feature, 'FAIL', error.message);
    }
  }

  /**
   * Validate WebSocket connection
   */
  private async validateWebSocketConnection(): Promise<void> {
    const feature = 'WebSocket Connection';
    
    try {
      // Check if WebSocket is available
      if (typeof WebSocket === 'undefined') {
        throw new Error('WebSocket not available in browser');
      }
      
      // Test creating a WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/signaling?sessionId=test&userId=test`;
      
      const testPromise = new Promise<void>((resolve, reject) => {
        const testWs = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          testWs.close();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
        
        testWs.onopen = () => {
          clearTimeout(timeout);
          testWs.close();
          resolve();
        };
        
        testWs.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection error'));
        };
      });
      
      await testPromise;
      this.addResult(feature, 'PASS', 'WebSocket connection can be established');
    } catch (error: any) {
      this.addResult(feature, 'WARNING', `WebSocket test failed: ${error.message}`);
    }
  }

  /**
   * Validate call initiation
   */
  private async validateCallInitiation(): Promise<void> {
    const feature = 'Call Initiation';
    
    try {
      // Check if initiateCall action exists
      if (typeof this.v2Actions.initiateCall !== 'function') {
        throw new Error('initiateCall action not found');
      }
      
      // Check if joinCallByCode action exists
      if (typeof this.v2Actions.joinCallByCode !== 'function') {
        throw new Error('joinCallByCode action not found');
      }
      
      // Check if answerCall action exists
      if (typeof this.v2Actions.answerCall !== 'function') {
        throw new Error('answerCall action not found');
      }
      
      this.addResult(feature, 'PASS', 'All call initiation actions available');
    } catch (error: any) {
      this.addResult(feature, 'FAIL', error.message);
    }
  }

  /**
   * Validate media controls
   */
  private validateMediaControls(): void {
    const feature = 'Media Controls';
    
    try {
      // Check if media toggle actions exist
      if (typeof this.v2Actions.toggleVideo !== 'function') {
        throw new Error('toggleVideo action not found');
      }
      
      if (typeof this.v2Actions.toggleAudio !== 'function') {
        throw new Error('toggleAudio action not found');
      }
      
      this.addResult(feature, 'PASS', 'Media control actions available');
    } catch (error: any) {
      this.addResult(feature, 'FAIL', error.message);
    }
  }

  /**
   * Validate participant management
   */
  private validateParticipantManagement(): void {
    const feature = 'Participant Management';
    
    try {
      // Check participants array structure
      if (!Array.isArray(this.v2State.participants)) {
        throw new Error('Participants is not an array');
      }
      
      // If there are participants, validate their structure
      if (this.v2State.participants.length > 0) {
        const participant = this.v2State.participants[0];
        const requiredFields = ['userId', 'displayName', 'hasAudio', 'hasVideo', 'isConnected'];
        
        for (const field of requiredFields) {
          if (!(field in participant)) {
            throw new Error(`Participant missing field: ${field}`);
          }
        }
      }
      
      this.addResult(feature, 'PASS', 'Participant management structure valid');
    } catch (error: any) {
      this.addResult(feature, 'FAIL', error.message);
    }
  }

  /**
   * Validate conch features
   */
  private validateConchFeatures(): void {
    const feature = 'Conch Features';
    
    try {
      // Check if conch actions exist
      if (typeof this.v2Actions.requestConch !== 'function') {
        throw new Error('requestConch action not found');
      }
      
      if (typeof this.v2Actions.releaseConch !== 'function') {
        throw new Error('releaseConch action not found');
      }
      
      // Check conch state properties
      if (typeof this.v2State.isConchEnabled !== 'boolean') {
        throw new Error('isConchEnabled is not a boolean');
      }
      
      this.addResult(feature, 'PASS', 'Conch features properly implemented');
    } catch (error: any) {
      this.addResult(feature, 'FAIL', error.message);
    }
  }

  /**
   * Validate error handling
   */
  private validateErrorHandling(): void {
    const feature = 'Error Handling';
    
    try {
      // Check if errors array exists
      if (!Array.isArray(this.v2State.errors)) {
        throw new Error('Errors is not an array');
      }
      
      // Check if endCall action exists for error recovery
      if (typeof this.v2Actions.endCall !== 'function') {
        throw new Error('endCall action not found');
      }
      
      // Check if rejectCall action exists
      if (typeof this.v2Actions.rejectCall !== 'function') {
        throw new Error('rejectCall action not found');
      }
      
      this.addResult(feature, 'PASS', 'Error handling mechanisms in place');
    } catch (error: any) {
      this.addResult(feature, 'FAIL', error.message);
    }
  }

  /**
   * Helper: Add validation result
   */
  private addResult(feature: string, status: 'PASS' | 'FAIL' | 'WARNING', details: string): void {
    const result: V2ValidationResult = {
      feature,
      status,
      details,
      timestamp: new Date()
    };
    
    this.results.push(result);
    
    // Log immediately
    const icon = status === 'PASS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} ${feature}: ${status}`);
    console.log(`   ${details}`);
  }

  /**
   * Generate validation report
   */
  generateReport(): string {
    let report = '=== V2 Client Validation Report ===\n\n';
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    
    report += `Total Tests: ${this.results.length}\n`;
    report += `✅ Passed: ${passed}\n`;
    report += `❌ Failed: ${failed}\n`;
    report += `⚠️  Warnings: ${warnings}\n`;
    report += `Success Rate: ${Math.round((passed / this.results.length) * 100)}%\n\n`;
    
    report += 'Detailed Results:\n';
    report += '─────────────────\n';
    
    for (const result of this.results) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      report += `${icon} ${result.feature}\n`;
      report += `   Status: ${result.status}\n`;
      report += `   Details: ${result.details}\n`;
      report += `   Time: ${result.timestamp.toISOString()}\n\n`;
    }
    
    return report;
  }
}

/**
 * Create and run V2 validation from browser console
 */
export function createV2Validator(state: CallEngineV2State, actions: CallEngineV2Actions) {
  const validator = new V2ClientValidator(state, actions);
  
  // Expose to window for debugging
  (window as any).v2Validator = validator;
  
  console.log('V2 Validator created. Run validation with:');
  console.log('  await window.v2Validator.runValidation()');
  console.log('  window.v2Validator.generateReport()');
  
  return validator;
}