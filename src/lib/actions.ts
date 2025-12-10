"use server";
import { neon } from "@neondatabase/serverless";
import { unstable_cache } from 'next/cache';

// Simple in-memory rate limiting (for production, use Redis or a proper service)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export interface Restaurant {
    id: string;
    name: string;
    location: string;
    aliases: string | null;
    booking_url: string;
    booking_portal: string;
    created_at?: string;
    updated_at?: string;
}

export interface SearchResult {
    data: Restaurant[] | null;
    error: Error | null;
}

export async function searchRestaurants(query: string): Promise<SearchResult> {
    // Emergency kill switch
    if (process.env.DISABLE_SEARCH === 'true') {
        return {
            data: null,
            error: new Error("Search is temporarily unavailable"),
        };
    }

    // Rate limiting
    const identifier = 'anonymous'; // No client IP for server-side
    if (!checkRateLimit(identifier)) {
        return {
            data: null,
            error: new Error("Rate limit exceeded. Please try again later."),
        };
    }

    if (!process.env.DATABASE_URL) {
        return {
            data: null,
            error: new Error("DATABASE_URL environment variable is not set"),
        };
    }

    // Stricter validation
    const trimmedQuery = query.trim();
    
    // Reject queries that are too short or too long
    if (trimmedQuery.length < 2 || trimmedQuery.length > 100) {
        return {
            data: [],
            error: null,
        };
    }

    // Reject queries with suspicious patterns (basic protection)
    if (/[<>{}[\]\\]/.test(trimmedQuery)) {
        return {
            data: null,
            error: new Error("Invalid search query"),
        };
    }

    try {
        // Cache results for 5 minutes
        const cachedSearch = unstable_cache(
            async (searchPattern: string) => {
                const sql = neon(process.env.DATABASE_URL!);
                return await sql`
                    SELECT 
                        id, name, location, aliases,
                        booking_url, booking_portal,
                        created_at, updated_at
                    FROM restaurants
                    WHERE 
                        LOWER(name) LIKE LOWER(${searchPattern})
                        OR LOWER(location) LIKE LOWER(${searchPattern})
                        OR (aliases IS NOT NULL AND LOWER(aliases) LIKE LOWER(${searchPattern}))
                    ORDER BY name
                    LIMIT 20
                `;
            },
            [`restaurant-search-${trimmedQuery}`],
            {
                revalidate: 300, // 5 minutes
                tags: ['restaurants']
            }
        );

        const searchPattern = `%${trimmedQuery}%`;
        const results = await cachedSearch(searchPattern);

        return {
            data: results as Restaurant[],
            error: null,
        };
    } catch (error) {
        console.error("Search error:", error);
        return {
            data: null,
            error: error instanceof Error ? error : new Error("Unknown error occurred"),
        };
    }
}