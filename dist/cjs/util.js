'use strict';

Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeoUserAgentString = exports.getGeoUserAgent = exports.mapSearchOptions = exports.validateGeofencesInput = exports.validatePolygon = exports.validateLinearRing = exports.validateGeofenceId = exports.validateCoordinates = void 0;
const tslib_1 = require("tslib");
// @ts-nocheck
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const boolean_clockwise_1 = tslib_1.__importDefault(require("@turf/boolean-clockwise"));
const utils_1 = require("@aws-amplify/core/internals/utils");
function validateCoordinates(lng, lat) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        throw new Error(`Invalid coordinates: [${lng},${lat}]`);
    }
    if (lat < -90 || 90 < lat) {
        throw new Error('Latitude must be between -90 and 90 degrees inclusive.');
    }
    else if (lng < -180 || 180 < lng) {
        throw new Error('Longitude must be between -180 and 180 degrees inclusive.');
    }
}
exports.validateCoordinates = validateCoordinates;
function validateGeofenceId(geofenceId) {
    const geofenceIdRegex = /^[-._\p{L}\p{N}]+$/iu;
    // Check if geofenceId is valid
    if (!geofenceIdRegex.test(geofenceId)) {
        throw new Error(`Invalid geofenceId: '${geofenceId}' - IDs can only contain alphanumeric characters, hyphens, underscores and periods.`);
    }
}
exports.validateGeofenceId = validateGeofenceId;
function validateLinearRing(linearRing, geofenceId) {
    const errorPrefix = geofenceId ? `${geofenceId}: ` : '';
    // Validate LinearRing size, must be at least 4 points
    if (linearRing.length < 4) {
        throw new Error(`${errorPrefix}LinearRing must contain 4 or more coordinates.`);
    }
    // Validate all coordinates are valid, error with which ones are bad
    const badCoordinates = [];
    linearRing.forEach(coordinates => {
        try {
            validateCoordinates(coordinates[0], coordinates[1]);
        }
        catch (error) {
            badCoordinates.push({ coordinates, error: error.message });
        }
    });
    if (badCoordinates.length > 0) {
        throw new Error(`${errorPrefix}One or more of the coordinates in the Polygon LinearRing are not valid: ${JSON.stringify(badCoordinates)}`);
    }
    // Validate first and last coordinates are the same
    const [lngA, latA] = linearRing[0];
    const [lngB, latB] = linearRing[linearRing.length - 1];
    if (lngA !== lngB || latA !== latB) {
        throw new Error(`${errorPrefix}LinearRing's first and last coordinates are not the same`);
    }
    if ((0, boolean_clockwise_1.default)(linearRing)) {
        throw new Error(`${errorPrefix}LinearRing coordinates must be wound counterclockwise`);
    }
}
exports.validateLinearRing = validateLinearRing;
function validatePolygon(polygon, geofenceId) {
    const errorPrefix = geofenceId ? `${geofenceId}: ` : '';
    if (!Array.isArray(polygon)) {
        throw new Error(`${errorPrefix}Polygon is of incorrect structure. It should be an array of LinearRings`);
    }
    if (polygon.length < 1) {
        throw new Error(`${errorPrefix}Polygon must have a single LinearRing array.`);
    }
    if (polygon.length > 1) {
        throw new Error(`${errorPrefix}Polygon must have a single LinearRing array. Note: We do not currently support polygons with holes, multipolygons, polygons that are wound clockwise, or that cross the antimeridian.`);
    }
    const verticesCount = polygon.reduce((prev, linearRing) => prev + linearRing.length, 0);
    if (verticesCount > 1000) {
        throw new Error(`${errorPrefix}Polygon has more than the maximum 1000 vertices.`);
    }
    polygon.forEach(linearRing => {
        validateLinearRing(linearRing, geofenceId);
    });
}
exports.validatePolygon = validatePolygon;
function validateGeofencesInput(geofences) {
    const geofenceIds = {};
    geofences.forEach((geofence) => {
        // verify all required properties are present
        // Validate geofenceId exists
        if (!geofence.geofenceId) {
            throw new Error(`Geofence '${geofence}' is missing geofenceId`);
        }
        const { geofenceId } = geofence;
        validateGeofenceId(geofenceId);
        // Validate geofenceId is unique
        if (geofenceIds[geofenceId]) {
            throw new Error(`Duplicate geofenceId: ${geofenceId}`);
        }
        else {
            geofenceIds[geofenceId] = true;
        }
        // Validate geometry exists
        if (!geofence.geometry) {
            throw new Error(`Geofence '${geofenceId}' is missing geometry`);
        }
        const { geometry } = geofence;
        // Validate polygon exists
        if (!geometry.polygon) {
            throw new Error(`Geofence '${geofenceId}' is missing geometry.polygon`);
        }
        const { polygon } = geometry;
        // Validate polygon length and structure
        try {
            validatePolygon(polygon, geofenceId);
        }
        catch (error) {
            if (error.message.includes('Polygon has more than the maximum 1000 vertices.')) {
                throw new Error(`Geofence '${geofenceId}' has more than the maximum of 1000 vertices`);
            }
        }
        // Validate LinearRing length, structure, and coordinates
        const [linearRing] = polygon;
        validateLinearRing(linearRing, geofenceId);
    });
}
exports.validateGeofencesInput = validateGeofencesInput;
function mapSearchOptions(options, locationServiceInput) {
    const locationServiceModifiedInput = { ...locationServiceInput };
    locationServiceModifiedInput.FilterCountries = options.countries;
    locationServiceModifiedInput.MaxResults = options.maxResults;
    locationServiceModifiedInput.Language = options.language;
    locationServiceModifiedInput.FilterCategories = ["AddressType"];
    if (options.searchIndexName) {
        locationServiceModifiedInput.IndexName = options.searchIndexName;
    }
    if (options['biasPosition'] && options['searchAreaConstraints']) {
        throw new Error('BiasPosition and SearchAreaConstraints are mutually exclusive, please remove one or the other from the options object');
    }
    if (options['biasPosition']) {
        locationServiceModifiedInput.BiasPosition = options['biasPosition'];
    }
    if (options['searchAreaConstraints']) {
        locationServiceModifiedInput.FilterBBox = options['searchAreaConstraints'];
    }
    return locationServiceModifiedInput;
}
exports.mapSearchOptions = mapSearchOptions;
function getGeoUserAgent(action) {
    return (0, utils_1.getAmplifyUserAgentObject)({
        category: utils_1.Category.Geo,
        action,
    });
}
exports.getGeoUserAgent = getGeoUserAgent;
function getGeoUserAgentString(action) {
    return (0, utils_1.getAmplifyUserAgent)({
        category: utils_1.Category.Geo,
        action,
    });
}
exports.getGeoUserAgentString = getGeoUserAgentString;
//# sourceMappingURL=util.js.map
