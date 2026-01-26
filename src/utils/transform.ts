/**
 * Utility functions to transform MongoDB documents for API responses
 */

/**
 * Transform MongoDB document: map _id to id and remove _id
 */
export function transformMongoDocument(doc: any): any {
    if (!doc) return doc;
    
    // Handle array of documents
    if (Array.isArray(doc)) {
        return doc.map(transformMongoDocument);
    }
    
    // Handle single document
    if (doc && typeof doc === 'object' && doc._id !== undefined) {
        const { _id, ...rest } = doc;
        const transformed: any = {
            ...rest,
            id: _id?.toString ? _id.toString() : String(_id)
        };
        
        // Also handle nested _id fields if needed (e.g., createdBy, updatedBy)
        // But keep them as they are since they're references, not the main id
        
        return transformed;
    }
    
    return doc;
}

/**
 * Transform nested objects recursively
 */
export function transformMongoDocumentDeep(doc: any): any {
    if (!doc) return doc;
    
    if (Array.isArray(doc)) {
        return doc.map(transformMongoDocumentDeep);
    }
    
    if (doc && typeof doc === 'object') {
        const transformed: any = {};
        
        for (const [key, value] of Object.entries(doc)) {
            if (key === '_id') {
                transformed.id = (value as any)?.toString() || value;
            } else if (value && typeof value === 'object' && !(value instanceof Date)) {
                if (Array.isArray(value)) {
                    transformed[key] = value.map(transformMongoDocumentDeep);
                } else if ((value as any)._id) {
                    // Nested MongoDB document
                    transformed[key] = transformMongoDocumentDeep(value);
                } else {
                    transformed[key] = value;
                }
            } else {
                transformed[key] = value;
            }
        }
        
        return transformed;
    }
    
    return doc;
}
