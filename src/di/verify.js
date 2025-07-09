/**
 * Simple verification script for DI container
 * This runs basic tests without TypeScript decorators
 */

console.log('🏗️ VSR Landing DI Container Verification');
console.log('=======================================\n');

try {
  // Test basic require
  console.log('✅ Testing module imports...');
  const { DIContainer, ServiceLifetime } = require('./Container');
  console.log('✅ Core modules imported successfully');

  // Test container creation
  console.log('✅ Testing container creation...');
  const container = new DIContainer();
  console.log('✅ Container created successfully');

  // Test service registration
  console.log('✅ Testing service registration...');
  container.registerSingleton('Logger', () => ({
    log: (msg) => console.log(`[LOG] ${msg}`)
  }));
  
  container.registerTransient('Calculator', () => ({
    add: (a, b) => a + b,
    multiply: (a, b) => a * b
  }));
  
  console.log('✅ Services registered successfully');

  // Test service resolution
  console.log('✅ Testing service resolution...');
  const logger = container.resolve('Logger');
  const calc1 = container.resolve('Calculator');
  const calc2 = container.resolve('Calculator');
  
  logger.log('Logger resolved successfully');
  console.log('✅ Service resolution working');

  // Test singleton behavior
  console.log('✅ Testing singleton behavior...');
  const logger2 = container.resolve('Logger');
  if (logger === logger2) {
    console.log('✅ Singleton lifetime working correctly');
  } else {
    throw new Error('Singleton lifetime failed');
  }

  // Test transient behavior
  console.log('✅ Testing transient behavior...');
  if (calc1 !== calc2) {
    console.log('✅ Transient lifetime working correctly');
  } else {
    throw new Error('Transient lifetime failed');
  }

  // Test dependency injection
  console.log('✅ Testing dependency injection...');
  container.registerTransient('MathService', (c) => {
    const calculator = c.resolve('Calculator');
    const logger = c.resolve('Logger');
    
    return {
      calculate: (operation, a, b) => {
        logger.log(`Performing ${operation}: ${a}, ${b}`);
        switch (operation) {
          case 'add': return calculator.add(a, b);
          case 'multiply': return calculator.multiply(a, b);
          default: throw new Error('Unknown operation');
        }
      }
    };
  });

  const mathService = container.resolve('MathService');
  const result = mathService.calculate('add', 5, 3);
  
  if (result === 8) {
    console.log('✅ Dependency injection working correctly');
  } else {
    throw new Error('Dependency injection failed');
  }

  // Test registration introspection
  console.log('✅ Testing introspection...');
  const registrations = container.getRegistrations();
  
  if (registrations.length >= 3) {
    console.log('✅ Registration introspection working');
    console.log(`   Found ${registrations.length} registered services`);
  } else {
    throw new Error('Registration introspection failed');
  }

  // Test service existence checks
  console.log('✅ Testing service existence checks...');
  if (container.isRegistered('Logger') && !container.isRegistered('NonExistentService')) {
    console.log('✅ Service existence checks working');
  } else {
    throw new Error('Service existence checks failed');
  }

  // Test scoped services
  console.log('✅ Testing scoped services...');
  container.registerScoped('RequestContext', () => ({
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now()
  }));

  container.beginScope();
  const context1 = container.resolve('RequestContext');
  const context2 = container.resolve('RequestContext');
  
  if (context1 === context2) {
    console.log('✅ Scoped services working within scope');
  } else {
    throw new Error('Scoped services failed within scope');
  }
  
  container.endScope();
  
  container.beginScope();
  const context3 = container.resolve('RequestContext');
  
  if (context1 !== context3) {
    console.log('✅ Scoped services working across scopes');
  } else {
    throw new Error('Scoped services failed across scopes');
  }
  
  container.endScope();

  console.log('\n🎉 All verification tests passed!');
  console.log('✅ DI Container is working correctly');
  console.log('✅ Service registration and resolution functional');
  console.log('✅ Lifecycle management working');
  console.log('✅ Dependency injection operational');
  console.log('✅ Scope management functional');
  
  return true;

} catch (error) {
  console.error('\n❌ Verification failed:', error.message);
  console.error('💥 Error details:', error);
  return false;
}