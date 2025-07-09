"use strict";
/**
 * Dependency Injection Container
 * Core implementation of the DI container with service registration and resolution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultContainer = exports.DIContainer = void 0;
const types_1 = require("./types");
class DIContainer {
    constructor(config = {}, parent) {
        this.registrations = new Map();
        this.singletons = new Map();
        this.children = new Set();
        this.disposed = false;
        this.config = Object.assign({ enableCircularDependencyDetection: true, enableAutoRegistration: false, enableInterceptors: true, enableObservability: false, defaultLifetime: types_1.ServiceLifetime.TRANSIENT, maxResolutionDepth: 50, scopeFactory: () => new DefaultServiceScope() }, config);
        this.parent = parent;
        if (this.parent) {
            this.parent.children.add(this);
        }
    }
    // Service registration methods
    register(registration) {
        this.validateRegistration(registration);
        this.registrations.set(registration.token, registration);
        return this;
    }
    registerSingleton(token, factoryOrConstructor) {
        return this.registerWithLifetime(token, factoryOrConstructor, types_1.ServiceLifetime.SINGLETON);
    }
    registerTransient(token, factoryOrConstructor) {
        return this.registerWithLifetime(token, factoryOrConstructor, types_1.ServiceLifetime.TRANSIENT);
    }
    registerScoped(token, factoryOrConstructor) {
        return this.registerWithLifetime(token, factoryOrConstructor, types_1.ServiceLifetime.SCOPED);
    }
    registerInstance(token, instance) {
        const registration = {
            token,
            lifetime: types_1.ServiceLifetime.SINGLETON,
            instance,
            dependencies: [],
            metadata: {},
            interceptors: [],
            tags: []
        };
        this.registrations.set(token, registration);
        this.singletons.set(token, instance);
        return this;
    }
    // Service resolution methods
    resolve(token) {
        if (this.disposed) {
            throw new types_1.DIError('Container has been disposed');
        }
        const context = {
            token,
            path: [],
            scope: this.currentScope,
            metadata: {}
        };
        return this.resolveInternal(token, context);
    }
    async resolveAsync(token) {
        if (this.disposed) {
            throw new types_1.DIError('Container has been disposed');
        }
        const context = {
            token,
            path: [],
            scope: this.currentScope,
            metadata: {}
        };
        return this.resolveInternalAsync(token, context);
    }
    resolveAll(token) {
        const instances = [];
        // Collect from current container
        for (const [regToken, registration] of this.registrations) {
            if (this.tokensMatch(regToken, token)) {
                instances.push(this.resolve(regToken));
            }
        }
        // Collect from parent
        if (this.parent) {
            instances.push(...this.parent.resolveAll(token));
        }
        return instances;
    }
    resolveOptional(token) {
        try {
            return this.resolve(token);
        }
        catch (error) {
            if (error instanceof types_1.ServiceNotFoundError) {
                return undefined;
            }
            throw error;
        }
    }
    tryResolve(token) {
        try {
            const instance = this.resolve(token);
            return { success: true, instance };
        }
        catch (error) {
            return { success: false, error: error };
        }
    }
    // Service management
    isRegistered(token) {
        var _a, _b;
        return this.registrations.has(token) || ((_b = (_a = this.parent) === null || _a === void 0 ? void 0 : _a.isRegistered(token)) !== null && _b !== void 0 ? _b : false);
    }
    unregister(token) {
        const registration = this.registrations.get(token);
        if (!registration) {
            return false;
        }
        // Dispose singleton if exists
        if (registration.lifetime === types_1.ServiceLifetime.SINGLETON) {
            const instance = this.singletons.get(token);
            if (instance && registration.dispose) {
                try {
                    registration.dispose(instance);
                }
                catch (error) {
                    console.warn(`Error disposing service ${String(token)}:`, error);
                }
            }
            this.singletons.delete(token);
        }
        this.registrations.delete(token);
        return true;
    }
    clear() {
        // Dispose all singletons
        for (const [token, registration] of this.registrations) {
            if (registration.lifetime === types_1.ServiceLifetime.SINGLETON && registration.dispose) {
                const instance = this.singletons.get(token);
                if (instance) {
                    try {
                        registration.dispose(instance);
                    }
                    catch (error) {
                        console.warn(`Error disposing service ${String(token)}:`, error);
                    }
                }
            }
        }
        this.registrations.clear();
        this.singletons.clear();
    }
    // Scope management
    createScope() {
        return this.config.scopeFactory();
    }
    beginScope() {
        this.currentScope = this.createScope();
        return this;
    }
    async endScope() {
        if (this.currentScope) {
            await this.currentScope.dispose();
            this.currentScope = undefined;
        }
    }
    // Container hierarchy
    createChild() {
        return new DIContainer(this.config, this);
    }
    getParent() {
        return this.parent;
    }
    // Introspection
    getRegistrations() {
        const registrations = Array.from(this.registrations.values());
        if (this.parent) {
            registrations.push(...this.parent.getRegistrations());
        }
        return registrations;
    }
    getRegistration(token) {
        var _a;
        const registration = this.registrations.get(token);
        if (registration) {
            return registration;
        }
        return (_a = this.parent) === null || _a === void 0 ? void 0 : _a.getRegistration(token);
    }
    getDependencyGraph() {
        const nodes = [];
        const visited = new Set();
        for (const registration of this.registrations.values()) {
            this.buildDependencyNode(registration.token, nodes, visited);
        }
        return nodes;
    }
    // Lifecycle
    async dispose() {
        if (this.disposed) {
            return;
        }
        // Dispose children first
        for (const child of this.children) {
            await child.dispose();
        }
        this.children.clear();
        // End current scope
        await this.endScope();
        // Clear all services
        this.clear();
        // Remove from parent
        if (this.parent) {
            this.parent.children.delete(this);
        }
        this.disposed = true;
    }
    // Private methods
    validateRegistration(registration) {
        if (!registration.token) {
            throw new types_1.ServiceRegistrationError('Service token is required');
        }
        if (!registration.lifetime) {
            registration.lifetime = this.config.defaultLifetime;
        }
        if (!registration.factory && !registration.constructor && !registration.instance) {
            throw new types_1.ServiceRegistrationError('Registration must have factory, constructor, or instance', registration.token);
        }
        registration.dependencies = registration.dependencies || [];
        registration.metadata = registration.metadata || {};
        registration.interceptors = registration.interceptors || [];
        registration.tags = registration.tags || [];
    }
    registerWithLifetime(token, factoryOrConstructor, lifetime) {
        const registration = {
            token,
            lifetime,
            dependencies: [],
            metadata: {},
            interceptors: [],
            tags: []
        };
        if (this.isConstructor(factoryOrConstructor)) {
            registration.constructor = factoryOrConstructor;
            registration.dependencies = this.getConstructorDependencies(factoryOrConstructor);
        }
        else {
            registration.factory = factoryOrConstructor;
        }
        return this.register(registration);
    }
    resolveInternal(token, context) {
        if (context.path.length > this.config.maxResolutionDepth) {
            throw new types_1.DIError(`Maximum resolution depth exceeded: ${this.config.maxResolutionDepth}`);
        }
        if (this.config.enableCircularDependencyDetection && context.path.includes(token)) {
            throw new types_1.CircularDependencyError([...context.path, token]);
        }
        const registration = this.getRegistration(token);
        if (!registration) {
            throw new types_1.ServiceNotFoundError(token);
        }
        // Check for existing instance based on lifetime
        const existingInstance = this.getExistingInstance(token, registration, context);
        if (existingInstance !== undefined) {
            return existingInstance;
        }
        // Create new instance
        context.path.push(token);
        try {
            const instance = this.createInstance(registration, context);
            this.storeInstance(token, instance, registration, context);
            return instance;
        }
        finally {
            context.path.pop();
        }
    }
    async resolveInternalAsync(token, context) {
        if (context.path.length > this.config.maxResolutionDepth) {
            throw new types_1.DIError(`Maximum resolution depth exceeded: ${this.config.maxResolutionDepth}`);
        }
        if (this.config.enableCircularDependencyDetection && context.path.includes(token)) {
            throw new types_1.CircularDependencyError([...context.path, token]);
        }
        const registration = this.getRegistration(token);
        if (!registration) {
            throw new types_1.ServiceNotFoundError(token);
        }
        // Check for existing instance based on lifetime
        const existingInstance = this.getExistingInstance(token, registration, context);
        if (existingInstance !== undefined) {
            return existingInstance;
        }
        // Create new instance
        context.path.push(token);
        try {
            const instance = await this.createInstanceAsync(registration, context);
            this.storeInstance(token, instance, registration, context);
            return instance;
        }
        finally {
            context.path.pop();
        }
    }
    getExistingInstance(token, registration, context) {
        var _a;
        switch (registration.lifetime) {
            case types_1.ServiceLifetime.SINGLETON:
                return this.singletons.get(token);
            case types_1.ServiceLifetime.SCOPED:
                return (_a = context.scope) === null || _a === void 0 ? void 0 : _a.instances.get(token);
            case types_1.ServiceLifetime.TRANSIENT:
            default:
                return undefined;
        }
    }
    createInstance(registration, context) {
        if (registration.instance) {
            return registration.instance;
        }
        if (registration.factory) {
            return registration.factory(this);
        }
        if (registration.constructor) {
            const dependencies = this.resolveDependencies(registration.dependencies, context);
            return new registration.constructor(...dependencies);
        }
        throw new types_1.DIError(`Invalid registration for ${String(registration.token)}`);
    }
    async createInstanceAsync(registration, context) {
        if (registration.instance) {
            return registration.instance;
        }
        if (registration.factory) {
            const result = registration.factory(this);
            return result instanceof Promise ? await result : result;
        }
        if (registration.constructor) {
            const dependencies = await this.resolveDependenciesAsync(registration.dependencies, context);
            return new registration.constructor(...dependencies);
        }
        throw new types_1.DIError(`Invalid registration for ${String(registration.token)}`);
    }
    storeInstance(token, instance, registration, context) {
        switch (registration.lifetime) {
            case types_1.ServiceLifetime.SINGLETON:
                this.singletons.set(token, instance);
                break;
            case types_1.ServiceLifetime.SCOPED:
                if (context.scope) {
                    context.scope.instances.set(token, instance);
                }
                break;
            case types_1.ServiceLifetime.TRANSIENT:
            default:
                // No storage needed for transient
                break;
        }
    }
    resolveDependencies(dependencies, context) {
        return dependencies.map(dep => this.resolveInternal(dep, Object.assign({}, context)));
    }
    async resolveDependenciesAsync(dependencies, context) {
        return Promise.all(dependencies.map(dep => this.resolveInternalAsync(dep, Object.assign({}, context))));
    }
    getConstructorDependencies(constructor) {
        var _a, _b;
        // Try to get dependencies from metadata (set by decorators)
        const dependencies = (_a = Reflect.getMetadata) === null || _a === void 0 ? void 0 : _a.call(Reflect, types_1.DI_METADATA_KEYS.DEPENDENCIES, constructor);
        if (dependencies) {
            return dependencies;
        }
        // Try to infer from parameter types
        const paramTypes = (_b = Reflect.getMetadata) === null || _b === void 0 ? void 0 : _b.call(Reflect, 'design:paramtypes', constructor);
        if (paramTypes) {
            return paramTypes;
        }
        return [];
    }
    isConstructor(value) {
        return typeof value === 'function' && value.prototype && value.prototype.constructor === value;
    }
    tokensMatch(token1, token2) {
        return token1 === token2;
    }
    buildDependencyNode(token, nodes, visited) {
        if (visited.has(token)) {
            return;
        }
        visited.add(token);
        const registration = this.getRegistration(token);
        if (!registration) {
            return;
        }
        const dependencies = registration.dependencies || [];
        const node = {
            token,
            dependencies,
            dependents: [],
            lifetime: registration.lifetime
        };
        nodes.push(node);
        // Build dependency nodes recursively
        for (const dep of dependencies) {
            this.buildDependencyNode(dep, nodes, visited);
            // Find dependent node and add this token as dependent
            const depNode = nodes.find(n => n.token === dep);
            if (depNode) {
                depNode.dependents.push(token);
            }
        }
        // Check for circular dependencies
        if (this.config.enableCircularDependencyDetection) {
            node.circular = this.hasCircularDependency(token, dependencies, new Set());
        }
    }
    hasCircularDependency(token, dependencies, visited) {
        if (visited.has(token)) {
            return true;
        }
        visited.add(token);
        for (const dep of dependencies) {
            const depRegistration = this.getRegistration(dep);
            if (depRegistration) {
                if (this.hasCircularDependency(dep, depRegistration.dependencies || [], new Set(visited))) {
                    return true;
                }
            }
        }
        return false;
    }
}
exports.DIContainer = DIContainer;
// Default service scope implementation
class DefaultServiceScope {
    constructor() {
        this.instances = new Map();
        this.id = `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async dispose() {
        // Dispose all scoped instances
        for (const instance of this.instances.values()) {
            if (instance && typeof instance.dispose === 'function') {
                try {
                    await instance.dispose();
                }
                catch (error) {
                    console.warn('Error disposing scoped instance:', error);
                }
            }
        }
        this.instances.clear();
    }
}
// Create default container instance
exports.defaultContainer = new DIContainer();
