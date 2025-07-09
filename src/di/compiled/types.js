"use strict";
/**
 * Dependency Injection Types
 * Core types and interfaces for the DI container system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DI_METADATA_KEYS = exports.ServiceRegistrationError = exports.ServiceNotFoundError = exports.CircularDependencyError = exports.DIError = exports.ServiceLifetime = void 0;
// Service lifetime management
var ServiceLifetime;
(function (ServiceLifetime) {
    ServiceLifetime["SINGLETON"] = "singleton";
    ServiceLifetime["TRANSIENT"] = "transient";
    ServiceLifetime["SCOPED"] = "scoped";
})(ServiceLifetime || (exports.ServiceLifetime = ServiceLifetime = {}));
// Error types
class DIError extends Error {
    constructor(message, token, context) {
        super(message);
        this.token = token;
        this.context = context;
        this.name = 'DIError';
    }
}
exports.DIError = DIError;
class CircularDependencyError extends DIError {
    constructor(path) {
        super(`Circular dependency detected: ${path.map(t => String(t)).join(' -> ')}`);
        this.name = 'CircularDependencyError';
    }
}
exports.CircularDependencyError = CircularDependencyError;
class ServiceNotFoundError extends DIError {
    constructor(token) {
        super(`Service not found: ${String(token)}`);
        this.name = 'ServiceNotFoundError';
    }
}
exports.ServiceNotFoundError = ServiceNotFoundError;
class ServiceRegistrationError extends DIError {
    constructor(message, token) {
        super(message);
        this.name = 'ServiceRegistrationError';
    }
}
exports.ServiceRegistrationError = ServiceRegistrationError;
// Decorator metadata keys
exports.DI_METADATA_KEYS = {
    INJECTABLE: Symbol('injectable'),
    INJECT: Symbol('inject'),
    DEPENDENCIES: Symbol('dependencies'),
    INTERCEPTORS: Symbol('interceptors'),
    METADATA: Symbol('metadata')
};
