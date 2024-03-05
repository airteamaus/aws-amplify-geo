import { ConsoleLogger, Amplify } from '@aws-amplify/core';
import { AmazonLocationServiceProvider } from './providers/location-service/AmazonLocationServiceProvider.mjs';
import { validateCoordinates } from './util.mjs';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const logger = new ConsoleLogger('Geo');
const DEFAULT_PROVIDER = 'AmazonLocationService';
class GeoClass {
    constructor() {
        this._config = undefined;
        this._pluggables = [];
        const amplifyConfig = Amplify.getConfig() ?? {};
        this._config = Object.assign({}, this._config, amplifyConfig.Geo);
        const locationProvider = new AmazonLocationServiceProvider(amplifyConfig.Geo);
        this._pluggables.push(locationProvider);
        logger.debug('Geo Options', this._config);
    }
    /**
     * get the name of the module category
     * @returns {string} name of the module category
     */
    getModuleName() {
        return GeoClass.MODULE;
    }
    /**
     * add plugin into Geo category
     * @param {Object} pluggable an instance of the plugin
     */
    addPluggable(pluggable) {
        if (pluggable && pluggable.getCategory() === 'Geo') {
            this._pluggables.push(pluggable);
        }
    }
    /**
     * Get the plugin object
     * @param providerName the name of the plugin
     */
    getPluggable(providerName) {
        const pluggable = this._pluggables.find(pluggable => pluggable.getProviderName() === providerName);
        if (pluggable === undefined) {
            logger.debug('No plugin found with providerName', providerName);
            throw new Error('No plugin found in Geo for the provider');
        }
        else
            return pluggable;
    }
    /**
     * Remove the plugin object
     * @param providerName the name of the plugin
     */
    removePluggable(providerName) {
        this._pluggables = this._pluggables.filter(pluggable => pluggable.getProviderName() !== providerName);
        return;
    }
    /**
     * Get the map resources that are currently available through the provider
     * @param {string} provider
     * @returns - Array of available map resources
     */
    getAvailableMaps(provider = DEFAULT_PROVIDER) {
        const prov = this.getPluggable(provider);
        return prov.getAvailableMaps();
    }
    /**
     * Get the map resource set as default in amplify config
     * @param {string} provider
     * @returns - Map resource set as the default in amplify config
     */
    getDefaultMap(provider = DEFAULT_PROVIDER) {
        const prov = this.getPluggable(provider);
        return prov.getDefaultMap();
    }
    /**
     * Search by text input with optional parameters
     * @param  {string} text The text string that is to be searched for
     * @param  {SearchByTextOptions} options Optional parameters to the search
     * @returns {Promise<Place[]>} - Promise resolves to a list of Places that match search parameters
     */
    async searchByText(text, options) {
        const { providerName = DEFAULT_PROVIDER } = options || {};
        const prov = this.getPluggable(providerName);
        try {
            return await prov.searchByText(text, options);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
    }
    /**
     * Search for search term suggestions based on input text
     * @param  {string} text The text string that is to be search for
     * @param  {SearchByTextOptions} options Optional parameters to the search
     * @returns {Promise<SearchForSuggestionsResults>} - Resolves to an array of search suggestion strings
     */
    async searchForSuggestions(text, options) {
        const { providerName = DEFAULT_PROVIDER } = options || {};
        const prov = this.getPluggable(providerName);
        try {
            return await prov.searchForSuggestions(text, options);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
    }
    /**
     * Search for location by unique ID
     * @param  {string} placeId Unique ID of the location that is to be searched for
     * @param  {searchByPlaceIdOptions} options Optional parameters to the search
     * @returns {Promise<Place>} - Resolves to a place with the given placeId
     */
    async searchByPlaceId(placeId, options) {
        const providerName = DEFAULT_PROVIDER;
        const prov = this.getPluggable(providerName);
        try {
            return await prov.searchByPlaceId(placeId, options);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
    }
    /**
     * Reverse geocoding search via a coordinate point on the map
     * @param coordinates Coordinates array for the search input
     * @param options Options parameters for the search
     * @returns {Promise<Place>} - Promise that resolves to a place matching search coordinates
     */
    async searchByCoordinates(coordinates, options) {
        const { providerName = DEFAULT_PROVIDER } = options || {};
        const prov = this.getPluggable(providerName);
        const [lng, lat] = coordinates;
        try {
            validateCoordinates(lng, lat);
            return await prov.searchByCoordinates(coordinates, options);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
    }
    /**
     * Create geofences
     * @param geofences Single or array of geofence objects to create
     * @param options Optional parameters for creating geofences
     * @returns {Promise<SaveGeofencesResults>} - Promise that resolves to an object with:
     *   successes: list of geofences successfully created
     *   errors: list of geofences that failed to create
     */
    async saveGeofences(geofences, options) {
        const { providerName = DEFAULT_PROVIDER } = options || {};
        const prov = this.getPluggable(providerName);
        // If single geofence input, make it an array for batch call
        let geofenceInputArray;
        if (!Array.isArray(geofences)) {
            geofenceInputArray = [geofences];
        }
        else {
            geofenceInputArray = geofences;
        }
        try {
            return await prov.saveGeofences(geofenceInputArray, options);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
    }
    /**
     * Get a single geofence by geofenceId
     * @param geofenceId The string id of the geofence to get
     * @param options Optional parameters for getting a geofence
     * @returns Promise<Geofence> - Promise that resolves to a geofence object
     */
    async getGeofence(geofenceId, options) {
        const { providerName = DEFAULT_PROVIDER } = options || {};
        const prov = this.getPluggable(providerName);
        try {
            return await prov.getGeofence(geofenceId, options);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
    }
    /**
     * List geofences
     * @param  options ListGeofenceOptions
     * @returns {Promise<ListGeofencesResults>} - Promise that resolves to an object with:
     *   entries: list of geofences - 100 geofences are listed per page
     *   nextToken: token for next page of geofences
     */
    async listGeofences(options) {
        const { providerName = DEFAULT_PROVIDER } = options || {};
        const prov = this.getPluggable(providerName);
        try {
            return await prov.listGeofences(options);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
    }
    /**
     * Delete geofences
     * @param geofenceIds string|string[]
     * @param options GeofenceOptions
     * @returns {Promise<DeleteGeofencesResults>} - Promise that resolves to an object with:
     *  successes: list of geofences successfully deleted
     *  errors: list of geofences that failed to delete
     */
    async deleteGeofences(geofenceIds, options) {
        const { providerName = DEFAULT_PROVIDER } = options || {};
        const prov = this.getPluggable(providerName);
        // If single geofence input, make it an array for batch call
        let geofenceIdsInputArray;
        if (!Array.isArray(geofenceIds)) {
            geofenceIdsInputArray = [geofenceIds];
        }
        else {
            geofenceIdsInputArray = geofenceIds;
        }
        //  Delete geofences
        try {
            return await prov.deleteGeofences(geofenceIdsInputArray, options);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
    }
}
GeoClass.MODULE = 'Geo';
const Geo = new GeoClass();

export { Geo, GeoClass };
//# sourceMappingURL=Geo.mjs.map
