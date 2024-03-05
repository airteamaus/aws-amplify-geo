import camelcaseKeys from 'camelcase-keys';
import { ConsoleLogger, fetchAuthSession, Amplify } from '@aws-amplify/core';
import { GeoAction } from '@aws-amplify/core/internals/utils';
import { LocationClient, SearchPlaceIndexForTextCommand, SearchPlaceIndexForSuggestionsCommand, GetPlaceCommand, SearchPlaceIndexForPositionCommand, GetGeofenceCommand, ListGeofencesCommand, BatchPutGeofenceCommand, BatchDeleteGeofenceCommand } from '@aws-sdk/client-location';
import { mapSearchOptions, getGeoUserAgent, validateGeofencesInput, validateGeofenceId } from '../../util.mjs';

// @ts-nocheck
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const logger = new ConsoleLogger('AmazonLocationServiceProvider');
class AmazonLocationServiceProvider {
    /**
     * Initialize Geo with AWS configurations
     * @param {Object} config - Configuration object for Geo
     */
    constructor(config) {
        this._config = config ? config : {};
        logger.debug('Geo Options', this._config);
    }
    /**
     * get the category of the plugin
     * @returns {string} name of the category
     */
    getCategory() {
        return AmazonLocationServiceProvider.CATEGORY;
    }
    /**
     * get provider name of the plugin
     * @returns {string} name of the provider
     */
    getProviderName() {
        return AmazonLocationServiceProvider.PROVIDER_NAME;
    }
    /**
     * Get the map resources that are currently available through the provider
     * @returns {AmazonLocationServiceMapStyle[]}- Array of available map resources
     */
    getAvailableMaps() {
        this._verifyMapResources();
        const mapStyles = [];
        const availableMaps = this._config.maps.items;
        const region = this._config.region;
        for (const mapName in availableMaps) {
            const style = availableMaps[mapName].style;
            mapStyles.push({ mapName, style, region });
        }
        return mapStyles;
    }
    /**
     * Get the map resource set as default in amplify config
     * @returns {AmazonLocationServiceMapStyle} - Map resource set as the default in amplify config
     */
    getDefaultMap() {
        this._verifyMapResources();
        const mapName = this._config.maps.default;
        const style = this._config.maps.items[mapName].style;
        const region = this._config.region;
        return { mapName, style, region };
    }
    /**
     * Search by text input with optional parameters
     * @param  {string} text The text string that is to be searched for
     * @param  {SearchByTextOptions} options Optional parameters to the search
     * @returns {Promise<Place[]>} - Promise reso
     * lves to a list of Places that match search parameters
     */
    async searchByText(text, options) {
        const credentialsOK = await this._ensureCredentials();
        if (!credentialsOK) {
            throw new Error('No credentials');
        }
        this._verifySearchIndex(options?.searchIndexName);
        /**
         * Setup the searchInput
         */
        let locationServiceInput = {
            Text: text,
            IndexName: this._config?.search_indices?.default || this?._config?.Geo?.LocationService?.search_indices?.default,
        };
        /**
         * Map search options to Amazon Location Service input object
         */
        if (options) {
            locationServiceInput = {
                ...locationServiceInput,
                ...mapSearchOptions(options, locationServiceInput),
            };
        }
        console.log(locationServiceInput, 'locationServiceInput');
        const client = new LocationClient({
            credentials: this._credentials,
            region: this._config.region,
            customUserAgent: getGeoUserAgent(GeoAction.SearchByText),
        });
        const command = new SearchPlaceIndexForTextCommand(locationServiceInput);
        let response;
        try {
            response = await client.send(command);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
        /**
         * The response from Amazon Location Service is a "Results" array of objects with a single `Place` item,
         * which are Place objects in PascalCase.
         * Here we want to flatten that to an array of results and change them to camelCase
         */
        const PascalResults = response.Results.map(result => result.Place);
        const results = camelcaseKeys(PascalResults, {
            deep: true,
        });
        return results;
    }
    /**
     * Search for suggestions based on the input text
     * @param  {string} text The text string that is to be searched for
     * @param  {SearchByTextOptions} options Optional parameters to the search
     * @returns {Promise<SearchForSuggestionsResults>} - Resolves to an array of search suggestion strings
     */
    async searchForSuggestions(text, options) {
        const credentialsOK = await this._ensureCredentials();
        if (!credentialsOK) {
            throw new Error('No credentials');
        }
        this._verifySearchIndex(options?.searchIndexName);
        /**
         * Setup the searchInput
         */
        let locationServiceInput = {
            Text: text,
            IndexName: this._config?.search_indices?.default || this?._config?.Geo?.LocationService?.search_indices?.default,
        };
        /**
         * Map search options to Amazon Location Service input object
         */
        if (options) {
            locationServiceInput = {
                ...locationServiceInput,
                ...mapSearchOptions(options, locationServiceInput),
            };
        }
        const client = new LocationClient({
            credentials: this._credentials,
            region: this._config.region,
            customUserAgent: getGeoUserAgent(GeoAction.SearchForSuggestions),
        });
        const command = new SearchPlaceIndexForSuggestionsCommand(locationServiceInput);
        let response;
        try {
            response = await client.send(command);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
        /**
         * The response from Amazon Location Service is a "Results" array of objects with `Text` and `PlaceId`.
         */
        const results = response.Results.map(result => ({
            text: result.Text,
            placeId: result.PlaceId,
        }));
        return results;
    }
    _verifyPlaceId(placeId) {
        if (placeId.length === 0) {
            const errorString = 'PlaceId cannot be an empty string.';
            logger.debug(errorString);
            throw new Error(errorString);
        }
    }
    async searchByPlaceId(placeId, options) {
        const credentialsOK = await this._ensureCredentials();
        if (!credentialsOK) {
            throw new Error('No credentials');
        }
        this._verifySearchIndex(options?.searchIndexName);
        this._verifyPlaceId(placeId);
        const client = new LocationClient({
            credentials: this._credentials,
            region: this._config.region,
            customUserAgent: getGeoUserAgent(GeoAction.SearchByPlaceId),
        });
        const searchByPlaceIdInput = {
            PlaceId: placeId,
            IndexName: options?.searchIndexName || this._config.search_indices.default,
        };
        const command = new GetPlaceCommand(searchByPlaceIdInput);
        let response;
        try {
            response = await client.send(command);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
        const place = response.Place;
        if (place) {
            return camelcaseKeys(place, { deep: true });
        }
        return;
    }
    /**
     * Reverse geocoding search via a coordinate point on the map
     * @param coordinates Coordinates array for the search input
     * @param options Options parameters for the search
     * @returns {Promise<Place>} - Promise that resolves to a place matching search coordinates
     */
    async searchByCoordinates(coordinates, options) {
        const credentialsOK = await this._ensureCredentials();
        if (!credentialsOK) {
            throw new Error('No credentials');
        }
        this._verifySearchIndex(options?.searchIndexName);
        const locationServiceInput = {
            Position: coordinates,
            IndexName: this._config.search_indices.default,
        };
        if (options) {
            if (options.searchIndexName) {
                locationServiceInput.IndexName = options.searchIndexName;
            }
            locationServiceInput.MaxResults = options.maxResults;
        }
        const client = new LocationClient({
            credentials: this._credentials,
            region: this._config.region,
            customUserAgent: getGeoUserAgent(GeoAction.SearchByCoordinates),
        });
        const command = new SearchPlaceIndexForPositionCommand(locationServiceInput);
        let response;
        try {
            response = await client.send(command);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
        /**
         * The response from Amazon Location Service is a "Results" array with a single `Place` object
         * which are Place objects in PascalCase.
         * Here we want to flatten that to an array of results and change them to camelCase
         */
        const PascalResults = response.Results.map(result => result.Place);
        const results = camelcaseKeys(PascalResults[0], {
            deep: true,
        });
        return results;
    }
    /**
     * Create geofences inside of a geofence collection
     * @param geofences Array of geofence objects to create
     * @param options Optional parameters for creating geofences
     * @returns {Promise<AmazonLocationServiceSaveGeofencesResults>} - Promise that resolves to an object with:
     *   successes: list of geofences successfully created
     *   errors: list of geofences that failed to create
     */
    async saveGeofences(geofences, options) {
        if (geofences.length < 1) {
            throw new Error('Geofence input array is empty');
        }
        const credentialsOK = await this._ensureCredentials();
        if (!credentialsOK) {
            throw new Error('No credentials');
        }
        // Verify geofence collection exists in aws-config.js
        try {
            this._verifyGeofenceCollections(options?.collectionName);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
        validateGeofencesInput(geofences);
        // Convert geofences to PascalCase for Amazon Location Service format
        const PascalGeofences = geofences.map(({ geofenceId, geometry: { polygon } }) => {
            return {
                GeofenceId: geofenceId,
                Geometry: {
                    Polygon: polygon,
                },
            };
        });
        const results = {
            successes: [],
            errors: [],
        };
        const geofenceBatches = [];
        while (PascalGeofences.length > 0) {
            // Splice off 10 geofences from input clone due to Amazon Location Service API limit
            const apiLimit = 10;
            geofenceBatches.push(PascalGeofences.splice(0, apiLimit));
        }
        await Promise.all(geofenceBatches.map(async (batch) => {
            // Make API call for the 10 geofences
            let response;
            try {
                response = await this._AmazonLocationServiceBatchPutGeofenceCall(batch, options?.collectionName || this._config.geofenceCollections.default);
            }
            catch (error) {
                // If the API call fails, add the geofences to the errors array and move to next batch
                batch.forEach(geofence => {
                    results.errors.push({
                        geofenceId: geofence.GeofenceId,
                        error: {
                            code: 'APIConnectionError',
                            message: error.message,
                        },
                    });
                });
                return;
            }
            // Push all successes to results
            response.Successes?.forEach(success => {
                const { GeofenceId, CreateTime, UpdateTime } = success;
                results.successes.push({
                    geofenceId: GeofenceId,
                    createTime: CreateTime,
                    updateTime: UpdateTime,
                });
            });
            // Push all errors to results
            response.Errors?.forEach(error => {
                const { Error, GeofenceId } = error;
                const { Code, Message } = Error;
                results.errors.push({
                    error: {
                        code: Code,
                        message: Message,
                    },
                    geofenceId: GeofenceId,
                });
            });
        }));
        return results;
    }
    /**
     * Get geofence from a geofence collection
     * @param geofenceId string
     * @param options Optional parameters for getGeofence
     * @returns {Promise<AmazonLocationServiceGeofence>} - Promise that resolves to a geofence object
     */
    async getGeofence(geofenceId, options) {
        const credentialsOK = await this._ensureCredentials();
        if (!credentialsOK) {
            throw new Error('No credentials');
        }
        // Verify geofence collection exists in aws-config.js
        try {
            this._verifyGeofenceCollections(options?.collectionName);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
        validateGeofenceId(geofenceId);
        // Create Amazon Location Service Client
        const client = new LocationClient({
            credentials: this._credentials,
            region: this._config.region,
            customUserAgent: getGeoUserAgent(GeoAction.GetGeofence),
        });
        // Create Amazon Location Service command
        const commandInput = {
            GeofenceId: geofenceId,
            CollectionName: options?.collectionName || this._config.geofenceCollections.default,
        };
        const command = new GetGeofenceCommand(commandInput);
        // Make API call
        let response;
        try {
            response = await client.send(command);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
        // Convert response to camelCase for return
        const { GeofenceId, CreateTime, UpdateTime, Status, Geometry } = response;
        const geofence = {
            createTime: CreateTime,
            geofenceId: GeofenceId,
            geometry: {
                polygon: Geometry.Polygon,
            },
            status: Status,
            updateTime: UpdateTime,
        };
        return geofence;
    }
    /**
     * List geofences from a geofence collection
     * @param  options ListGeofenceOptions
     * @returns {Promise<ListGeofencesResults>} - Promise that resolves to an object with:
     *   entries: list of geofences - 100 geofences are listed per page
     *   nextToken: token for next page of geofences
     */
    async listGeofences(options) {
        const credentialsOK = await this._ensureCredentials();
        if (!credentialsOK) {
            throw new Error('No credentials');
        }
        // Verify geofence collection exists in aws-config.js
        try {
            this._verifyGeofenceCollections(options?.collectionName);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
        // Create Amazon Location Service Client
        const client = new LocationClient({
            credentials: this._credentials,
            region: this._config.region,
            customUserAgent: getGeoUserAgent(GeoAction.ListGeofences),
        });
        // Create Amazon Location Service input
        const listGeofencesInput = {
            NextToken: options?.nextToken,
            CollectionName: options?.collectionName || this._config.geofenceCollections.default,
        };
        // Create Amazon Location Service command
        const command = new ListGeofencesCommand(listGeofencesInput);
        // Make API call
        let response;
        try {
            response = await client.send(command);
        }
        catch (error) {
            logger.debug(error);
            throw error;
        }
        // Convert response to camelCase for return
        const { NextToken, Entries } = response;
        const results = {
            entries: Entries.map(({ GeofenceId, CreateTime, UpdateTime, Status, Geometry }) => {
                return {
                    geofenceId: GeofenceId,
                    createTime: CreateTime,
                    updateTime: UpdateTime,
                    status: Status,
                    geometry: {
                        polygon: Geometry.Polygon,
                    },
                };
            }),
            nextToken: NextToken,
        };
        return results;
    }
    /**
     * Delete geofences from a geofence collection
     * @param geofenceIds string|string[]
     * @param options GeofenceOptions
     * @returns {Promise<DeleteGeofencesResults>} - Promise that resolves to an object with:
     *  successes: list of geofences successfully deleted
     *  errors: list of geofences that failed to delete
     */
    async deleteGeofences(geofenceIds, options) {
        if (geofenceIds.length < 1) {
            throw new Error('GeofenceId input array is empty');
        }
        const credentialsOK = await this._ensureCredentials();
        if (!credentialsOK) {
            throw new Error('No credentials');
        }
        this._verifyGeofenceCollections(options?.collectionName);
        // Validate all geofenceIds are valid
        const badGeofenceIds = geofenceIds.filter(geofenceId => {
            try {
                validateGeofenceId(geofenceId);
            }
            catch (error) {
                return true;
            }
        });
        if (badGeofenceIds.length > 0) {
            throw new Error(`Invalid geofence ids: ${badGeofenceIds.join(', ')}`);
        }
        const results = {
            successes: [],
            errors: [],
        };
        const geofenceIdBatches = [];
        let count = 0;
        while (count < geofenceIds.length) {
            geofenceIdBatches.push(geofenceIds.slice(count, (count += 10)));
        }
        await Promise.all(geofenceIdBatches.map(async (batch) => {
            let response;
            try {
                response = await this._AmazonLocationServiceBatchDeleteGeofenceCall(batch, options?.collectionName || this._config.geofenceCollections.default);
            }
            catch (error) {
                // If the API call fails, add the geofences to the errors array and move to next batch
                batch.forEach(geofenceId => {
                    const errorObject = {
                        geofenceId,
                        error: {
                            code: error
                                .message,
                            message: error
                                .message,
                        },
                    };
                    results.errors.push(errorObject);
                });
                return;
            }
            const badGeofenceIds = response.Errors.map(({ geofenceId }) => geofenceId);
            results.successes.push(...batch.filter(Id => !badGeofenceIds.includes(Id)));
        }));
        return results;
    }
    /**
     * @private
     */
    async _ensureCredentials() {
        try {
            const credentials = (await fetchAuthSession()).credentials;
            if (!credentials)
                return false;
            logger.debug('Set credentials for storage. Credentials are:', credentials);
            this._credentials = credentials;
            return true;
        }
        catch (error) {
            logger.debug('Ensure credentials error. Credentials are:', error);
            return false;
        }
    }
    _refreshConfig() {
        this._config = Amplify.getConfig().Geo?.LocationService;
        if (!this._config) {
            const errorString = "No Geo configuration found in amplify config, run 'amplify add geo' to create one and run `amplify push` after";
            logger.debug(errorString);
            throw new Error(errorString);
        }
    }
    _verifyMapResources() {
        this._refreshConfig();
        if (!this._config.maps) {
            const errorString = "No map resources found in amplify config, run 'amplify add geo' to create one and run `amplify push` after";
            logger.debug(errorString);
            throw new Error(errorString);
        }
        if (!this._config.maps.default) {
            const errorString = "No default map resource found in amplify config, run 'amplify add geo' to create one and run `amplify push` after";
            logger.debug(errorString);
            throw new Error(errorString);
        }
    }
    _verifySearchIndex(optionalSearchIndex) {
        this._refreshConfig();
        if ((!this._config.searchIndices || !this._config.searchIndices.default) &&
            !optionalSearchIndex) {
            const errorString = 'No Search Index found in amplify config, please run `amplify add geo` to create one and run `amplify push` after.';
            logger.debug(errorString);
            throw new Error(errorString);
        }
    }
    _verifyGeofenceCollections(optionalGeofenceCollectionName) {
        this._refreshConfig();
        if ((!this._config.geofenceCollections ||
            !this._config.geofenceCollections.default) &&
            !optionalGeofenceCollectionName) {
            const errorString = 'No Geofence Collections found, please run `amplify add geo` to create one and run `amplify push` after.';
            logger.debug(errorString);
            throw new Error(errorString);
        }
    }
    async _AmazonLocationServiceBatchPutGeofenceCall(PascalGeofences, collectionName) {
        // Create the BatchPutGeofence input
        const geofenceInput = {
            Entries: PascalGeofences,
            CollectionName: collectionName || this._config.geofenceCollections.default,
        };
        const client = new LocationClient({
            credentials: this._credentials,
            region: this._config.region,
            customUserAgent: getGeoUserAgent(GeoAction.SaveGeofences),
        });
        const command = new BatchPutGeofenceCommand(geofenceInput);
        let response;
        try {
            response = await client.send(command);
        }
        catch (error) {
            throw error;
        }
        return response;
    }
    async _AmazonLocationServiceBatchDeleteGeofenceCall(geofenceIds, collectionName) {
        // Create the BatchDeleteGeofence input
        const deleteGeofencesInput = {
            GeofenceIds: geofenceIds,
            CollectionName: collectionName || this._config.geofenceCollections.default,
        };
        const client = new LocationClient({
            credentials: this._credentials,
            region: this._config.region,
            customUserAgent: getGeoUserAgent(GeoAction.DeleteGeofences),
        });
        const command = new BatchDeleteGeofenceCommand(deleteGeofencesInput);
        let response;
        try {
            response = await client.send(command);
        }
        catch (error) {
            throw error;
        }
        return response;
    }
}
AmazonLocationServiceProvider.CATEGORY = 'Geo';
AmazonLocationServiceProvider.PROVIDER_NAME = 'AmazonLocationService';

export { AmazonLocationServiceProvider };
//# sourceMappingURL=AmazonLocationServiceProvider.mjs.map
