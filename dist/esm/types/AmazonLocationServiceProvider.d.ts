import { MapStyle, GeofenceOptions, ListGeofenceOptions, Geofence, DeleteGeofencesResults, GeofenceError } from './Geo';
export interface AmazonLocationServiceMapStyle extends MapStyle {
    region: string;
}
export type AmazonLocationServiceGeofenceOptions = GeofenceOptions & {
    collectionName?: string;
};
export type AmazonLocationServiceGeofenceStatus = 'ACTIVE' | 'PENDING' | 'FAILED' | 'DELETED' | 'DELETING';
export type AmazonLocationServiceGeofence = Omit<Geofence, 'status'> & {
    status: AmazonLocationServiceGeofenceStatus;
};
export type AmazonLocationServiceListGeofenceOptions = ListGeofenceOptions & {
    collectionName?: string;
};
export type AmazonLocationServiceBatchGeofenceErrorMessages = 'AccessDeniedException' | 'InternalServerException' | 'ResourceNotFoundException' | 'ThrottlingException' | 'ValidationException';
export type AmazonLocationServiceBatchGeofenceError = Omit<GeofenceError, 'error'> & {
    error: {
        code: string;
        message: AmazonLocationServiceBatchGeofenceErrorMessages;
    };
};
export type AmazonLocationServiceDeleteGeofencesResults = Omit<DeleteGeofencesResults, 'errors'> & {
    errors: AmazonLocationServiceBatchGeofenceError[];
};
