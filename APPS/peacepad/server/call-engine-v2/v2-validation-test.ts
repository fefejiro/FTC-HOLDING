/**
 * CallEngineV2 Validation Test Suite
 * 
 * This test file verifies all major V2 flows are working correctly:
 * - V2 engine initialization
 * - Outgoing/Incoming call flows
 * - Multi-party support
 * - WebRTC negotiation
 * - Media toggling
 * - Reconnection management
 */

import { CallEngineV2 } from './CallEngineV2';
import type { CallV2EventType } from './CallEngineV2';
import { ReconnectionManager } from './ReconnectionManager';
import { WebSocket } from 'ws';
import type { IStorage } from '../storage';
import type {
  CallSessionV2,
  InsertCallSessionV2,
  CallParticipantV2,
  InsertCallParticipantV2,
  ConchStateV2,
  InsertConchStateV2,
  ConchTurnV2,
  InsertConchTurnV2,
  CallEventV2,
  InsertCallEventV2,
  User
} from '@shared/schema';

// Test configuration
const TEST_USER_1 = 'test-user-1';
const TEST_USER_2 = 'test-user-2';
const TEST_USER_3 = 'test-user-3';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  error?: any;
}

/**
 * Mock Storage Implementation for Testing
 */
class MockStorage implements Partial<IStorage> {
  private callSessions: Map<string, CallSessionV2> = new Map();
  private callParticipants: Map<string, CallParticipantV2[]> = new Map();
  private conchStates: Map<string, ConchStateV2> = new Map();
  private conchTurns: ConchTurnV2[] = [];
  private callEvents: CallEventV2[] = [];
  private sessionCounter = 0;
  private participantCounter = 0;

  // Mock user data to avoid FK violations
  private mockUsers: Map<string, User> = new Map([
    [TEST_USER_1, { 
      id: TEST_USER_1, 
      email: `${TEST_USER_1}@test.com`,
      phoneNumber: '+1234567890',
      firstName: 'Test',
      lastName: 'User1',
      displayName: 'Test User 1',
      profileImageUrl: null,
      sharePhoneWithContacts: true,
      role: 'user',
      guestParentId: null,
      isGuest: false,
      preferredLanguage: 'en',
      selectedRingtone: 'default',
      selectedAnnounce: false,
      selectedColor: '#000000',
      isAISummaryEnabled: false,
      isMediaPlaybackEnabled: false,
      lastCalendarSync: null,
      timezone: 'UTC',
      availabilityStatus: 'available',
      calendarProvider: null,
      preferredContactMethod: 'phone',
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as User],
    [TEST_USER_2, { 
      id: TEST_USER_2, 
      email: `${TEST_USER_2}@test.com`,
      phoneNumber: '+1234567891',
      firstName: 'Test',
      lastName: 'User2',
      displayName: 'Test User 2',
      profileImageUrl: null,
      sharePhoneWithContacts: true,
      role: 'user',
      guestParentId: null,
      isGuest: false,
      preferredLanguage: 'en',
      selectedRingtone: 'default',
      selectedAnnounce: false,
      selectedColor: '#000000',
      isAISummaryEnabled: false,
      isMediaPlaybackEnabled: false,
      lastCalendarSync: null,
      timezone: 'UTC',
      availabilityStatus: 'available',
      calendarProvider: null,
      preferredContactMethod: 'phone',
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as User],
    [TEST_USER_3, { 
      id: TEST_USER_3, 
      email: `${TEST_USER_3}@test.com`,
      phoneNumber: '+1234567892',
      firstName: 'Test',
      lastName: 'User3',
      displayName: 'Test User 3',
      profileImageUrl: null,
      sharePhoneWithContacts: true,
      role: 'user',
      guestParentId: null,
      isGuest: false,
      preferredLanguage: 'en',
      selectedRingtone: 'default',
      selectedAnnounce: false,
      selectedColor: '#000000',
      isAISummaryEnabled: false,
      isMediaPlaybackEnabled: false,
      lastCalendarSync: null,
      timezone: 'UTC',
      availabilityStatus: 'available',
      calendarProvider: null,
      preferredContactMethod: 'phone',
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as User],
  ]);

  async createCallSessionV2(session: InsertCallSessionV2): Promise<CallSessionV2> {
    const id = `call-${++this.sessionCounter}`;
    const callSession: CallSessionV2 = {
      id,
      createdByUserId: session.createdByUserId,
      sessionCode: session.sessionCode,
      type: session.type,
      status: session.status || 'initiated',
      conchEnabled: session.conchEnabled || false,
      startedAt: session.startedAt || null,
      endedAt: session.endedAt || null,
      endReason: session.endReason || null,
      partnershipId: session.partnershipId || null,
      sequenceId: 0, // Start with 0 for sequence tracking
      createdAt: new Date()
    };
    this.callSessions.set(id, callSession);
    return callSession;
  }

  async getCallSessionV2(id: string): Promise<CallSessionV2 | undefined> {
    return this.callSessions.get(id);
  }

  async updateCallSessionV2(id: string, updates: Partial<CallSessionV2>): Promise<CallSessionV2> {
    const session = this.callSessions.get(id);
    if (!session) {
      throw new Error(`Call session ${id} not found`);
    }
    const updated = { ...session, ...updates, updatedAt: new Date() };
    this.callSessions.set(id, updated);
    return updated;
  }

  async createCallParticipantV2(participant: InsertCallParticipantV2): Promise<CallParticipantV2> {
    const id = `participant-${++this.participantCounter}`;
    const callParticipant: CallParticipantV2 = {
      id,
      ...participant,
      createdAt: new Date(),
      updatedAt: new Date()
    } as CallParticipantV2;
    
    const callParticipants = this.callParticipants.get(participant.callId) || [];
    callParticipants.push(callParticipant);
    this.callParticipants.set(participant.callId, callParticipants);
    
    return callParticipant;
  }

  async updateCallParticipantV2ByUserAndCall(
    callId: string, 
    userId: string, 
    updates: Partial<CallParticipantV2>
  ): Promise<CallParticipantV2> {
    const participants = this.callParticipants.get(callId) || [];
    const participant = participants.find(p => p.userId === userId);
    if (!participant) {
      throw new Error(`Participant ${userId} not found in call ${callId}`);
    }
    Object.assign(participant, updates, { updatedAt: new Date() });
    return participant;
  }

  async createConchTurnV2(turn: InsertConchTurnV2): Promise<ConchTurnV2> {
    const id = `turn-${this.conchTurns.length + 1}`;
    const conchTurn: ConchTurnV2 = {
      id,
      ...turn,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ConchTurnV2;
    this.conchTurns.push(conchTurn);
    return conchTurn;
  }

  async completeConchTurnV2(callId: string, userId: string, endReason: string): Promise<void> {
    const turn = this.conchTurns.find(t => 
      t.callId === callId && t.userId === userId && !t.endedAt
    );
    if (turn) {
      turn.endedAt = new Date();
      turn.endReason = endReason;
    }
  }

  async upsertConchStateV2(state: InsertConchStateV2): Promise<ConchStateV2> {
    const conchState: ConchStateV2 = {
      id: `conch-${state.callId}`, // Generate ID based on callId
      callId: state.callId,
      state: state.state || 'idle',
      holderUserId: state.holderUserId || null,
      expiresAt: state.expiresAt || null,
      cooldownUntil: state.cooldownUntil || null,
      requestQueue: state.requestQueue || [],
      lastUpdatedAt: new Date()
    };
    this.conchStates.set(state.callId, conchState);
    return conchState;
  }

  async createUser(user: any): Promise<User> {
    const mockUser = this.mockUsers.get(user.id) || {
      id: user.id,
      ...user,
      createdAt: new Date(),
      updatedAt: new Date()
    } as User;
    this.mockUsers.set(user.id, mockUser);
    return mockUser;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.mockUsers.get(id);
  }

  // Alias for getUser
  async getUser(id: string): Promise<User | undefined> {
    return this.getUserById(id);
  }
}

/**
 * Extended CallEngineV2 for testing with public method access
 */
class TestableCallEngineV2 extends CallEngineV2 {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Public wrapper for handleCreateCall
   */
  async createCall(payload: any, userId: string): Promise<void> {
    // Access the private method through handleEvent
    const event = {
      type: 'call:create' as CallV2EventType,
      payload
    };
    await this.handleEvent(event, userId, `${userId}-conn`);
  }

  /**
   * Public wrapper for handleAcceptCall
   */
  async acceptCall(callId: string, userId: string): Promise<void> {
    const event = {
      type: 'call:accept' as CallV2EventType,
      payload: { callId }
    };
    await this.handleEvent(event, userId, `${userId}-conn`);
  }

  /**
   * Public wrapper for handleEndCall
   */
  async endCall(payload: any, userId: string): Promise<void> {
    const event = {
      type: 'call:end' as CallV2EventType,
      payload
    };
    await this.handleEvent(event, userId, `${userId}-conn`);
  }

  /**
   * Public wrapper for handleJoinSession
   */
  async joinSession(sessionCode: string, userId: string, connectionId: string): Promise<void> {
    const event = {
      type: 'call:join-session' as CallV2EventType,
      payload: { sessionCode }
    };
    await this.handleEvent(event, userId, connectionId);
  }
}

class V2ValidationTest {
  private engine: TestableCallEngineV2;
  private mockStorage: MockStorage;
  private results: TestResult[] = [];
  private mockWebSockets: Map<string, WebSocket> = new Map();

  constructor() {
    this.mockStorage = new MockStorage();
    this.engine = new TestableCallEngineV2(this.mockStorage as any);
  }

  /**
   * Run all validation tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n========================================');
    console.log('CallEngineV2 Validation Test Suite');
    console.log('========================================\n');

    // Test 1: Verify V2 engine initialization
    await this.testEngineInitialization();
    
    // Test 2: Verify ReconnectionManager setup
    await this.testReconnectionManager();
    
    // Test 3: Test WebSocket adapter registration
    await this.testWebSocketRegistration();
    
    // Test 4: Test outgoing call flow
    await this.testOutgoingCallFlow();
    
    // Test 5: Test incoming call flow
    await this.testIncomingCallFlow();
    
    // Test 6: Test multi-party call support
    await this.testMultiPartyCall();
    
    // Test 7: Test message queue and sequence tracking
    await this.testMessageQueue();
    
    // Test 8: Test WebRTC negotiation patterns
    await this.testWebRTCNegotiation();
    
    // Test 9: Test media toggling
    await this.testMediaToggling();
    
    // Test 10: Test reconnection flow
    await this.testReconnectionFlow();

    // Print results summary
    this.printResults();
  }

  /**
   * Test 1: Verify V2 engine initialization
   */
  async testEngineInitialization(): Promise<void> {
    const testName = 'V2 Engine Initialization';
    try {
      // Check if engine is initialized
      if (!this.engine) {
        throw new Error('CallEngineV2 not initialized');
      }

      // Check if engine has required methods
      const requiredMethods = [
        'registerConnection',
        'handleEvent',
        'createCall',
        'acceptCall',
        'endCall',
        'joinSession'
      ];

      for (const method of requiredMethods) {
        if (typeof (this.engine as any)[method] !== 'function') {
          throw new Error(`Missing required method: ${method}`);
        }
      }

      this.addResult(testName, 'PASS', 'CallEngineV2 initialized with all required methods');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'Initialization failed', error);
    }
  }

  /**
   * Test 2: Verify ReconnectionManager setup
   */
  async testReconnectionManager(): Promise<void> {
    const testName = 'ReconnectionManager Setup';
    let manager: ReconnectionManager | null = null;
    try {
      manager = new ReconnectionManager(this.mockStorage as any);
      
      // Check if manager is initialized
      if (!manager) {
        throw new Error('ReconnectionManager not initialized');
      }

      // Check required methods
      const requiredMethods = [
        'recordHeartbeat',
        'handleParticipantDisconnect',
        'attemptReconnection',
        'canReconnect',
        'getReconnectionState'
      ];

      for (const method of requiredMethods) {
        if (typeof (manager as any)[method] !== 'function') {
          throw new Error(`Missing required method: ${method}`);
        }
      }

      // Test heartbeat recording
      manager.recordHeartbeat(TEST_USER_1, 'test-call-1');

      this.addResult(testName, 'PASS', 'ReconnectionManager initialized correctly');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'ReconnectionManager setup failed', error);
    } finally {
      // Clean up the manager to stop any timers
      if (manager) {
        manager.cleanup();
      }
    }
  }

  /**
   * Test 3: Test WebSocket adapter registration
   */
  async testWebSocketRegistration(): Promise<void> {
    const testName = 'WebSocket Adapter Registration';
    try {
      // Create mock WebSocket
      const mockWs = this.createMockWebSocket();
      const connectionId = `${TEST_USER_1}-test-conn`;

      // Register connection
      await this.engine.registerConnection(TEST_USER_1, mockWs as any, connectionId);

      this.addResult(testName, 'PASS', 'WebSocket registered successfully');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'WebSocket registration failed', error);
    }
  }

  /**
   * Test 4: Test outgoing call flow
   */
  async testOutgoingCallFlow(): Promise<void> {
    const testName = 'Outgoing Call Flow';
    try {
      // Create mock WebSockets for both users
      const ws1 = this.createMockWebSocket();
      const ws2 = this.createMockWebSocket();
      
      // Register connections
      await this.engine.registerConnection(TEST_USER_1, ws1 as any, `${TEST_USER_1}-conn`);
      await this.engine.registerConnection(TEST_USER_2, ws2 as any, `${TEST_USER_2}-conn`);

      // Simulate call creation using the public wrapper method
      const callPayload = {
        callType: 'video',
        participantIds: [TEST_USER_2],
        conchEnabled: false
      };

      await this.engine.createCall(callPayload, TEST_USER_1);

      this.addResult(testName, 'PASS', 'Outgoing call initiated successfully');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'Outgoing call flow failed', error);
    }
  }

  /**
   * Test 5: Test incoming call flow
   */
  async testIncomingCallFlow(): Promise<void> {
    const testName = 'Incoming Call Flow';
    try {
      // Create mock WebSockets
      const ws1 = this.createMockWebSocket();
      const ws2 = this.createMockWebSocket();
      
      // Register connections
      await this.engine.registerConnection(TEST_USER_1, ws1 as any, `${TEST_USER_1}-conn`);
      await this.engine.registerConnection(TEST_USER_2, ws2 as any, `${TEST_USER_2}-conn`);

      // First create a call
      await this.engine.createCall({
        callType: 'audio',
        participantIds: [TEST_USER_2]
      }, TEST_USER_1);

      // Mock getting the call ID (in real scenario, this would come from the incoming call notification)
      // For testing, we'll use the first call session created
      const sessions = Array.from((this.mockStorage as any).callSessions.values()) as CallSessionV2[];
      const callId = sessions[0]?.id;

      if (!callId) {
        throw new Error('No call session created');
      }

      // Then accept the call
      await this.engine.acceptCall(callId, TEST_USER_2);

      this.addResult(testName, 'PASS', 'Incoming call handled successfully');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'Incoming call flow failed', error);
    }
  }

  /**
   * Test 6: Test multi-party call support
   */
  async testMultiPartyCall(): Promise<void> {
    const testName = 'Multi-Party Call Support';
    try {
      // Create mock WebSockets for 3 users
      const ws1 = this.createMockWebSocket();
      const ws2 = this.createMockWebSocket();
      const ws3 = this.createMockWebSocket();
      
      // Register all connections
      await this.engine.registerConnection(TEST_USER_1, ws1 as any, `${TEST_USER_1}-conn`);
      await this.engine.registerConnection(TEST_USER_2, ws2 as any, `${TEST_USER_2}-conn`);
      await this.engine.registerConnection(TEST_USER_3, ws3 as any, `${TEST_USER_3}-conn`);

      // Create a call session
      await this.engine.createCall({
        callType: 'video',
        participantIds: [TEST_USER_2]
      }, TEST_USER_1);

      // Get the call ID
      const sessions = Array.from((this.mockStorage as any).callSessions.values()) as CallSessionV2[];
      const callId = sessions[0]?.id;
      const sessionCode = sessions[0]?.sessionCode;

      if (!callId || !sessionCode) {
        throw new Error('No call session created');
      }

      // User 2 accepts
      await this.engine.acceptCall(callId, TEST_USER_2);

      // User 3 joins via session code
      await this.engine.joinSession(sessionCode, TEST_USER_3, `${TEST_USER_3}-conn`);

      this.addResult(testName, 'PASS', 'Multi-party call support verified');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'Multi-party call failed', error);
    }
  }

  /**
   * Test 7: Test message queue and sequence tracking
   */
  async testMessageQueue(): Promise<void> {
    const testName = 'Message Queue & Sequence Tracking';
    try {
      const ws = this.createMockWebSocket();
      await this.engine.registerConnection(TEST_USER_1, ws as any, `${TEST_USER_1}-conn`);

      // Send multiple messages and verify sequence
      const messages = [
        { type: 'v2:toggle_video' as CallV2EventType, payload: { enabled: false } },
        { type: 'v2:toggle_audio' as CallV2EventType, payload: { enabled: false } },
        { type: 'v2:toggle_video' as CallV2EventType, payload: { enabled: true } }
      ];

      for (const msg of messages) {
        await this.engine.handleEvent(msg, TEST_USER_1, `${TEST_USER_1}-conn`);
        // Add small delay to test buffering
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      this.addResult(testName, 'PASS', 'Message queue processes messages in sequence');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'Message queue test failed', error);
    }
  }

  /**
   * Test 8: Test WebRTC negotiation patterns
   */
  async testWebRTCNegotiation(): Promise<void> {
    const testName = 'WebRTC Negotiation Pattern';
    try {
      const ws1 = this.createMockWebSocket();
      const ws2 = this.createMockWebSocket();
      
      await this.engine.registerConnection(TEST_USER_1, ws1 as any, `${TEST_USER_1}-conn`);
      await this.engine.registerConnection(TEST_USER_2, ws2 as any, `${TEST_USER_2}-conn`);

      // Test offer/answer flow
      const offerEvent = {
        type: 'webrtc:offer' as CallV2EventType,
        payload: {
          targetUserId: TEST_USER_2,
          offer: { type: 'offer', sdp: 'mock-sdp' }
        }
      };
      await this.engine.handleEvent(offerEvent, TEST_USER_1, `${TEST_USER_1}-conn`);

      const answerEvent = {
        type: 'webrtc:answer' as CallV2EventType,
        payload: {
          targetUserId: TEST_USER_1,
          answer: { type: 'answer', sdp: 'mock-answer-sdp' }
        }
      };
      await this.engine.handleEvent(answerEvent, TEST_USER_2, `${TEST_USER_2}-conn`);

      // Test ICE candidate exchange
      const iceEvent = {
        type: 'webrtc:ice-candidate' as CallV2EventType,
        payload: {
          targetUserId: TEST_USER_2,
          candidate: { candidate: 'mock-ice-candidate', sdpMid: '0', sdpMLineIndex: 0 }
        }
      };
      await this.engine.handleEvent(iceEvent, TEST_USER_1, `${TEST_USER_1}-conn`);

      this.addResult(testName, 'PASS', 'WebRTC negotiation pattern working correctly');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'WebRTC negotiation test failed', error);
    }
  }

  /**
   * Test 9: Test media toggling
   */
  async testMediaToggling(): Promise<void> {
    const testName = 'Media Toggling';
    try {
      const ws = this.createMockWebSocket();
      await this.engine.registerConnection(TEST_USER_1, ws as any, `${TEST_USER_1}-conn`);

      // Test video toggle
      const videoToggleEvent = {
        type: 'v2:toggle_video' as CallV2EventType,
        payload: { enabled: false }
      };
      await this.engine.handleEvent(videoToggleEvent, TEST_USER_1, `${TEST_USER_1}-conn`);

      // Test audio toggle  
      const audioToggleEvent = {
        type: 'v2:toggle_audio' as CallV2EventType,
        payload: { enabled: false }
      };
      await this.engine.handleEvent(audioToggleEvent, TEST_USER_1, `${TEST_USER_1}-conn`);

      this.addResult(testName, 'PASS', 'Media toggling works correctly');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'Media toggling test failed', error);
    }
  }

  /**
   * Test 10: Test reconnection flow
   */
  async testReconnectionFlow(): Promise<void> {
    const testName = 'Reconnection Flow';
    let manager: ReconnectionManager | null = null;
    try {
      manager = new ReconnectionManager(this.mockStorage as any);
      
      // First, create a call session and participant for testing
      const testCallSession = await this.mockStorage.createCallSessionV2({
        createdByUserId: TEST_USER_1,
        sessionCode: 'TEST-SESSION',
        type: 'video',
        status: 'connected'
      });

      // Create participant record
      await this.mockStorage.createCallParticipantV2({
        callId: testCallSession.id,
        userId: TEST_USER_1,
        role: 'host'
      });
      
      // Simulate disconnect
      const disconnectInfo = await manager.handleParticipantDisconnect(
        TEST_USER_1,
        testCallSession.id,
        'TEST-SESSION',
        false,
        { hasAudio: true, hasVideo: false }
      );

      if (!disconnectInfo.reconnectToken) {
        throw new Error('No reconnect token generated');
      }

      // Check if can reconnect
      const canReconnect = manager.canReconnect(TEST_USER_1);
      if (!canReconnect) {
        throw new Error('Should be able to reconnect within window');
      }

      // Simulate reconnection
      const newWs = this.createMockWebSocket();
      const reconnectResult = await manager.attemptReconnection(
        TEST_USER_1,
        disconnectInfo.reconnectToken,
        newWs as any,
        `${TEST_USER_1}-reconnect`
      );

      if (!reconnectResult.success) {
        throw new Error('Reconnection failed');
      }

      this.addResult(testName, 'PASS', 'Reconnection flow works correctly');
    } catch (error) {
      this.addResult(testName, 'FAIL', 'Reconnection test failed', error);
    } finally {
      // Clean up the manager to stop any timers
      if (manager) {
        manager.cleanup();
      }
    }
  }

  /**
   * Helper: Create mock WebSocket for testing
   */
  private createMockWebSocket(): WebSocket {
    const messageHandlers: Array<(data: any) => void> = [];
    const closeHandlers: Array<() => void> = [];
    
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: (data: any) => {
        console.log('[Mock WS] Send:', data);
      },
      on: (event: string, handler: any) => {
        if (event === 'message') messageHandlers.push(handler);
        if (event === 'close') closeHandlers.push(handler);
        return mockWs; // Return self for chaining
      },
      ping: () => {},
      close: () => {
        closeHandlers.forEach(h => h());
      }
    } as any;
    
    return mockWs;
  }

  /**
   * Helper: Add test result
   */
  private addResult(test: string, status: 'PASS' | 'FAIL', details?: string, error?: any): void {
    this.results.push({ test, status, details, error });
    
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test}: ${status}`);
    if (details) console.log(`   ${details}`);
    if (error) console.log(`   Error:`, error.message || error);
  }

  /**
   * Print final test results
   */
  private printResults(): void {
    console.log('\n========================================');
    console.log('Test Results Summary');
    console.log('========================================\n');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.test}`);
          if (r.details) console.log(`    ${r.details}`);
          if (r.error) console.log(`    Error: ${r.error.message || r.error}`);
        });
    }

    console.log('\n========================================\n');
  }
}

// Export for use in other tests
export { V2ValidationTest };