export { GeoConfig } from '@aws-amplify/core';
export interface MapStyle {
    mapName: string;
    style: string;
}
export type Longitude = number;
export type Latitude = number;
export type Coordinates = [Longitude, Latitude];
export type SWLongitude = Longitude;
export type SWLatitude = Latitude;
export type NELongitude = Longitude;
export type NELatitude = Latitude;
export type BoundingBox = [SWLongitude, SWLatitude, NELongitude, NELatitude];
export interface SearchByTextOptionsBase {
    countries?: string[];
    maxResults?: number;
    searchIndexName?: string;
    providerName?: string;
    language?: string;
    categories?: string[];
}
export interface SearchByTextOptionsWithBiasPosition extends SearchByTextOptionsBase {
    biasPosition?: Coordinates;
}
export interface SearchByTextOptionsWithSearchAreaConstraints extends SearchByTextOptionsBase {
    searchAreaConstraints?: BoundingBox;
}
export type SearchByTextOptions = SearchByTextOptionsWithBiasPosition | SearchByTextOptionsWithSearchAreaConstraints;
export type SearchByCoordinatesOptions = {
    maxResults?: number;
    searchIndexName?: string;
    providerName?: string;
};
export type searchByPlaceIdOptions = {
    searchIndexName?: string;
};
export type PlaceGeometry = {
    point: Coordinates;
};
export interface Place {
    addressNumber?: string;
    country?: string;
    geometry: PlaceGeometry | undefined;
    label?: string;
    municipality?: string;
    neighborhood?: string;
    postalCode?: string;
    region?: string;
    street?: string;
    subRegion?: string;
}
export type LinearRing = Coordinates[];
export type GeofencePolygon = LinearRing[];
export type PolygonGeometry = {
    polygon: GeofencePolygon;
};
export type GeofenceId = string;
export type GeofenceInput = {
    geofenceId: GeofenceId;
    geometry: PolygonGeometry;
};
export type GeofenceOptions = {
    providerName?: string;
};
export type GeofenceError = {
    error: {
        code: string;
        message: string;
    };
    geofenceId: GeofenceId;
};
type GeofenceBase = {
    geofenceId: GeofenceId;
    createTime?: Date;
    updateTime?: Date;
};
export type Geofence = GeofenceBase & {
    geometry: PolygonGeometry;
};
export type SaveGeofencesResults = {
    successes: GeofenceBase[];
    errors: GeofenceError[];
};
export type ListGeofenceOptions = GeofenceOptions & {
    nextToken?: string;
};
export type ListGeofenceResults = {
    entries: Geofence[];
    nextToken: string | undefined;
};
export type DeleteGeofencesResults = {
    successes: GeofenceId[];
    errors: GeofenceError[];
};
export type SearchForSuggestionsResults = SearchForSuggestionsResult[];
export type SearchForSuggestionsResult = {
    text: string;
    placeId?: string;
};
