#!/usr/bin/env tsx

/**
 * Runtime V2 Validation Test Script
 * Run with: tsx server/call-engine-v2/run-v2-tests.ts
 */

import { V2ValidationTest } from './v2-validation-test';

async function main() {
  console.log('\n🚀 Starting CallEngineV2 Runtime Validation...\n');
  console.log('This will test all major V2 flows:\n');
  console.log('  1. ✓ V2 engine initialization');
  console.log('  2. ✓ ReconnectionManager setup');
  console.log('  3. ✓ WebSocket adapter');
  console.log('  4. ✓ Outgoing/Incoming call flows');
  console.log('  5. ✓ Multi-party call support');
  console.log('  6. ✓ Message queue & sequencing');
  console.log('  7. ✓ WebRTC negotiation patterns');
  console.log('  8. ✓ Media toggling');
  console.log('  9. ✓ Reconnection handling\n');

  const test = new V2ValidationTest();
  
  try {
    await test.runAllTests();
    console.log('\n✅ V2 Validation Complete!\n');
  } catch (error) {
    console.error('\n❌ V2 Validation Failed:', error);
    process.exit(1);
  }
}

main();